"""Live E2B integration check for the backend sandbox layer.

Run from backend/ with a populated .env:
    .venv\\Scripts\\python.exe -m tests.test_e2b_integration

Stages (each prints PASS/FAIL):
  1. spawn coralflow-base + provision (coral source add github)
  2. binaries present (coral, opencode) + coral sql returns data  [no model]
  3. full agent run via opencode + Coral MCP                       [model-dependent]
Always tears the sandbox down at the end.
"""
import os

from dotenv import load_dotenv

load_dotenv()

from app import sandbox as sbx  # noqa: E402  (after load_dotenv)
from app.config import get_settings  # noqa: E402

G = "\033[0;32m"; R = "\033[0;31m"; Y = "\033[1;33m"; N = "\033[0m"


def main() -> None:
    s = get_settings()
    tokens = {
        "github": os.environ["GITHUB_TOKEN"],
        "openrouter": os.environ["OPENROUTER_API_KEY"],
        "slack": os.environ.get("SLACK_BOT_USER_OAUTH_TOKEN", ""),
        "slack_channel": s.default_slack_channel,
    }

    print(f"model = {s.agent_model}")
    print("── Stage 1: spawn + provision ──")
    box = sbx.spawn(tokens, ["github"])
    print(f"{G}✓{N} spawned + provisioned: {box.sandbox_id}")

    try:
        print("── Stage 2: binaries + coral sql (no model) ──")
        for tool in ("coral --version", "which opencode"):
            r = box.commands.run(tool, user="root", timeout=30)
            print(f"   {tool}: {(r.stdout or r.stderr).strip()}")
        r = box.commands.run(
            'coral sql "SELECT login FROM github.user LIMIT 1"', user="root", timeout=60
        )
        ok2 = "login" in (r.stdout or "").lower() or r.exit_code == 0
        print(f"{G if ok2 else R}{'✓' if ok2 else '✗'}{N} coral sql:\n{r.stdout.strip()}")

        print("── Stage 3: full agent run (opencode + Coral MCP) ──")
        try:
            ans = sbx.run_agent(
                box,
                "Use the coral MCP to run: SELECT login, name FROM github.user . "
                "Reply with just my GitHub login. Do not post to Slack.",
            )
            print(f"{G}✓{N} agent answered:\n{ans[:500]}")
        except sbx.QuotaError as e:
            print(f"{Y}⚠ quota/throttle (expected on free tier): {e}{N}")
        except sbx.AgentTimeout as e:
            print(f"{Y}⚠ timeout (free-tier latency): {e}{N}")
    finally:
        print("── teardown ──")
        sbx.teardown(box)
        print(f"{G}✓{N} sandbox killed")


if __name__ == "__main__":
    main()
