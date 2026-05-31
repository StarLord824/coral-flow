"""Prompt construction for the investigation agent.

The spike showed open-ended prompts make the model burn 5-10 exploratory tool calls
discovering Coral's schema (it uses `__` for nested columns, and github.pulls/issues
require owner+repo filters), which is slow and exhausts free-tier quota. So we give
the agent tight guidance: resolve identity first, known schema hints, and a clear
action step.
"""

SYSTEM_GUIDANCE = """You are CoralFlow, an incident/activity investigation agent.
You have a Coral MCP that runs read-only SQL across connected sources, and a shell.

Rules:
- FIRST resolve identity: run `SELECT login FROM github.user` and use that login in
  later queries. Never guess a placeholder login.
- Coral columns use `__` for nested fields. `github.pulls` and `github.issues` require
  `WHERE owner = <login> AND repo = <name>`. `github.user_repos` needs no filter.
- Prefer a few precise queries over broad exploration.
- To report findings, run: python3 /workspace/slack-notify.py "<concise summary>"
  (Coral is read-only and cannot post to Slack; this script is your only way to notify.)
- Be concise. Confirm once the Slack message is sent.

Evidence output:
- After your final answer, emit a line in this exact format (no pretty-print, single line):
  EVIDENCE_JSON:{"sources_queried":[...],"key_findings":[...],"sql_queries":[...]}
- `sources_queried`: list of source names you queried (e.g. ["github","sentry"]).
- `key_findings`: list of objects, each with a `type` field and relevant fields:
    github_pr     → number, title, merged_at
    sentry_issue  → id, title, events
    linear_issue  → id, title, state
    pagerduty_incident → id, title, status
    datadog_alert → id, title, status
- `sql_queries`: list of {source, table} objects for every query you ran.
- The line must start with the literal prefix `EVIDENCE_JSON:` with no leading spaces.
- Emit this line after the Slack notification confirmation, at the very end of your response.
"""


import json
import re


def parse_evidence(output: str) -> dict | None:
    """Extract and parse the EVIDENCE_JSON block from agent output.

    Returns the parsed dict, or None if the line is absent or the JSON is invalid.
    """
    for line in output.splitlines():
        if line.startswith("EVIDENCE_JSON:"):
            raw = line[len("EVIDENCE_JSON:"):]
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return None
    return None


def strip_evidence(output: str) -> str:
    """Remove the EVIDENCE_JSON line from agent output so the chat response is clean."""
    return re.sub(r"^EVIDENCE_JSON:.*$\n?", "", output, flags=re.MULTILINE)


def build_investigation_prompt(user_question: str, notify: bool = True) -> str:
    parts = [SYSTEM_GUIDANCE.strip(), "", f"Task: {user_question.strip()}"]
    if notify:
        parts.append(
            "After investigating, post a 2-4 sentence summary of your findings to Slack "
            "using the slack-notify.py script, then confirm."
        )
    return "\n".join(parts)
