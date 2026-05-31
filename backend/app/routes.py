"""FastAPI routes — the HTTP boundary of the orchestrator.

Auth: every route requires a valid Supabase JWT (see app/auth.py). State lives in
Supabase (app/db.py). Blocking DB / E2B calls run in a threadpool so the event
loop stays responsive.
"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from starlette.concurrency import run_in_threadpool

from . import auth
from . import db
from . import sandbox as sbxmod
from .auth import CurrentUser, User
from .config import get_settings
from .prompts import build_investigation_prompt, parse_evidence, strip_evidence

router = APIRouter(prefix="/agents", tags=["agents"])

# Coral READ sources that connect via `coral source add`. Slack is the OUT action
# (a bot token used by slack-notify.py), not a Coral source, so it's excluded here.
CORAL_READ_SOURCES = {"github", "sentry", "linear", "datadog", "notion", "jira", "stripe"}


class InjectToken(BaseModel):
    source_type: str                        # github | sentry | datadog | slack | ...
    credentials: dict[str, str]            # {"GITHUB_TOKEN": "ghp_..."} or {"SENTRY_TOKEN": "...", "SENTRY_ORG": "..."}
    scope: str | None = None


class ChatRequest(BaseModel):
    question: str
    notify: bool = True


def _sandbox_tokens(
    agent_id: str,
) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """Return (legacy-tokens, multi-cred-dict) for sandbox injection.

    legacy-tokens  — single-string values for the special keys sandbox.py
                     still reads by name (openrouter, slack, slack_channel).
    multi-cred     — full nested dict {source_type: {ENV_VAR: value}} passed
                     through to _sandbox_env so every stored credential lands
                     in the sandbox environment.
    """
    s = get_settings()
    all_creds: dict[str, dict[str, str]] = db.decrypted_tokens(agent_id)

    legacy: dict[str, str] = {"slack_channel": s.default_slack_channel}

    # Slack bot token used by the agent's action layer (slack-notify.py)
    if "slack" in all_creds:
        legacy["slack"] = all_creds["slack"].get("SLACK_BOT_USER_OAUTH_TOKEN", "")

    # OpenRouter key — prefer per-agent stored key, fall back to platform key
    if "openrouter" in all_creds:
        legacy["openrouter"] = all_creds["openrouter"].get("OPENROUTER_API_KEY", "")
    legacy["openrouter"] = legacy.get("openrouter") or s.openrouter_api_key

    return legacy, all_creds


def _coral_sources(agent_id: str) -> list[str]:
    """Connected Coral READ sources for this agent (drives `coral source add`)."""
    return [
        s["source_type"]
        for s in db.list_sources(agent_id)
        if s["source_type"] in CORAL_READ_SOURCES
    ]


@router.get("/me")
async def my_agent(user: User = CurrentUser) -> dict:
    """Return the caller's single agent + its sources (self-heals if missing)."""
    agent = await run_in_threadpool(db.ensure_workspace_and_agent, user.id, user.email)
    sources = await run_in_threadpool(db.list_sources, agent["id"])
    return {"agent": _public_agent(agent), "sources": sources}


@router.post("/{agent_id}/tokens")
async def inject_token(agent_id: str, body: InjectToken, user: User = CurrentUser) -> dict:
    agent = await run_in_threadpool(db.get_agent_owned, user.id, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    # Encrypt the full credentials dict as a JSON blob so multi-field sources
    # (e.g. Sentry needs token + org, Datadog needs api_key + app_key) are stored together.
    await run_in_threadpool(
        db.upsert_source, agent_id, body.source_type, json.dumps(body.credentials), body.scope
    )
    sources = await run_in_threadpool(db.list_sources, agent_id)
    return {"ok": True, "sources": sources}


@router.post("/{agent_id}/chat")
async def chat(agent_id: str, body: ChatRequest, user: User = CurrentUser):
    agent = await run_in_threadpool(db.get_agent_owned, user.id, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")

    tokens, credentials = await run_in_threadpool(_sandbox_tokens, agent_id)
    sources = await run_in_threadpool(_coral_sources, agent_id)
    if not sources:
        raise HTTPException(400, "Connect at least one data source first.")

    await run_in_threadpool(db.save_message, agent_id, "user", body.question)

    async def event_generator():
        try:
            sbx = await run_in_threadpool(
                sbxmod.resume_or_spawn, agent["sandbox_id"], tokens, sources,
                credentials=credentials,
            )
            await run_in_threadpool(db.update_sandbox, agent_id, sbx.sandbox_id, "ready")
            await run_in_threadpool(db.set_sources_connected, agent_id, sources)

            prompt = build_investigation_prompt(body.question, notify=body.notify)

            # Run the blocking agent call in a threadpool; stream the result line-by-line.
            # True per-token streaming would require E2B's on_stdout callback — this
            # simulated line stream is sufficient for the demo and avoids SDK complexity.
            answer = await run_in_threadpool(sbxmod.run_agent, sbx, prompt)

            clean_answer = strip_evidence(answer)
            evidence = parse_evidence(answer)

            for line in clean_answer.split("\n"):
                yield {"event": "message", "data": line}
                await asyncio.sleep(0.02)  # small delay for visual streaming effect

            msg = await run_in_threadpool(
                db.save_message, agent_id, "assistant", clean_answer, evidence
            )
            yield {
                "event": "done",
                "data": json.dumps({"message_id": str(msg["id"]), "evidence": evidence}),
            }

        except sbxmod.QuotaError as e:
            yield {"event": "error", "data": json.dumps({"code": 503, "message": str(e)})}
        except sbxmod.AgentTimeout as e:
            yield {"event": "error", "data": json.dumps({"code": 504, "message": str(e)})}
        except sbxmod.ProvisionError as e:
            yield {"event": "error", "data": json.dumps({"code": 502, "message": str(e)})}

    return EventSourceResponse(event_generator())


@router.websocket("/{agent_id}/terminal")
async def terminal(agent_id: str, websocket: WebSocket):
    """Read-only log stream for the xterm.js terminal panel.

    Auth: Supabase JWT passed as ?token= query param (Authorization header is not
    available on WebSocket upgrades in most browsers).

    The terminal forwards all sandbox stdout/stderr to the client. Stdin is accepted
    and discarded — bidirectional PTY requires E2B's interactive shell API which is
    out of scope for the demo.
    """
    token = websocket.query_params.get("token", "")
    try:
        user = await auth.get_current_user(authorization=f"Bearer {token}")
    except Exception:
        await websocket.close(code=4001)
        return

    agent = await run_in_threadpool(db.get_agent_owned, user.id, agent_id)
    if not agent or not agent.get("sandbox_id"):
        await websocket.close(code=4004)
        return

    await websocket.accept()

    # Collect lines produced by the sandbox and forward them to the WebSocket.
    # We use a thread-safe asyncio.Queue to bridge the E2B on_stdout callback
    # (which fires on a background thread) with the async WebSocket sender.
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    def on_stdout(line: str) -> None:
        asyncio.run_coroutine_threadsafe(queue.put(line), loop)

    def on_stderr(line: str) -> None:
        asyncio.run_coroutine_threadsafe(queue.put(line), loop)

    def run_sandbox_tail() -> None:
        """Tail the agent's last command output in a background thread."""
        try:
            sbx = sbxmod.Sandbox.connect(
                agent["sandbox_id"],
                api_key=get_settings().e2b_api_key or None,
            )
            # Run a passive tail of the agent log file written by run_agent().
            # Falls back gracefully if the file doesn't exist yet.
            sbx.commands.run(
                "tail -F /workspace/agent.log 2>/dev/null || sleep 300",
                on_stdout=on_stdout,
                on_stderr=on_stderr,
                timeout=300,
            )
        except Exception as exc:
            asyncio.run_coroutine_threadsafe(queue.put(f"[terminal error] {exc}"), loop)
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)  # sentinel

    # Launch the sandbox tail in a background thread so it doesn't block the loop.
    tail_task = asyncio.get_event_loop().run_in_executor(None, run_sandbox_tail)

    try:
        while True:
            # Race: either a new log line arrives or the client sends/closes.
            queue_get = asyncio.create_task(queue.get())
            ws_recv = asyncio.create_task(websocket.receive_text())
            done, pending = await asyncio.wait(
                [queue_get, ws_recv], return_when=asyncio.FIRST_COMPLETED
            )

            for t in pending:
                t.cancel()

            if queue_get in done:
                line = queue_get.result()
                if line is None:  # sandbox tail finished
                    break
                await websocket.send_text(line)
            elif ws_recv in done:
                msg = ws_recv.result()
                if msg == "__CLOSE__":
                    break
                # stdin forwarding not supported in demo — silently discard

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        tail_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass


@router.get("/{agent_id}/messages")
async def messages(agent_id: str, user: User = CurrentUser) -> dict:
    agent = await run_in_threadpool(db.get_agent_owned, user.id, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    rows = await run_in_threadpool(db.list_messages, agent_id)
    return {"messages": rows}


@router.delete("/{agent_id}/sandbox")
async def kill_sandbox(agent_id: str, user: User = CurrentUser) -> dict:
    agent = await run_in_threadpool(db.get_agent_owned, user.id, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    if agent["sandbox_id"]:
        try:
            sbx = sbxmod.Sandbox.connect(agent["sandbox_id"], api_key=get_settings().e2b_api_key or None)
            await run_in_threadpool(sbxmod.teardown, sbx)
        except Exception:
            pass
    await run_in_threadpool(db.update_sandbox, agent_id, None, "dead")
    return {"ok": True}


def _public_agent(agent: dict) -> dict:
    return {
        "id": str(agent["id"]),
        "name": agent["name"],
        "model": agent["model"],
        "sandbox_id": agent["sandbox_id"],
        "sandbox_state": agent["sandbox_state"],
    }
