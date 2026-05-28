#!/usr/bin/env python3
"""Slack notification — the agent's "action" step, injected into every sandbox.

Coral is read-only and CANNOT post to Slack, so the agent calls this script to post
its findings via chat.postMessage with a bot token.

Usage: python3 slack-notify.py "message text"
Env:   SLACK_BOT_USER_OAUTH_TOKEN (xoxb-), SLACK_CHANNEL (default: incidents-alerts)

The bot must be invited to the channel (chat:write scope). Posting by channel name
avoids needing channels:read / conversations.list.
"""
import os
import sys

import requests


def post_to_slack(message: str) -> bool:
    token = os.environ.get("SLACK_BOT_USER_OAUTH_TOKEN") or os.environ.get("SLACK_BOT_TOKEN")
    channel = os.environ.get("SLACK_CHANNEL", "incidents-alerts").lstrip("#")
    if not token:
        print("ERROR: SLACK_BOT_USER_OAUTH_TOKEN not set", file=sys.stderr)
        return False

    resp = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {token}"},
        json={"channel": f"#{channel}", "text": message},
        timeout=10,
    )
    data = resp.json()
    if data.get("ok"):
        print(f"Posted to #{channel} (ts={data['ts']})")
        return True
    print(f"Slack post failed: {data.get('error')}", file=sys.stderr)
    return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 slack-notify.py 'message'")
        sys.exit(1)
    sys.exit(0 if post_to_slack(" ".join(sys.argv[1:])) else 1)
