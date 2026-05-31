"""Full HTTP end-to-end: signup -> JWT -> /agents/me -> /tokens -> /chat (SSE).

Run with the FastAPI server already running:
    uvicorn app.main:app --reload --port 8000

Then in another terminal:
    .venv\\Scripts\\python.exe scripts\\itest_full.py
"""
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv()

BASE     = os.environ.get("API_BASE", "http://localhost:8000")
SB_URL   = os.environ["SUPABASE_URL"]
ANON     = os.environ["SUPABASE_ANON_KEY"]
EMAIL    = "coralflow.itest+e2e@example.com"
PASSWORD = "Test-Passw0rd!e2e"

OK = "✅"
FAIL = "❌"


def get_jwt() -> str:
    with httpx.Client(timeout=15) as c:
        r = c.post(
            f"{SB_URL}/auth/v1/signup",
            headers={"apikey": ANON, "Content-Type": "application/json"},
            json={"email": EMAIL, "password": PASSWORD},
        )
        d = r.json()
        if r.status_code == 200 and d.get("access_token"):
            return d["access_token"]
        # already registered
        r = c.post(
            f"{SB_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": ANON, "Content-Type": "application/json"},
            json={"email": EMAIL, "password": PASSWORD},
        )
        assert r.status_code == 200, f"signin failed: {r.status_code} {r.text}"
        return r.json()["access_token"]


print("\n[1] authenticate...")
jwt = get_jwt()
headers = {"Authorization": f"Bearer {jwt}"}
print(f"    {OK}  JWT obtained")

with httpx.Client(base_url=BASE, headers=headers, timeout=30) as c:
    print("\n[2] GET /agents/me ...")
    r = c.get("/agents/me")
    assert r.status_code == 200, f"FAIL {r.status_code}: {r.text}"
    agent = r.json()["agent"]
    agent_id = agent["id"]
    print(f"    {OK}  agent_id={agent_id}  state={agent['sandbox_state']}")

    print("\n[3] POST /agents/{id}/tokens  (inject GitHub token)...")
    r = c.post(
        f"/agents/{agent_id}/tokens",
        json={
            "source_type": "github",
            "credentials": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]},
        },
    )
    assert r.status_code == 200, f"FAIL {r.status_code}: {r.text}"
    sources = r.json()["sources"]
    print(f"    {OK}  sources={[s['source_type'] for s in sources]}")

print("\n[4] POST /agents/{id}/chat  (SSE stream, no Slack notify)...")
print("    (spawning E2B sandbox + running agent — expect 30-90s)...")
events = []
with httpx.Client(base_url=BASE, headers=headers, timeout=300) as c:
    with c.stream(
        "POST",
        f"/agents/{agent_id}/chat",
        json={"question": "List my 3 most recently updated GitHub repos.", "notify": False},
    ) as r:
        assert r.status_code == 200, f"FAIL {r.status_code}"
        for raw in r.iter_lines():
            if raw.startswith("data:"):
                payload = raw[5:].strip()
                events.append(payload)
                if payload:
                    print(f"    stream: {payload[:120]}")

done_event = next((e for e in events if "message_id" in e), None)
error_event = next((e for e in events if '"code"' in e), None)

if error_event:
    print(f"    {FAIL}  agent error: {error_event}")
elif done_event:
    d = json.loads(done_event)
    print(f"    {OK}  message_id={d.get('message_id')}  evidence_keys={list((d.get('evidence') or {}).keys())}")
else:
    print(f"    ⚠️  stream ended without done event — check output above")

print("\n[5] GET /agents/{id}/messages ...")
with httpx.Client(base_url=BASE, headers=headers, timeout=15) as c:
    r = c.get(f"/agents/{agent_id}/messages")
    assert r.status_code == 200, f"FAIL {r.status_code}: {r.text}"
    msgs = r.json()["messages"]
    print(f"    {OK}  {len(msgs)} messages stored  roles={[m['role'] for m in msgs]}")

print("\nDONE")
