# CoralFlow — Backend & Agent Engine Design

> Scope: backend orchestrator + E2B sandbox + agent loop (Coral + opencode + Slack).
> Frontend (login, canvas viz, chat, terminal) is a SEPARATE later spec.
> Date: 2026-05-28 · Status: design (spike-validated)

---

## 1. Goal

A per-session, isolated agent that investigates across data sources via Coral and
reports findings. v1 is a pre-built **incident/activity investigation agent**:
GitHub as the default data source (in), Slack as the default action channel (out).
Users supply their own tokens; each session runs in an isolated E2B sandbox that is
wiped on teardown.

This spec covers everything from the HTTP boundary down to the agent loop. It does
NOT cover the web UI.

## 2. What the spike already proved (foundation — see docs/spike-docker-log.md)

| Capability | Status |
|------------|--------|
| Coral installs on Linux (Ubuntu 24.04+, GLIBC ≥ 2.39) | ✅ |
| `coral source add` without a keychain → `file (plaintext)` fallback | ✅ |
| Coral SQL returns real data; MCP via `coral mcp-stdio` | ✅ |
| opencode headless auth via API-key env var (Gemini + OpenRouter) — no OAuth | ✅ |
| opencode drives Coral MCP: writes SQL, reads result, synthesizes answer | ✅ |
| opencode runs bash headlessly with `permission.bash=allow` | ✅ |
| Slack post via bot token `chat.postMessage` (by channel name) | ✅ |
| Tool-calling works on Gemini and Kimi (OpenRouter) | ✅ |

**Dropped:** Antigravity `agy` — v1.0.3 has NO headless auth (OAuth-only); tested
GEMINI_API_KEY, ANTIGRAVITY_API_KEY, and GOOGLE_APPLICATION_CREDENTIALS, all failed.

**Known constraint (deferred decision):** the full 4-5 step loop needs a fast,
reliable model. Free tiers stall (Gemini free = quota; OpenRouter `:free` = congestion).
Build will use a small paid OpenRouter balance. Model is configurable.

## 3. Architecture

```
Browser  ──HTTPS/WSS──►  FastAPI orchestrator  ──Supabase──►  Postgres + Auth
                              │
                              │ E2B SDK
                              ▼
                       E2B Sandbox (per agent session)
                         template: coralflow-base (Ubuntu 24.04+)
                         pre-baked: coral, opencode, node, python3, requests
                         ├── coral source add <source>     (file secrets)
                         ├── coral mcp-stdio               (read-only MCP)
                         ├── opencode run --model <m>      (headless, OpenRouter)
                         │     opencode.json: permission.bash=allow + Coral MCP
                         └── slack-notify.py               (chat.postMessage action)
```

**Boundary rule:** the orchestrator never runs Coral/opencode itself. All agent and
data operations happen INSIDE the sandbox. Credentials live only in sandbox env +
Coral's file store, both wiped on teardown.

## 4. E2B template (`coralflow-base`)

Pre-bake to keep cold start fast (build mirrors the proven Dockerfile):
- Base: Ubuntu 24.04 (GLIBC 2.39 — required by Coral).
- Install: coral CLI (Linux x86_64 tarball), Node 20, opencode-ai (npm),
  python3 + requests (`--break-system-packages`).
- Ship `slack-notify.py` into the image.
- Do NOT bake any secrets or tokens.

## 5. Sandbox lifecycle

States: `cold` → `spawning` → `ready` → `dead` (idle timeout/crash).

**Spawn / resume (lazy, on user action):**
1. `Sandbox.create("coralflow-base", envs={…})` — inject `OPENROUTER_API_KEY`,
   `GITHUB_TOKEN`, `SLACK_BOT_USER_OAUTH_TOKEN`, `SLACK_CHANNEL`, model name.
2. Startup script in sandbox:
   - `coral source add github` (reads `GITHUB_TOKEN` from env)
   - write `~/.config/opencode/opencode.json` (see §7)
3. Persist `sandbox_id` + state in Supabase.
4. On a later request, try `Sandbox.connect(sandbox_id)`; if dead, re-spawn and
   re-run `coral source add` (Coral's file store dies with the sandbox).

**Teardown:** explicit kill endpoint OR E2B idle timeout (~15 min). All creds wiped.

No background keep-alive; resume is lazy and visible in the terminal panel.

## 6. Credential gateway (token injection)

- UI POSTs tokens → orchestrator encrypts (AES-GCM, key from env) → stored in Supabase
  (`token_ciphertext`, `token_last4`).
- Plaintext exists only in orchestrator memory during injection and in the sandbox
  env/Coral file store. Never returned to the browser (only `token_last4`).
- Never logged.

## 7. Agent execution

**opencode.json (written at sandbox startup):**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "bash": "allow", "edit": "allow", "webfetch": "allow" },
  "mcp": { "coral": { "type": "local", "command": ["coral","mcp-stdio"], "enabled": true } }
}
```

**Invocation:** `opencode run --model <openrouter/...> "<prompt>"` (headless).

**Prompt strategy (spike-derived, critical for speed + correctness):**
- Resolve identity FIRST: `SELECT login FROM github.user` before any owner-scoped query
  (models otherwise guess a placeholder login).
- Provide schema hints: Coral uses `__` for nested columns; `github.pulls`/`github.issues`
  require `WHERE owner = <login> AND repo = <name>`.
- Prefer pre-validated/exact queries over open-ended exploration (open-ended burns
  5-10 calls discovering schema → slow + quota).
- Action step: instruct the agent to post results by running
  `python3 /workspace/slack-notify.py "<message>"`.

**Slack action (Coral is read-only — agent posts itself):**
`slack-notify.py` calls `chat.postMessage` with the bot token, posting to the channel
by name (`#<SLACK_CHANNEL>`). Needs only `chat:write` + bot invited to the channel.

## 8. Resilience (non-negotiable — from spike failures)

- **Wrap `opencode run` in a timeout.** It hangs silently on `429`/quota.
- **Detect `429` / `RESOURCE_EXHAUSTED` / provider errors** in output → surface
  "model quota/availability error" to the user instead of hanging.
- Surface Coral errors (e.g. missing required filter) back into chat — they're useful,
  and the agent self-corrects from them.

## 9. FastAPI routes (orchestrator)

```
POST   /agents                      create agent (name, sources)         → agent_id
POST   /agents/{id}/tokens          inject + encrypt a source/Slack token
POST   /agents/{id}/chat            run investigation (SSE stream of agent output)
GET    /agents/{id}/status          sandbox state
WS     /agents/{id}/terminal        xterm.js ↔ sandbox PTY (live coral/opencode logs)
DELETE /agents/{id}                 kill sandbox + cleanup
```
All gated by Supabase JWT; row access scoped to the user's workspace.

## 10. Data model (Supabase) — backend subset

```
workspaces(id, owner_user_id, name, created_at)
agents(id, workspace_id, name, model, sandbox_id, sandbox_state, last_active_at, created_at)
agent_sources(id, agent_id, source_type, scope, token_ciphertext, token_last4, connected, created_at)
chat_messages(id, agent_id, role, content, evidence_json, created_at)
```
RLS: every row scoped to `auth.uid()` via `workspace_id`. (Full schema incl. canvas/
edges is in the frontend spec.)

## 11. Open decisions (resolve at build)

1. **Model:** which paid OpenRouter model (cost vs latency vs tool-calling quality).
   Default candidate: a fast paid Kimi or Gemini-flash via OpenRouter.
2. **Token encryption key management:** env var for v1; KMS later.
3. **Concurrency:** sandbox-per-agent caps (cost control) — out of scope for v1 demo.

## 12. Out of scope (this spec)

Web UI, React Flow canvas, evidence-card rendering, multi-workspace, additional
sources beyond GitHub+Slack (architecture supports them; v1 demo ships the two).
