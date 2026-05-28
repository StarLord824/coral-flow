"""E2B sandbox lifecycle + agent execution.

Encodes the hard-won facts from the validation spike (see docs/spike-docker-log.md):

  * Template must be Ubuntu 24.04+ (Coral needs GLIBC >= 2.39).
  * Coral has no keychain in the sandbox; `coral source add` falls back to
    `file (plaintext)` automatically — no extra setup.
  * opencode authenticates headlessly via an API-key env var (no OAuth). agy was
    dropped because it is OAuth-only.
  * opencode needs `permission.bash = allow` in opencode.json to run shell commands
    headlessly (its equivalent of --dangerously-skip-permissions).
  * Coral is READ-ONLY: it cannot post to Slack. The agent posts by running
    slack-notify.py (chat.postMessage with a bot token).
  * `opencode run` HANGS silently on 429/quota — every run is timeout-wrapped and we
    scan output for quota/provider errors.
"""
from __future__ import annotations

import json
from pathlib import Path

from e2b import Sandbox

from .config import get_settings

_ASSETS = Path(__file__).resolve().parent.parent / "sandbox_assets"

# opencode config injected into every sandbox.
OPENCODE_CONFIG = {
    "$schema": "https://opencode.ai/config.json",
    "permission": {"bash": "allow", "edit": "allow", "webfetch": "allow"},
    "mcp": {
        "coral": {"type": "local", "command": ["coral", "mcp-stdio"], "enabled": True}
    },
}


class QuotaError(RuntimeError):
    """Raised when the model endpoint returns 429 / provider congestion."""


class AgentTimeout(RuntimeError):
    """Raised when a single agent run exceeds the configured cap."""


def _sandbox_env(tokens: dict[str, str]) -> dict[str, str]:
    """Build the env injected into the sandbox. Coral/opencode/Slack read these."""
    s = get_settings()
    env = {
        # opencode model auth — OpenRouter key (configurable provider).
        "OPENROUTER_API_KEY": tokens.get("openrouter", ""),
        "SLACK_CHANNEL": tokens.get("slack_channel", s.default_slack_channel),
    }
    if tokens.get("github"):
        env["GITHUB_TOKEN"] = tokens["github"]
    if tokens.get("slack"):
        env["SLACK_BOT_USER_OAUTH_TOKEN"] = tokens["slack"]
    return env


def spawn(tokens: dict[str, str], sources: list[str]) -> Sandbox:
    """Create a fresh sandbox, connect Coral sources, and write opencode config."""
    s = get_settings()
    sbx = Sandbox.create(
        s.sandbox_template,
        timeout=s.sandbox_timeout_seconds,
        envs=_sandbox_env(tokens),
    )
    _provision(sbx, sources)
    return sbx


def resume_or_spawn(sandbox_id: str | None, tokens: dict[str, str], sources: list[str]) -> Sandbox:
    """Reconnect to a live sandbox, or spawn+reprovision if it has been reaped."""
    if sandbox_id:
        try:
            return Sandbox.connect(sandbox_id)
        except Exception:
            pass  # reaped on idle timeout — fall through to a fresh spawn
    return spawn(tokens, sources)


def _provision(sbx: Sandbox, sources: list[str]) -> None:
    """Connect Coral sources and drop the opencode config + Slack helper in place."""
    # opencode config (Coral MCP + headless bash permission)
    sbx.files.write(
        "/root/.config/opencode/opencode.json", json.dumps(OPENCODE_CONFIG, indent=2)
    )
    # the agent's Slack action (Coral is read-only and cannot post)
    sbx.files.write("/workspace/slack-notify.py", (_ASSETS / "slack-notify.py").read_text())

    # Connect each Coral source. Tokens come from env already injected at spawn.
    for source in sources:
        res = sbx.commands.run(f"coral source add {source}")
        if res.exit_code != 0:
            raise RuntimeError(f"coral source add {source} failed: {res.stderr}")


# Substrings that mean "the model endpoint is unavailable / throttled".
_QUOTA_MARKERS = ("RESOURCE_EXHAUSTED", "429", "Provider returned error", "quota")


def run_agent(sbx: Sandbox, prompt: str) -> str:
    """Run one opencode investigation, timeout-wrapped, with quota detection."""
    s = get_settings()
    cmd = f'opencode run --model {s.agent_model} {json.dumps(prompt)}'
    res = sbx.commands.run(cmd, timeout=s.agent_run_timeout_seconds)

    out = (res.stdout or "") + (res.stderr or "")
    if any(m.lower() in out.lower() for m in _QUOTA_MARKERS):
        raise QuotaError("Model endpoint is throttled or out of quota. Try again shortly.")
    return out


def teardown(sbx: Sandbox) -> None:
    """Kill the sandbox — wipes env, Coral file secrets, and all state."""
    try:
        sbx.kill()
    except Exception:
        pass
