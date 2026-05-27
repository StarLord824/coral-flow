# CoralFlow — Local Spike Command Log
> Phase 1: Prove the core loop works locally before touching E2B
> Date: 2026-05-28 | Machine: Windows 11 (PowerShell)

---

## 1. Exploration & Info

### `coral --version`
```
coral 0.4.1+43d8309
```
**Status:** ✅ Success

---

### `coral --help`
```
A local-first SQL interface for APIs, files, and other data sources

Usage: coral.exe <COMMAND>

Commands:
  sql         Execute a SQL query
  source      Manage data sources
  onboard     Interactive wizard to set up Coral and explore use cases
  mcp-stdio   Start the MCP server over stdio
  features    Inspect and manage experimental runtime features
  ui          Start the local gRPC-Web server with the embedded Coral UI
  completion  Generate shell completion scripts
  help        Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```
**Status:** ✅ Success

---

### `coral source list` (before adding anything)
```
No sources configured.
```
**Status:** ✅ Success — clean slate confirmed

---

### `coral source --help`
```
Manage data sources

Usage: coral.exe source <COMMAND>

Commands:
  discover  Discover available sources
  list      List configured sources
  info      Show metadata for a source
  add       Add a new source
  lint      Lint manifest file
  test      Test connectivity for a source
  remove    Remove a source
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```
**Status:** ✅ Success

---

### `coral source add --help`
```
Add a new source

Usage: coral.exe source add [OPTIONS] <NAME|--file <FILE>>

Arguments:
  [NAME]  Name for the new source

Options:
      --file <FILE>  Path to a file
      --interactive  Prompt for input values interactively. When unset,
                     values are read from environment variables matching
                     each input key
  -h, --help         Print help
```
**Status:** ✅ Success  
**Key finding:** No `--token` flag — reads from **env vars** when `--interactive` is not set.

---

### `coral source info github`
```
github
  Status:      not installed
  Origin:      bundled
  Version:     1.1.6
  Description: Query repositories, issues, pull requests, workflows,
               organizations, users, teams, and API metadata from
               GitHub (Cloud or Enterprise).

  Inputs
    GITHUB_API_BASE (variable, optional)
      default: https://api.github.com
    GITHUB_TOKEN (secret, required)
```
**Status:** ✅ Success  
**Key finding:** Env var is `GITHUB_TOKEN`. `GITHUB_API_BASE` is optional (defaults to github.com). Token stored in system keychain after add.

---

### `coral features list`
```
Feature   Configured  Enabled  Description
--------  ----------  -------  ----------------------------------------------------------------
feedback  default     false    Exposes the MCP feedback tool when enabled. Feedback reports are
                               stored locally and anonymous copies may be uploaded to Coral.
```
**Status:** ✅ Success  
**Key finding:** No secrets backend toggle exposed — cannot switch from keychain to file via features flag.

---

## 2. Source Setup

### `coral onboard` (interactive wizard)
**Status:** ⚠️ Cancelled  
**Notes:** User ran it manually to explore available sources. Cancelled — requires TTY, not usable for backend automation. Available sources seen in wizard: claude, clickup, cloudwatch_logs, cloudwatch_metrics, codex, confluence, datadog, github, gitlab, google_calendar, grafana, incident_io, intercom, jira, launchdarkly, linear, notion, openobserve, pagerduty, posthog, sentry, slack, statusgator, stripe, wandb — **25 sources total**.

---

### `$env:GITHUB_TOKEN = "..."` → `coral source add github`
```
Added source github (secrets: keychain)

  ✓ github connected successfully
  Secrets: keychain

    github (362 tables)
    ├─ accepted_assignments
    ├─ access
    ├─ accounts
    ├─ activity
    ├─ activity_list_repos_starred_by_user
    ├─ activity_list_repos_watched_by_user
    ├─ advisories
    ├─ alerts
    ├─ analyses
    └─ ... and 353 more

    Query tests
    1 declared · 1 passed · 0 failed

    ✓ SELECT * FROM github.meta LIMIT 1
      1 row
```
**Status:** ✅ Success  
**Key finding:** Token stored in **system keychain** — this will be a problem in E2B Linux sandbox (no keychain).

---

### `coral source list` (after adding github)
```
Source  Version  Origin   Secrets
------  -------  ------   --------
github  1.1.6    bundled  keychain
```
**Status:** ✅ Success

---

### `coral source test github`
```
  ✓ github connected successfully
  Secrets: keychain

    github (362 tables)
    ├─ (all 362 tables listed)
    ...

    Query tests
    1 declared · 1 passed · 0 failed

    ✓ SELECT * FROM github.meta LIMIT 1
      1 row
```
**Status:** ✅ Success

---

## 3. SQL Queries

### Query 1 — Authenticated user info
```sql
SELECT login, name, public_repos, followers FROM github.user LIMIT 1
```
```
+-------------+----------------+--------------+-----------+
| login       | name           | public_repos | followers |
+-------------+----------------+--------------+-----------+
| StarLord824 | Abhinav Shukla | 53           | 4         |
+-------------+----------------+--------------+-----------+
```
**Status:** ✅ Success  
**Table:** `github.user` — no filter required, always returns the authenticated user.

---

### Query 2 — Repos (wrong table attempt)
```sql
SELECT name, language, stargazers_count, updated_at
FROM github.repos
ORDER BY updated_at DESC LIMIT 5
```
```
Error: github.repos requires `WHERE team_id = <constant>`
Detail: github.repos requires a constant equality filter on team_id
Hint: Add a constant equality filter on `team_id` or inspect
      `coral.columns` / `coral.tables` first.
```
**Status:** ❌ Error  
**Root cause:** `github.repos` is org/team-scoped. Wrong table for personal repos.  
**Fix:** Use `github.user_repos` instead.

---

### Query 3 — Repos (correct table)
```sql
SELECT full_name, language, stargazers_count, updated_at
FROM github.user_repos
ORDER BY updated_at DESC LIMIT 5
```
```
+------------------------------+------------+------------------+----------------------+
| full_name                    | language   | stargazers_count | updated_at           |
+------------------------------+------------+------------------+----------------------+
| StarLord824/finmate.dev      | TypeScript | 0                | 2026-05-14T10:29:01Z |
| StarLord824/oss-pulse        | TypeScript | 0                | 2026-05-04T17:55:42Z |
| StarLord824/dx-ray           | TypeScript | 0                | 2026-04-06T04:29:41Z |
| StarLord824/better-prompt    | Python     | 0                | 2026-03-13T10:25:58Z |
| StarLord824/betting-platform | TypeScript | 0                | 2026-02-24T17:55:00Z |
+------------------------------+------------+------------------+----------------------+
```
**Status:** ✅ Success  
**Table:** `github.user_repos` — correct table for authenticated user's own repos.

---

### Query 4 — PRs (missing owner filter)
```sql
SELECT number, title, state, created_at
FROM github.pulls
WHERE repo = 'StarLord824/finmate.dev'
ORDER BY created_at DESC LIMIT 5
```
```
Error: github.pulls requires `WHERE owner = <constant>`
Detail: github.pulls requires a constant equality filter on owner
Hint: Add a constant equality filter on `owner` or inspect
      `coral.columns` / `coral.tables` first.
```
**Status:** ❌ Error  
**Root cause:** `github.pulls` needs **both** `owner` and `repo` as separate `WHERE` filters. Cannot pass `owner/repo` combined in the `repo` field.

---

### Query 5 — PRs (correct filters, empty result)
```sql
SELECT number, title, state, created_at
FROM github.pulls
WHERE owner = 'StarLord824' AND repo = 'finmate.dev'
ORDER BY created_at DESC LIMIT 5
```
```
++
++
```
**Status:** ⚠️ Empty result  
**Notes:** Correct syntax — no error. Repo simply has no PRs.

---

### Query 6 — Issues in finmate.dev (empty)
```sql
SELECT number, title, state, created_at
FROM github.issues
WHERE owner = 'StarLord824' AND repo = 'finmate.dev'
ORDER BY created_at DESC LIMIT 5
```
```
++
++
```
**Status:** ⚠️ Empty result — no issues in that repo.

---

### Query 7 — Issues in oss-pulse (empty)
```sql
SELECT number, title, state, created_at
FROM github.issues
WHERE owner = 'StarLord824' AND repo = 'oss-pulse'
ORDER BY created_at DESC LIMIT 5
```
```
++
++
```
**Status:** ⚠️ Empty result — no issues in that repo either.

---

### Query 8 — User issues across all repos (empty)
```sql
SELECT * FROM github.user_issues ORDER BY updated_at DESC LIMIT 5
```
```
++
++
```
**Status:** ⚠️ Empty result — no issues assigned to authenticated user across any repo. Expected: user simply has no open assigned issues.

---

## 4. Claude Code + Coral MCP

### `claude --version`
```
2.1.146 (Claude Code)
```
**Status:** ✅ Success — already installed, no setup needed.

---

### `claude mcp list` (before adding Coral)
```
Checking MCP server health…

claude.ai Todoist: https://ai.todoist.net/mcp - ! Needs authentication
claude.ai ZohoMCP_Prayas: https://... - ! Needs authentication
claude.ai Google Drive: https://drivemcp.googleapis.com/mcp/v1 - ! Needs authentication
claude.ai Google Calendar: https://calendarmcp.googleapis.com/mcp/v1 - ! Needs authentication
claude.ai Notion: https://mcp.notion.com/mcp - ! Needs authentication
claude.ai monday.com: https://mcp.monday.com/mcp - ! Needs authentication
claude.ai Linear: https://mcp.linear.app/mcp - ! Needs authentication
claude.ai Intercom: https://mcp.intercom.com/mcp - ! Needs authentication
claude.ai HubSpot: https://mcp.hubspot.com/anthropic - ! Needs authentication
claude.ai Figma: https://mcp.figma.com/mcp - ! Needs authentication
claude.ai Canva: https://mcp.canva.com/mcp - ! Needs authentication
claude.ai Box: https://mcp.box.com - ! Needs authentication
claude.ai Atlassian: https://mcp.atlassian.com/v1/mcp - ! Needs authentication
claude.ai Asana: https://mcp.asana.com/sse - ! Needs authentication
```
**Status:** ✅ Success  
**Notes:** 14 claude.ai MCP servers present, all unauthenticated. **Coral not yet registered.**

---

### `claude mcp add coral -- coral mcp-stdio`
```
Added stdio MCP server coral with command: coral mcp-stdio to local config
File modified: C:\Users\MY NOTEBOOK\.claude.json
  [project: C:\Users\MY NOTEBOOK\Desktop\coral-flow]
```
**Status:** ✅ Success  
**Key finding:** Config written to `.claude.json` in the **project directory** (`coral-flow/`), not globally. In E2B, must either run this command during sandbox setup OR pre-bake the config in the template.

---

### `claude mcp list | Select-String "coral"` (after adding)
```
coral: coral mcp-stdio - ✓ Connected
```
**Status:** ✅ Success — Coral MCP server live and connected.

---

### `claude -p "...list my 5 repos..." --output-format text` (without skip-permissions)
```
It looks like the Coral MCP tools need explicit permission. Can you approve
the `mcp__coral__search_catalog` tool use in the permission prompt?

In the meantime — your GitHub username is already visible from the git config
in this session: starlordOG.

For the repositories list, Coral is a SQL database (likely containing
project/analytics data), not a GitHub API proxy, so it may not have your
GitHub repo data. Once you grant permission I can confirm what's actually in
the catalog. Alternatively, I can use the GitHub CLI (`gh repo list`) to get
your 5 most recently updated repos directly — want me to try that instead?
```
**Status:** ⚠️ Blocked — permission gate  
**Root cause:** `claude -p` in non-interactive/headless mode cannot prompt for tool approval interactively.  
**Fix:** Add `--dangerously-skip-permissions` flag.

---

### `claude -p "...query github.user and github.user_repos..." --output-format text --dangerously-skip-permissions`

**Full command:**
```bash
claude -p "Using the Coral MCP tool, query github.user to get my GitHub login
and name, then query github.user_repos to list my 5 most recently updated
repositories with their languages." \
  --output-format text \
  --dangerously-skip-permissions
```

**Output:**
```
Here's what I found:

**Authenticated User**
- Login: `StarLord824`
- Name: Abhinav Shukla

**5 Most Recently Updated Repos**

| Repository          | Language   | Last Push      |
|---------------------|------------|----------------|
| finmate.dev         | TypeScript | May 14, 2026   |
| oss-pulse           | TypeScript | May 4, 2026    |
| dx-ray              | TypeScript | Apr 6, 2026    |
| devboard            | TypeScript | Mar 22, 2026   |
| better-prompt       | Python     | Mar 13, 2026   |

Predominantly TypeScript work, with one Python repo (`better-prompt`)
rounding out the top 5.
```
**Status:** ✅ Success — **END-TO-END WORKING** 🎯  
**What happened:** Claude Code called `mcp__coral__search_catalog`, found `github.user` and `github.user_repos`, ran the correct SQL, got real data, returned a formatted answer.  
**Latency:** ~5 seconds end-to-end.

---

## 5. Summary Table

| # | Command | Status | Issue / Note |
|---|---------|--------|--------------|
| 1 | `coral --version` | ✅ | `0.4.1+43d8309` |
| 2 | `coral --help` | ✅ | All subcommands confirmed |
| 3 | `coral source list` (empty) | ✅ | Clean slate |
| 4 | `coral source --help` | ✅ | Subcommands confirmed |
| 5 | `coral source add --help` | ✅ | No `--token` flag — uses env vars |
| 6 | `coral source info github` | ✅ | Needs `GITHUB_TOKEN` env var |
| 7 | `coral features list` | ✅ | No secrets backend toggle available |
| 8 | `coral onboard` | ⚠️ Cancelled | TTY-only wizard, not automatable |
| 9 | `coral source add github` | ✅ | 362 tables, token → keychain |
| 10 | `coral source list` | ✅ | github confirmed |
| 11 | `coral source test github` | ✅ | All tests pass |
| 12 | `SELECT ... FROM github.user` | ✅ | login, name, repo count |
| 13 | `SELECT ... FROM github.repos` | ❌ | Needs `WHERE team_id` — wrong table |
| 14 | `SELECT ... FROM github.user_repos` | ✅ | Correct table for personal repos |
| 15 | `SELECT ... FROM github.pulls WHERE repo = 'owner/repo'` | ❌ | Needs separate `owner` filter |
| 16 | `SELECT ... FROM github.pulls WHERE owner = X AND repo = Y` | ⚠️ Empty | Correct syntax, repo has no PRs |
| 17 | `SELECT ... FROM github.issues (finmate.dev)` | ⚠️ Empty | No issues in repo |
| 18 | `SELECT ... FROM github.issues (oss-pulse)` | ⚠️ Empty | No issues in repo |
| 19 | `SELECT ... FROM github.user_issues` | ⚠️ Empty | No assigned issues for user |
| 20 | `claude --version` | ✅ | `2.1.146` — already installed |
| 21 | `claude mcp list` (before Coral) | ✅ | 14 claude.ai servers, none Coral |
| 22 | `claude mcp add coral -- coral mcp-stdio` | ✅ | Registered, config → `.claude.json` |
| 23 | `claude mcp list \| grep coral` | ✅ | `coral mcp-stdio - ✓ Connected` |
| 24 | `claude -p "..." --output-format text` | ⚠️ Blocked | Needs `--dangerously-skip-permissions` |
| 25 | `claude -p "..." --dangerously-skip-permissions` | ✅ | **FULL E2E WORKING** — real answer via Coral MCP |

---

## 6. Critical Findings for E2B Phase

| Finding | Severity | What to do in E2B |
|---------|----------|-------------------|
| Coral token stored in **system keychain** | 🔴 Blocker | Linux sandbox has no keychain. Must find alternative — test env-only mode or `--secrets file` if it exists |
| `claude -p` needs `--dangerously-skip-permissions` | 🟡 Known | Always include this flag in every sandbox invocation |
| `claude mcp add` config is **project-scoped** to `.claude.json` | 🟡 Known | Run `claude mcp add coral -- coral mcp-stdio` during sandbox setup, or pre-bake in template |
| `github.repos` needs `WHERE team_id` | 🟡 Known | Add to Claude Code system prompt: use `github.user_repos` for personal repos |
| `github.pulls` / `github.issues` need `WHERE owner = X AND repo = Y` | 🟡 Known | Add to Claude Code system prompt: both filters always required |
| Full local loop latency | ✅ Info | ~5 seconds. E2B adds ~3-5s startup → expect ~8-10s per chat response |

---

## 7. Post-Spike Gotcha — MCP Scope Bug

### What happened
Running `claude -p "check my github user data using coral mcp"` from `C:\Users\MY NOTEBOOK\` (home directory) gave this response:

```
If you approve the command above, I can fetch your GitHub user data via the
`gh` CLI. Alternatively, if you can point me to how Coral MCP is set up
(e.g., a config file or install location), I can help get it connected.
```

Claude Code had no idea Coral MCP existed — it didn't load it, fell back to `gh` CLI, and even questioned whether Coral was set up.

### Root cause
`claude mcp add coral -- coral mcp-stdio` registers the MCP in **project-local scope** — it writes to `.claude.json` inside `C:\Users\MY NOTEBOOK\Desktop\coral-flow\`. Claude Code only loads that config when the working directory is `coral-flow\` or a subdirectory of it.

Running from any other directory = Coral MCP invisible.

### Verified via `.claude.json`
```json
"C:/Users/MY NOTEBOOK/Desktop/coral-flow": {
  "mcpServers": {
    "coral": {
      "type": "stdio",
      "command": "coral",
      "args": ["mcp-stdio"]
    }
  }
}
```
Coral is scoped to that one project path.

### Fix for final implementation (E2B)
**Always register Coral MCP with `--scope global`** during sandbox setup:

```bash
claude mcp add coral --scope global -- coral mcp-stdio
```

This writes to `~/.claude.json` (user-level) instead of the project `.claude.json`, making Coral available regardless of which directory `claude -p` is invoked from inside the sandbox.

| Scope | Command | Config location | Works from |
|-------|---------|-----------------|------------|
| Project (current, wrong for E2B) | `claude mcp add coral -- coral mcp-stdio` | `<project>/.claude.json` | Only inside `coral-flow/` |
| **Global (correct for E2B)** | `claude mcp add coral --scope global -- coral mcp-stdio` | `~/.claude.json` | Any directory ✅ |

**Action item:** In the E2B sandbox setup script, use `--scope global` when registering the Coral MCP. Do not rely on a project-scoped config.
