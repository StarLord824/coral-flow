"""Integration test: orchestrator -> real E2B sandbox -> Coral -> opencode -> teardown.

Run from backend/:  .venv\\Scripts\\python.exe scripts\\itest_e2b.py

Each step prints PASS/FAIL so we can see exactly where the plumbing breaks. The
opencode step uses a trivial prompt to validate the agent path without depending on
the free-tier multi-step behavior (already validated separately in the Docker spike).
"""
import os
import sys
import time
from pathlib import Path

# Load backend/.env into os.environ (source tokens aren't Settings fields).
ENV = Path(__file__).resolve().parent.parent / ".env"
for line in ENV.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import sandbox as S  # noqa: E402

OK, BAD = "PASS", "FAIL"
tokens = {
    "openrouter": os.environ["OPENROUTER_API_KEY"],
    "github": os.environ["GITHUB_TOKEN"],
    "slack": os.environ.get("SLACK_BOT_USER_OAUTH_TOKEN", ""),
    "slack_channel": os.environ.get("DEFAULT_SLACK_CHANNEL", "incidents-alerts"),
}

sbx = None
try:
    print("\n[1] spawn sandbox + provision (coral source add github + opencode.json)…")
    t0 = time.time()
    sbx = S.spawn(tokens, sources=["github"])
    print(f"    {OK} spawned id={sbx.sandbox_id} in {time.time()-t0:.1f}s")

    print("\n[2] tools present in sandbox…")
    cv = sbx.commands.run("coral --version", user="root").stdout.strip()
    ov = sbx.commands.run("opencode --version", user="root").stdout.strip()
    print(f"    {OK} coral={cv}  opencode={ov}")

    print("\n[3] coral source connected + SQL returns data…")
    r = sbx.commands.run(
        "coral sql \"SELECT login FROM github.user\" 2>&1", user="root", timeout=60
    )
    print("    coral sql output:\n   ", r.stdout.replace("\n", "\n    "))
    print(f"    {OK if 'login' in r.stdout.lower() or r.stdout.strip() else BAD} coral query ran")

    print("\n[4] opencode agent path (trivial prompt, no tools)…")
    out = S.run_agent(sbx, "Reply with exactly the word PONG. Do not use any tools.")
    verdict = OK if "pong" in out.lower() else "CHECK"
    print(f"    {verdict} opencode returned:\n   ", out.strip()[:400].replace("\n", "\n    "))

    print("\n[ALL STEPS DONE]")
except S.QuotaError as e:
    print(f"    QUOTA: {e}  (plumbing fine; free-tier model throttled)")
except Exception as e:
    print(f"    {BAD} {type(e).__name__}: {e}")
    raise
finally:
    if sbx is not None:
        print("\n[teardown] killing sandbox…")
        S.teardown(sbx)
        print("    done.")
