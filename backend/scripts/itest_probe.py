"""Probe a raw coralflow-base sandbox to locate coral/opencode and inspect PATH."""
import os
import sys
from pathlib import Path

ENV = Path(__file__).resolve().parent.parent / ".env"
for line in ENV.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

from e2b import Sandbox

sbx = Sandbox(template="coralflow-base", timeout=120, api_key=os.environ["E2B_API_KEY"])
try:
    for cmd in [
        "echo PATH=$PATH",
        "which coral || echo 'coral not on PATH'",
        "which opencode || echo 'opencode not on PATH'",
        "ls -la /usr/local/bin | grep -iE 'coral|opencode' || echo 'none in /usr/local/bin'",
        "ls -la /root/.local/bin 2>/dev/null || echo 'no /root/.local/bin'",
        "find / -name coral -type f 2>/dev/null | head -5",
        "find / -name opencode -type f 2>/dev/null | head -5",
        "whoami",
    ]:
        r = sbx.commands.run(cmd, user="root")
        print(f"$ {cmd}\n  {(r.stdout or r.stderr).strip()}\n")
finally:
    sbx.kill()
