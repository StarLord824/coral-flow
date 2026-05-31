"""Database layer (Supabase Postgres via the direct connection).

The backend connects as the Postgres superuser, which BYPASSES RLS — so every
query here is explicitly scoped by ``user_id`` through the workspace join. RLS
still protects the browser (anon key) path.

Functions are synchronous psycopg; routes call them via ``run_in_threadpool``.
"""
from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row

from .config import get_settings
from .crypto import decrypt, encrypt, last4


@contextmanager
def _conn():
    s = get_settings()
    with psycopg.connect(s.supabase_direct_conn_string, row_factory=dict_row) as c:
        yield c


def ensure_workspace_and_agent(user_id: str, email: str | None) -> dict[str, Any]:
    """Return the user's single agent, creating workspace+agent if missing.

    Normally the on_auth_user_created trigger does this, but we self-heal for
    users created before the trigger existed.
    """
    with _conn() as c, c.cursor() as cur:
        cur.execute("select id from workspaces where owner_user_id = %s", (user_id,))
        ws = cur.fetchone()
        if not ws:
            name = (email.split("@")[0] if email else "My") + "'s workspace"
            cur.execute(
                "insert into workspaces (owner_user_id, name) values (%s, %s) returning id",
                (user_id, name),
            )
            ws = cur.fetchone()
        ws_id = ws["id"]

        cur.execute(
            "select * from agents where workspace_id = %s order by created_at limit 1", (ws_id,)
        )
        agent = cur.fetchone()
        if not agent:
            cur.execute(
                "insert into agents (workspace_id, name) values (%s, 'investigator') returning *",
                (ws_id,),
            )
            agent = cur.fetchone()
        c.commit()
        return agent


def get_agent_owned(user_id: str, agent_id: str) -> dict[str, Any] | None:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """select a.* from agents a
               join workspaces w on w.id = a.workspace_id
               where a.id = %s and w.owner_user_id = %s""",
            (agent_id, user_id),
        )
        return cur.fetchone()


def list_sources(agent_id: str) -> list[dict[str, Any]]:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """select source_type, scope, token_last4, connected
               from agent_sources where agent_id = %s order by created_at""",
            (agent_id,),
        )
        return cur.fetchall()


def upsert_source(
    agent_id: str,
    source_type: str,
    credentials: dict[str, str],  # was: token: str
    scope: str | None = None,
) -> None:
    """Store encrypted credentials for a source. credentials is a dict of env_var->value."""
    cred_json = json.dumps(credentials)
    # last4 shown in UI: use the first value's last 4 chars
    first_val = next(iter(credentials.values()), "")

    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """insert into agent_sources (agent_id, source_type, scope, token_ciphertext, token_last4, connected)
               values (%s, %s, %s, %s, %s, false)
               on conflict (agent_id, source_type) do update
                 set token_ciphertext = excluded.token_ciphertext,
                     token_last4 = excluded.token_last4,
                     scope = excluded.scope,
                     connected = false""",
            (agent_id, source_type, scope, encrypt(cred_json), last4(first_val)),
        )
        c.commit()


def decrypted_tokens(agent_id: str) -> dict[str, dict[str, str]]:
    """All source credentials for an agent, decrypted. Returns {source_type: {env_var: value}}."""
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "select source_type, token_ciphertext from agent_sources "
            "where agent_id = %s and token_ciphertext is not null",
            (agent_id,),
        )
        result = {}
        for r in cur.fetchall():
            raw = decrypt(bytes(r["token_ciphertext"]))
            try:
                creds = json.loads(raw)
                if isinstance(creds, dict):
                    result[r["source_type"]] = creds
                else:
                    # legacy single-string fallback
                    result[r["source_type"]] = {"_token": raw}
            except (json.JSONDecodeError, ValueError):
                # legacy single-string fallback
                result[r["source_type"]] = {"_token": raw}
        return result


def set_sources_connected(agent_id: str, source_types: list[str]) -> None:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "update agent_sources set connected = true where agent_id = %s and source_type = any(%s)",
            (agent_id, source_types),
        )
        c.commit()


def update_sandbox(agent_id: str, sandbox_id: str | None, state: str) -> None:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "update agents set sandbox_id = %s, sandbox_state = %s, last_active_at = now() where id = %s",
            (sandbox_id, state, agent_id),
        )
        c.commit()


def save_message(agent_id: str, role: str, content: str, evidence: Any = None) -> dict[str, Any]:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """insert into chat_messages (agent_id, role, content, evidence_json)
               values (%s, %s, %s, %s) returning *""",
            (agent_id, role, content, psycopg.types.json.Json(evidence) if evidence else None),
        )
        row = cur.fetchone()
        c.commit()
        return row


def list_messages(agent_id: str) -> list[dict[str, Any]]:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "select role, content, evidence_json, created_at from chat_messages where agent_id = %s order by created_at",
            (agent_id,),
        )
        return cur.fetchall()
