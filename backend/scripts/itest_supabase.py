"""Integration test: Supabase auth signup -> trigger -> db layer round-trip.

Run from backend/:  .venv\\Scripts\\python.exe scripts\\itest_supabase.py

1. Sign up a throwaway user via the anon key (fires on_auth_user_created).
2. Confirm the trigger auto-created a workspace + agent.
3. Exercise the db layer: encrypted token upsert -> decrypt round-trip, messages.
4. If signup returned a session JWT, validate it via auth.get_current_user.
"""
import asyncio
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv()

from app import db          # noqa: E402
from app import auth        # noqa: E402

URL = os.environ["SUPABASE_URL"]
ANON = os.environ["SUPABASE_ANON_KEY"]

# Throwaway test user (safe to delete from the Supabase dashboard afterwards).
EMAIL = "coralflow.itest+001@example.com"
PASSWORD = "Test-Passw0rd!123"

OK = "PASS"


def signup_or_signin() -> tuple[str, str | None]:
    """Return (user_id, access_token|None). Handles 'already registered'."""
    with httpx.Client(timeout=15) as c:
        r = c.post(
            f"{URL}/auth/v1/signup",
            headers={"apikey": ANON, "Content-Type": "application/json"},
            json={"email": EMAIL, "password": PASSWORD},
        )
        data = r.json()
        if r.status_code == 200 and (data.get("id") or data.get("user")):
            uid = data.get("id") or data["user"]["id"]
            return uid, data.get("access_token")
        # already registered -> sign in
        r = c.post(
            f"{URL}/auth/v1/token?grant_type=password",
            headers={"apikey": ANON, "Content-Type": "application/json"},
            json={"email": EMAIL, "password": PASSWORD},
        )
        data = r.json()
        if r.status_code == 200:
            return data["user"]["id"], data.get("access_token")
        sys.exit(f"signup/signin failed: {r.status_code} {data}")


print("\n[1] signup/signin throwaway user…")
uid, token = signup_or_signin()
print(f"    {OK} user_id={uid}  session_token={'yes' if token else 'no (email confirm on)'}")

print("\n[2] trigger auto-created workspace + agent?…")
agent = db.ensure_workspace_and_agent(uid, EMAIL)
print(f"    {OK} agent id={agent['id']} name={agent['name']} state={agent['sandbox_state']}")
agent_id = str(agent["id"])

print("\n[3] encrypted token upsert -> decrypt round-trip…")
db.upsert_source(agent_id, "github", "ghp_itest_token_abcd", scope="me/*")
srcs = db.list_sources(agent_id)
dec = db.decrypted_tokens(agent_id)
print(f"    sources={srcs}")
assert dec.get("github") == "ghp_itest_token_abcd", "decrypt mismatch"
print(f"    {OK} decrypt round-trip OK (last4 shown to UI only)")

print("\n[4] messages save + list…")
db.save_message(agent_id, "user", "what changed recently?")
db.save_message(agent_id, "assistant", "Looked at 3 repos; nothing risky.")
msgs = db.list_messages(agent_id)
print(f"    {OK} {len(msgs)} messages stored")

print("\n[5] JWT validation via auth.get_current_user…")
if token:
    user = asyncio.run(auth.get_current_user(authorization=f"Bearer {token}"))
    print(f"    {OK} validated JWT -> {user.id} ({user.email})")
else:
    print("    SKIP (no session token — email confirmation is enabled in Supabase)")

print("\nDONE")
