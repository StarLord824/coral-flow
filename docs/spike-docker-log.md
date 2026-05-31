# CoralFlow — Docker Spike Log (Linux / E2B proxy)
> Phase 2: Prove the stack works in a Linux container before E2B
> Base: Ubuntu 24.04 (NOT 22.04 — see CP0) | Date: 2026-05-28

The Docker container is a stand-in for the E2B sandbox: same OS family, same
headless constraints, zero cost, deletable. If it works here, it works in E2B.

---

## CP0 — Base image / GLIBC (blocker, solved)

**Problem:** Coral 0.4.1 binary requires **GLIBC 2.39**. Ubuntu 22.04 ships GLIBC 2.35.
```
coral: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.39' not found (required by coral)
```
**Fix:** Use `FROM ubuntu:24.04` (ships GLIBC 2.39). Verified:
```
ldd (Ubuntu GLIBC 2.39-0ubuntu8.7) 2.39
coral 0.4.1+43d8309
agy 1.0.3
```
**Status:** ✅ Solved — E2B template MUST be Ubuntu 24.04+ (or any base with GLIBC ≥ 2.39).

---

## CP-build — pip PEP 668 (minor, solved)

Ubuntu 24.04 blocks system pip installs (PEP 668: "externally-managed-environment").
**Fix:** `pip3 install requests --break-system-packages` (acceptable in a throwaway container).

---

## CP1 — Coral installed ✅
```
coral 0.4.1+43d8309
```
Coral installs cleanly on Linux x86_64 from the GitHub release tarball.

---

## CP2 — coral source add github WITHOUT keychain ✅ (THE BIG UNKNOWN — SOLVED)

This was the #1 risk from the local spike. On Windows, Coral stored the token in
the system keychain. Linux containers have no keychain.

**Result:** Coral auto-detects the missing keychain and falls back to file storage:
```
Added source github (secrets: file (plaintext))
  ✓ github connected successfully
  Secrets: file (plaintext)
    github (362 tables)
```
**Status:** ✅ SOLVED — no config, no gnome-keyring, no dbus needed. Coral just
falls back to `file (plaintext)` automatically. Token lands in Coral's config dir.
**Security note for production:** "plaintext" means the token sits readable in the
sandbox filesystem. Fine for ephemeral per-user E2B sandboxes (wiped on teardown),
but never log/persist that file outside the sandbox.

---

## CP3 — coral sql returns data ✅
```sql
SELECT login, name, public_repos FROM github.user LIMIT 1
```
```
+-------------+----------------+--------------+
| login       | name           | public_repos |
+-------------+----------------+--------------+
| StarLord824 | Abhinav Shukla | 53           |
+-------------+----------------+--------------+
```
Identical behavior to local. Coral SQL fully works in the container.

---

## CP4 — Antigravity CLI (agy) installed ✅
```
agy 1.0.3
```
Installs from `https://antigravity.google/cli/install.sh` to `/root/.local/bin/agy`.

---

## CP5 — mcp_config.json for Coral ✅ (after fix)

**Bug:** config dir didn't exist → write failed.
**Fix:** `mkdir -p /root/.config/antigravity` before writing.
```json
{
  "mcpServers": {
    "coral": { "command": "coral", "args": ["mcp-stdio"], "type": "stdio" }
  }
}
```
**Status:** ✅ File writes correctly. (NOT yet verified that agy actually LOADS it
and lists Coral's tools — blocked by CP6 auth failure below.)

---

## CP6 — agy -p end-to-end ❌ BLOCKER: agy has no headless auth

**What happened:** agy ignored every API-key env var and demanded interactive
browser OAuth:
```
Authentication required. Please visit the URL to log in:
  https://accounts.google.com/o/oauth2/auth?...scope=...cloud-platform...
Waiting for authentication (timeout 30s)...
Error: authentication timed out.
```
The agent **never ran**. No answer was produced.

> ⚠️ The test script originally printed "✅ PASS" here — that was a FALSE POSITIVE.
> agy exits with code 0 even when auth times out, so the `$?` check was wrong.
> Fixed: the script now greps the OUTPUT for a real answer vs an auth-error string.

### Root-cause investigation (binary inspection)

`agy --help`, `agy auth --help`, `agy login --help` — **no auth/login subcommand,
no `--api-key` flag**. Only subcommands: changelog, help, install, plugin, update.

Searched the binary for auth env vars:
```
strings agy | grep -E 'ANTIGRAVITY_[A-Z_]+|GEMINI_API_KEY|GOOGLE_APPLICATION_CREDENTIALS'
```
Found: many `ANTIGRAVITY_*` vars (BROWSER, RESEARCH, CONVERSATION_ID, etc.) but
**NO `ANTIGRAVITY_API_KEY` and NO `GEMINI_API_KEY`.** The only auth-relevant var is
**`GOOGLE_APPLICATION_CREDENTIALS`** (GCP service-account / Application Default Credentials).

**Conclusion:** agy 1.0.3 is OAuth-first. The GitHub "API key for headless" request
(issue #78) is NOT implemented in this version. My earlier `ANTIGRAVITY_API_KEY`
advice was WRONG.

### Headless options for agy (if we keep it)
| Option | How | Risk |
|--------|-----|------|
| OAuth token baking | Do OAuth once interactively, capture the stored credential file, bake into the E2B template | All sandboxes share ONE Google identity + quota; refresh tokens expire/revoke; fragile |
| GCP service account | Set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON | Untested; consumer Antigravity may reject service accounts; needs GCP project setup |

### DEFINITIVE TEST (2026-05-28): GEMINI_API_KEY does NOT bypass OAuth

Antigravity's own chatbot advised that setting `GEMINI_API_KEY` makes agy skip OAuth
(the standard Google CI/CD pattern). We tested it empirically with a REAL key:

```
GEMINI_API_KEY = AIza…<redacted> (len 39)   ← correct AI-Studio format
→ agy -p "Reply with PONG"
→ "Authentication required. Please visit the URL to log in: https://accounts.google.com/..."
→ Error: authentication timed out.
```

**agy 1.0.3 ignored the valid GEMINI_API_KEY and still demanded interactive OAuth.**
The advice was generic (applies to Gemini CLI / google-genai SDK, NOT agy). agy's
OAuth scopes (`cloud-platform`, `cclog`, `experimentsandconfigs`) confirm it auths
against the Antigravity/GCP backend, not the AI-Studio Gemini API.

### ADC / service-account test (2026-05-28): ALSO fails

Antigravity chatbot's 3rd proposed fix: `GOOGLE_APPLICATION_CREDENTIALS` → a GCP
service-account JSON (since the binary references that string). Tested with a real
service account (`e2b-392@coral-flow-498008.iam.gserviceaccount.com`):

```
GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json (valid service_account, has private_key)
API-key vars all unset
→ agy -p "Reply with PONG"
→ "Authentication required. Please visit the URL to log in: https://accounts.google.com/..."
→ Error: authentication timed out.
```

Still OAuth. The `GOOGLE_APPLICATION_CREDENTIALS` string in the binary is used for
something else internally (bundled browser/telemetry), NOT agent auth.

### FINAL VERDICT — all three headless paths tested and FAILED

| Proposed fix | Binary evidence | Empirical result |
|--------------|-----------------|------------------|
| `GEMINI_API_KEY` | string absent | ❌ OAuth |
| `ANTIGRAVITY_API_KEY` (valid AIzaSy, alone) | string absent | ❌ OAuth |
| `GOOGLE_APPLICATION_CREDENTIALS` (valid SA) | string present | ❌ OAuth |

### FULL LOOP SUCCESS — opencode + openrouter/owl-alpha (2026-05-31)

After free-tier models (Gemini free = quota, OpenRouter kimi:free = congestion) all
stalled the multi-step loop, **`openrouter/owl-alpha`** completed it cleanly:

```
> build · owl-alpha
coral_sql SELECT login... -> StarLord824 (54 repos)
coral_sql ...user_repos WHERE owner=... -> empty, model self-corrected
coral_sql ...user_repos ORDER BY updated_at DESC LIMIT 3 -> 3 repos
$ python3 /workspace/slack-notify.py "..." -> Posted to #incidents-alerts (ts=...)
exit 0
```

Coral data-in -> 4-query agentic investigation (with self-correction) -> Slack
action-out, in one run, no stall. **owl-alpha is the chosen agent model.**

GOTCHA: opencode rejects unlisted models ("Model not found: openrouter/owl-alpha").
owl-alpha is a stealth model not in opencode's catalog, so it MUST be registered in
opencode.json:
```json
"provider": { "openrouter": { "models": { "owl-alpha": { "name": "Owl Alpha" } } } }
```
(Privacy note: owl-alpha logs prompts/completions — fine for the hackathon demo.)

---

**agy 1.0.3 has NO headless auth path. It is hardwired to interactive browser OAuth
against the consumer Antigravity backend. DROPPED as the agent runner — permanently.**

**Replacement: Claude Code (`claude -p` + `ANTHROPIC_API_KEY`) — proven headless in
Phase 1 (local). Will be re-verified in a fresh container with the SAME rigor before
we commit (we do not trust docs/advice anymore — only empirical container tests).**

**Lesson:** Asking an LLM about its own undocumented CLI yields the *standard pattern*,
not actual behavior. Three confident, detailed answers — all wrong. Binary scan +
empirical container test were the only reliable signals.

---

## CP6 (FINAL) — opencode + Gemini: FULL LOOP WORKS ✅🎉

After dropping agy, the user chose **opencode + a personal Google Gemini API key**.
Proven end-to-end in the container (2026-05-28).

### Setup
- Install: `npm install -g opencode-ai` (v1.15.13)
- Auth: Gemini API key via env var — mirrored to `GEMINI_API_KEY`,
  `GOOGLE_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` (no OAuth, no keychain)
- MCP config: `~/.config/opencode/opencode.json`
  ```json
  { "$schema": "https://opencode.ai/config.json",
    "mcp": { "coral": { "type": "local", "command": ["coral","mcp-stdio"], "enabled": true } } }
  ```
- Headless run: `opencode run --model google/gemini-2.5-flash "<prompt>"`

### The hang that wasn't auth
First attempt hung 5-7 min. Isolation (timeout-wrapped steps) showed it hung even
WITHOUT MCP → not Coral. Raw curl to the Gemini API revealed the truth:
```
GET  /models                         → HTTP 200 (key VALID)
POST gemini-2.5-pro:generateContent  → HTTP 429 RESOURCE_EXHAUSTED
   "limit: 0, model: gemini-2.5-pro" (free tier excludes Pro entirely)
```
**opencode silently retries on 429 with backoff → looks like a hang.**

### Free-tier model availability (this key)
| Model | Result |
|-------|--------|
| gemini-2.5-flash | ✅ PONG |
| gemini-2.5-flash-lite | ✅ PONG |
| gemini-3-flash-preview | ✅ PONG |
| gemini-2.5-pro | ❌ 429 (free tier limit 0) |
| gemini-2.0-flash | ❌ 429 |

### Full loop proof (gemini-2.5-flash + Coral MCP)
```
> build · gemini-2.5-flash
⚙ coral_sql {"sql":"SELECT login FROM github.user"}
StarLord824
[exit=0]
```
opencode autonomously chose the `coral_sql` MCP tool, wrote the SQL, queried Coral,
got real data, answered. Headless. No OAuth. No hang.

**VERDICT: Agent foundation SETTLED → opencode + Gemini (free-tier flash) + Coral MCP.**

### Production action items (carry into FastAPI/E2B build)
1. Default model: a Gemini *flash* tier (see model-selection findings below). Configurable.
2. **Wrap `opencode run` with a timeout** and detect 429/RESOURCE_EXHAUSTED →
   surface "quota exceeded" to the user instead of hanging.
3. Inject the Gemini key under all three env-var names to be safe.
4. Write `opencode.json` (with Coral MCP) into the sandbox at startup.
5. Coral uses `file (plaintext)` secrets in the sandbox — wiped on teardown, never
   persist/log it.
6. **Use tight prompts with schema hints** — open-ended prompts make the model burn
   5-10 exploratory calls discovering Coral's `__`-nested column naming (slow + quota).

---

## Model selection findings (2026-05-28)

The agentic loop works across models, but there's a real tradeoff between tool-call
quality, loop completion, and free-tier quota.

| Model | Tool-calling | Completes loop (reads result → answers) | Free-tier quota | Notes |
|-------|-------------|------------------------------------------|-----------------|-------|
| gemini-2.5-flash | ✅ excellent | ✅ clean (`SELECT login` → "StarLord824") | ❌ LOW — exhausted after ~1hr of testing (429) | Best behavior, fragile quota |
| gemini-2.0-flash | — | — | ❌ limit 0 (free tier) | unusable free |
| gemini-2.5-pro | — | — | ❌ limit 0 (free tier) | unusable free |
| gemma-4-31b-it | ✅ calls tools | ⚠️ UNRELIABLE — called coral_sql then exited w/o synthesizing | ✅ HIGH (15 RPM / 1500 RPD) | great quota, weak loop completion |
| gemma-4-26b-a4b-it | ✅ (verbose) | untested | ✅ HIGH | verbose reasoning, weak instruction-following |
| **gemini-3-flash-preview** | ✅ excellent | ✅ clean ("Your GitHub login is StarLord824") | ✅ has quota | **CHOSEN DEFAULT — best of both** |

**Key facts:**
- Free-tier per-model quotas are independent and LOW for gemini-2.x flash/pro.
- Gemma models have far higher free quota but call-then-quit (don't finish the loop).
- opencode HANGS silently on 429 → must timeout-wrap in production.
- Tight, schema-hinted prompts cut tool-call count dramatically (speed + quota).

**Leading candidate:** `gemini-3-flash-preview` — a real Gemini (strong tool-calling +
loop completion). Validated single query→answer loop cleanly.

---

## Slack action layer + full-loop findings (2026-05-28)

### Coral is READ-ONLY — cannot post to Slack
Advice claimed "Coral MCP executes the Slack webhook." FALSE — Coral is read-only
(confirmed from docs). The Slack **source** only READS. The agent must post via its
own action: a shell command (opencode runs `python3 slack-notify.py`) using a Slack
bot token. slack-notify.py uses chat.postMessage (bot token), NOT Coral.

### Slack posting — PROVEN ✅
Bot token (`SLACK_BOT_USER_OAUTH_TOKEN`, xoxb-) + `chat.postMessage` by channel NAME
(`#incidents-alerts`) works headlessly. No `channels:read` / `conversations.list`
needed — post by name directly (needs only chat:write + bot invited to channel).

### opencode bash permission — SOLVED ✅
opencode blocks on interactive permission for bash in headless mode (like Claude
Code's --dangerously-skip-permissions). Fix: in opencode.json set
`"permission": { "bash": "allow", "edit": "allow", "webfetch": "allow" }`.
Verified: opencode then runs `echo` headlessly and returns output. So the agent CAN
run the Slack script.

### THE REAL BLOCKER: free-tier model speed/reliability for multi-step loops
The full chain (Coral query → Coral query → reason → bash Slack post → confirm) is
~4-5 model round-trips. On FREE tiers this never completed in one run:
| Model (free) | Result on full loop |
|--------------|---------------------|
| gemini-3-flash-preview | quota 429 (exhausted from testing) |
| gemini-2.5-flash | quota 429 (exhausted) |
| kimi-k2.6:free (OpenRouter) | did 2 Coral queries @180s, then only 1 @300s — congested/inconsistent ("Provider returned error") |

Every INDIVIDUAL link is proven (Coral→answer, bash, Slack post, tool-calling on
Gemini & Kimi). The full multi-step chain stalls purely due to free-tier
latency/quota/congestion — NOT capability.

**CONCLUSION / DECISION NEEDED:** A reliable multi-step agentic demo needs a model
endpoint with consistent low-latency responses. Free tiers (Gemini free, OpenRouter
:free) are too slow/quota-limited/congested. Options: (a) small paid balance on
OpenRouter for a fast paid model (cents for a demo), (b) paid Gemini tier, (c) accept
unreliable free-tier runs + pre-record the demo. Recommend (a).

---

## CP7 — Slack notification ❌ (expected — placeholder webhook)
```
Slack post failed: 404 no_team
```
`SLACK_WEBHOOK_URL` was still the placeholder. Not a real failure — needs a real
Incoming Webhook URL. Script logic itself is fine.

---

## Decision point: agent runner for the headless sandbox

| Runner | Headless auth | Proven? | Cost | Notes |
|--------|---------------|---------|------|-------|
| **Claude Code** (`claude -p`) | `ANTHROPIC_API_KEY` env var — pure, clean | ✅ YES (Phase 1 local) | Per-token API pricing | Built for headless; `--dangerously-skip-permissions` already works |
| **Antigravity** (`agy -p`) | OAuth only (or fragile token-baking / ADC) | ❌ NO (blocked here) | Subscription (cheaper) | Fights ephemeral-sandbox model |

**Open for user decision** — see project memory / next chat turn.

---

## Summary

| CP | What | Status |
|----|------|--------|
| 0 | Ubuntu 24.04 base (GLIBC 2.39) | ✅ Solved |
| build | pip --break-system-packages | ✅ Solved |
| 1 | Coral installs on Linux | ✅ |
| 2 | **coral source add WITHOUT keychain** | ✅ **SOLVED — auto file fallback** |
| 3 | coral sql returns data | ✅ |
| 4 | agy installs | ✅ |
| 5 | mcp_config.json writes | ✅ (load not yet verified) |
| 6 | **agy -p end-to-end** | ❌ **BLOCKED — agy has no headless auth** |
| 7 | Slack notify | ⏳ needs real webhook |

**Biggest win:** the keychain blocker (CP2) is gone — Coral "just works" headless.
**Biggest risk:** the agent runner. agy can't auth headlessly; Claude Code can.
