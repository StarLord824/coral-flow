"""FastAPI routes — the HTTP boundary of the orchestrator.

This is the thin layer the browser talks to. It never runs Coral/opencode directly;
it manages sandbox lifecycle and proxies investigation requests into the sandbox.

NOTE: persistence (Supabase) and auth (JWT) are wired in app.db / app.auth; for the
initial skeleton these routes operate on an in-memory agent registry so the engine
can be exercised end-to-end before the DB layer lands.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import sandbox as sbxmod
from .prompts import build_investigation_prompt

router = APIRouter(prefix="/agents", tags=["agents"])

# Placeholder in-memory store until Supabase is wired (see app/db.py TODO).
_AGENTS: dict[str, dict] = {}


class CreateAgent(BaseModel):
    name: str
    sources: list[str] = ["github"]


class InjectTokens(BaseModel):
    # Keys: github, slack, openrouter, slack_channel
    tokens: dict[str, str]


class ChatRequest(BaseModel):
    question: str
    notify: bool = True


@router.post("")
def create_agent(body: CreateAgent) -> dict:
    agent_id = f"agent_{len(_AGENTS) + 1}"
    _AGENTS[agent_id] = {
        "name": body.name,
        "sources": body.sources,
        "tokens": {},
        "sandbox_id": None,
    }
    return {"agent_id": agent_id, "name": body.name, "sources": body.sources}


@router.post("/{agent_id}/tokens")
def inject_tokens(agent_id: str, body: InjectTokens) -> dict:
    agent = _AGENTS.get(agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    # In the DB-backed version these are AES-GCM encrypted at rest (see app/crypto.py).
    agent["tokens"].update(body.tokens)
    return {"ok": True, "sources_with_tokens": sorted(agent["tokens"].keys())}


@router.post("/{agent_id}/chat")
def chat(agent_id: str, body: ChatRequest) -> dict:
    agent = _AGENTS.get(agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")

    sbx = sbxmod.resume_or_spawn(agent["sandbox_id"], agent["tokens"], agent["sources"])
    agent["sandbox_id"] = sbx.sandbox_id

    prompt = build_investigation_prompt(body.question, notify=body.notify)
    try:
        answer = sbxmod.run_agent(sbx, prompt)
    except sbxmod.QuotaError as e:
        raise HTTPException(503, str(e))
    except sbxmod.AgentTimeout as e:
        raise HTTPException(504, str(e))
    return {"agent_id": agent_id, "answer": answer}


@router.delete("/{agent_id}")
def delete_agent(agent_id: str) -> dict:
    agent = _AGENTS.pop(agent_id, None)
    if not agent:
        raise HTTPException(404, "agent not found")
    if agent["sandbox_id"]:
        try:
            sbx = sbxmod.Sandbox.connect(agent["sandbox_id"])
            sbxmod.teardown(sbx)
        except Exception:
            pass
    return {"ok": True}
