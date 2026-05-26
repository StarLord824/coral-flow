# CoralFlow

Ask questions across your tools in plain English. CoralFlow spins up an isolated,
per-session agent that investigates across your data sources via [Coral](https://withcoral.com)
and reports findings — e.g. *"what recent PRs might have caused issues?"* → it queries
GitHub through Coral and posts a summary to Slack.

Built for the **Pirates of the Coral-bean** hackathon (Track 1 — Enterprise Agent).

## How it works

```
Browser ──► FastAPI orchestrator ──► E2B sandbox (per session)
                                        ├── Coral CLI      (read-only SQL over sources, via MCP)
                                        ├── opencode       (agent runner, headless API-key auth)
                                        └── Slack action   (agent posts findings via bot token)
```

- **Coral** turns every source (GitHub, Linear, Sentry, …) into SQL and exposes it over MCP.
- **opencode** drives the investigation: it writes SQL through Coral's MCP, reads the
  results, reasons, and posts a summary to Slack.
- Each session runs in an **isolated E2B sandbox** — credentials are injected at spawn
  and wiped on teardown.

## Repo layout

| Path | What |
|------|------|
| `backend/` | FastAPI orchestrator (sandbox lifecycle, token injection, agent routes) |
| `e2b/` | E2B sandbox template (`coralflow-base`: coral + opencode + node + python) |
| `docs/` | Design spec + validation spike logs |
| `docker/` | Local Docker harness used to validate the stack before E2B |

## Status

Backend + agent engine: design complete, foundation validated end-to-end (see
`docs/spike-docker-log.md`). Frontend (canvas + chat UI) is a follow-up.
