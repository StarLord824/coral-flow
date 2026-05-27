# CoralFlow — Backend Orchestrator

FastAPI service that manages per-session agent sandboxes. The browser talks to this;
this talks to E2B. All Coral/opencode/Slack work happens **inside** the sandbox — the
orchestrator only handles lifecycle, credential injection, and proxying.

## Layout
```
app/
  main.py        FastAPI app + /health
  config.py      env-driven settings (E2B, Supabase, model, encryption key)
  crypto.py      AES-GCM encryption for per-user source tokens
  sandbox.py     E2B lifecycle: spawn / resume / provision / run_agent / teardown
  prompts.py     investigation prompt (identity-first + Coral schema hints)
  routes.py      /agents endpoints (create, tokens, chat, delete)
sandbox_assets/
  slack-notify.py  agent's Slack action (Coral is read-only, can't post)
```

## Run
```bash
pip install -r requirements.txt
cp .env.example .env   # fill in E2B, Supabase, model, encryption key
uvicorn app.main:app --reload --port 8000
```

## Design
See `../docs/superpowers/specs/2026-05-28-coralflow-backend-design.md` and the
validation logs in `../docs/spike-*.md`.

## Key facts baked in (from the spike)
- Agent runner is **opencode** + a paid OpenRouter model (free tiers stall on
  multi-step loops). Configurable via `AGENT_MODEL`.
- `opencode run` is **timeout-wrapped** and scanned for 429/quota — it hangs silently
  otherwise.
- Coral is **read-only**; the agent notifies Slack by running `slack-notify.py`.
- Sandbox template must be **Ubuntu 24.04+** (Coral needs GLIBC ≥ 2.39).
