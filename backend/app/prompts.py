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
"""


def build_investigation_prompt(user_question: str, notify: bool = True) -> str:
    parts = [SYSTEM_GUIDANCE.strip(), "", f"Task: {user_question.strip()}"]
    if notify:
        parts.append(
            "After investigating, post a 2-4 sentence summary of your findings to Slack "
            "using the slack-notify.py script, then confirm."
        )
    return "\n".join(parts)
