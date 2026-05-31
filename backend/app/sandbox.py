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

E2B SDK notes (verified against e2b==1.0.5):
  * Construct with `Sandbox(template=..., timeout=..., envs=..., api_key=...)`
    (there is no `Sandbox.create`).
  * `commands.run` RAISES `CommandExitException` (carries stdout/stderr/exit_code)
    on non-zero exit, and `TimeoutException` on timeout.
  * Everything runs as `user="root"` so HOME=/root matches the proven Docker setup;
    `files.write(..., user="root")` writes the config there.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from e2b import Sandbox
from e2b.exceptions import TimeoutException
from e2b.sandbox.commands.command_handle import CommandExitException

from .config import get_settings
from .connector_map import CONNECTOR_ENV_MAP  # noqa: F401 — imported for callers

_ASSETS = Path(__file__).resolve().parent.parent / "sandbox_assets"

OPENCODE_CONFIG_PATH = "/root/.config/opencode/opencode.json"
SLACK_SCRIPT_PATH = "/workspace/slack-notify.py"

# opencode config injected into every sandbox.
# The `provider` block declares owl-alpha so opencode recognizes it as an OpenRouter
# model (it's not in opencode's built-in catalog). Validated in the full-loop spike.
OPENCODE_CONFIG = {
    "$schema": "https://opencode.ai/config.json",
    "permission": {"bash": "allow", "edit": "allow", "webfetch": "allow"},
    "provider": {"openrouter": {"models": {"owl-alpha": {"name": "Owl Alpha"}}}},
    "mcp": {
        "coral": {"type": "local", "command": ["coral", "mcp-stdio"], "enabled": True}
    },
}


class QuotaError(RuntimeError):
    """The model endpoint returned 429 / provider congestion."""


class AgentTimeout(RuntimeError):
    """A single agent run exceeded the configured cap."""


class ProvisionError(RuntimeError):
    """Sandbox provisioning (e.g. `coral source add`) failed."""


def _sandbox_env(
    tokens: dict[str, str],
    credentials: dict[str, dict[str, str]] | None = None,
) -> dict[str, str]:
    """Build the env dict injected into every sandbox at spawn time.

    Args:
        tokens: Flat single-string credentials — kept for backward compat.
                Recognised keys: ``openrouter``, ``slack``, ``github``,
                ``slack_channel``.
        credentials: Multi-field credentials keyed by source_type, e.g.
                     ``{"jira": {"JIRA_URL": "...", "JIRA_API_TOKEN": "..."}}``.
                     Values come from the decrypted connector map entries
                     (see connector_map.CONNECTOR_ENV_MAP).
    """
    s = get_settings()
    env: dict[str, str] = {
        "OPENROUTER_API_KEY": tokens.get("openrouter") or s.openrouter_api_key,
        "SLACK_CHANNEL": tokens.get("slack_channel", s.default_slack_channel),
    }
    # Legacy single-token sources (backward compat)
    if tokens.get("github"):
        env["GITHUB_TOKEN"] = tokens["github"]
    if tokens.get("slack"):
        env["SLACK_BOT_USER_OAUTH_TOKEN"] = tokens["slack"]

    # Multi-credential sources from the connector map
    if credentials:
        for source_type, cred_dict in credentials.items():
            for env_var, value in cred_dict.items():
                if value:
                    env[env_var] = value

    return env


def spawn(
    tokens: dict[str, str],
    sources: list[str],
    credentials: dict[str, dict[str, str]] | None = None,
) -> Sandbox:
    """Create a fresh sandbox, connect Coral sources, write opencode config."""
    s = get_settings()
    sbx = Sandbox(
        template=s.sandbox_template,
        timeout=s.sandbox_timeout_seconds,
        envs=_sandbox_env(tokens, credentials),
        api_key=s.e2b_api_key or None,
    )
    _provision(sbx, sources)
    return sbx


def resume_or_spawn(
    sandbox_id: str | None,
    tokens: dict[str, str],
    sources: list[str],
    credentials: dict[str, dict[str, str]] | None = None,
) -> Sandbox:
    """Reconnect to a live sandbox, or spawn+reprovision if it was reaped."""
    if sandbox_id:
        try:
            return Sandbox.connect(sandbox_id, api_key=get_settings().e2b_api_key or None)
        except Exception:
            pass  # reaped on idle timeout — fall through to a fresh spawn
    return spawn(tokens, sources, credentials)


def _provision(sbx: Sandbox, sources: list[str]) -> None:
    """Write opencode config + Slack helper, then connect Coral sources (as root)."""
    sbx.files.write(OPENCODE_CONFIG_PATH, json.dumps(OPENCODE_CONFIG, indent=2), user="root")
    sbx.files.write(SLACK_SCRIPT_PATH, (_ASSETS / "slack-notify.py").read_text(), user="root")

    for source in sources:
        try:
            sbx.commands.run(f"coral source add {source}", user="root", timeout=120)
        except CommandExitException as e:
            raise ProvisionError(f"coral source add {source} failed: {e.stderr}") from e

    # Pre-warm opencode's one-time DB migration so it doesn't eat into the first
    # chat's run budget (best-effort — `opencode models` triggers the migration).
    try:
        sbx.commands.run("opencode models > /dev/null 2>&1 || true", user="root", timeout=120)
    except (CommandExitException, TimeoutException):
        pass


# Strip ANSI escape sequences from opencode output before returning to the UI.
_ANSI = re.compile(r"\x1b\[[0-9;]*m")


def _clean(text: str) -> str:
    return _ANSI.sub("", text).strip()


# Substrings meaning "the model endpoint is unavailable / throttled".
_QUOTA_MARKERS = ("resource_exhausted", "429", "provider returned error", "quota")


def _is_quota(text: str) -> bool:
    low = text.lower()
    return any(m in low for m in _QUOTA_MARKERS)


def run_agent(sbx: Sandbox, prompt: str) -> str:
    """Run one opencode investigation, timeout-wrapped, with quota detection."""
    s = get_settings()
    cmd = f"opencode run --model {s.agent_model} {json.dumps(prompt)} 2>&1 | tee -a /workspace/agent.log"
    try:
        res = sbx.commands.run(cmd, user="root", timeout=s.agent_run_timeout_seconds)
        out = (res.stdout or "") + (res.stderr or "")
    except CommandExitException as e:
        out = (e.stdout or "") + (e.stderr or "")
        if _is_quota(out):
            raise QuotaError("Model endpoint is throttled or out of quota. Try again shortly.") from e
        # non-zero exit but produced output — surface it (agent may still have answered)
        if not out.strip():
            raise
    except TimeoutException as e:
        raise AgentTimeout(
            f"Agent run exceeded {s.agent_run_timeout_seconds}s (model may be slow/throttled)."
        ) from e
    except Exception as e:
        # e2b SDK 1.0.5 crashes when parsing streaming errors (e.g. 502 from API).
        # We catch it so we don't 500 the whole SSE connection.
        raise QuotaError(f"Agent run failed (API error or crash): {str(e)}") from e

    if _is_quota(out):
        raise QuotaError("Model endpoint is throttled or out of quota. Try again shortly.")
    return _clean(out)


def teardown(sbx: Sandbox) -> None:
    """Kill the sandbox — wipes env, Coral file secrets, and all state."""
    try:
        sbx.kill()
    except Exception:
        pass
