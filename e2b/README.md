# E2B sandbox template — `coralflow-base`

Pre-baked image so cold starts stay fast (no per-session install of Coral/opencode).

## Why Ubuntu 24.04
Coral's binary requires **GLIBC ≥ 2.39**. Ubuntu 22.04 ships 2.35 and fails with
`version 'GLIBC_2.39' not found`. 24.04 ships 2.39. (Validated during the spike —
see `docs/spike-docker-log.md`.)

## Contents
- `coral` CLI — read-only SQL over sources, exposes `coral mcp-stdio`
- `opencode` — agent runner; authenticates headlessly via an API-key env var
- `node`, `python3` + `requests` — for tooling and the Slack action script

## Build
```bash
e2b template build -d e2b.Dockerfile --name coralflow-base
```

## Runtime injection (done by the orchestrator, not baked in)
- env: `OPENROUTER_API_KEY`, `GITHUB_TOKEN`, `SLACK_BOT_USER_OAUTH_TOKEN`, `SLACK_CHANNEL`
- `~/.config/opencode/opencode.json` (Coral MCP + `permission.bash=allow`)
- `/workspace/slack-notify.py`
- `coral source add <source>` per connected source (token read from env; secrets land
  in Coral's local `file (plaintext)` store, wiped on teardown)

No secrets are ever baked into the template.
