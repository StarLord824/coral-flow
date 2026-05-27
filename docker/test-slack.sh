#!/bin/bash
# Test the Slack bot token (xoxb-) via the Web API, isolated from any agent.
# Validates: token (auth.test) → channel lookup (conversations.list) → post (chat.postMessage)
# Accept either env var name
TOKEN="${SLACK_BOT_TOKEN:-$SLACK_BOT_USER_OAUTH_TOKEN}"
CHANNEL="${SLACK_CHANNEL:-incidents-alerts}"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅${NC} $1"; }
fail() { echo -e "${RED}❌${NC} $1"; }

echo "════ Slack bot-token test ════"
if [ -z "$TOKEN" ]; then fail "SLACK_BOT_TOKEN not set in .env"; exit 1; fi
echo "token=${TOKEN:0:8}…  channel=#$CHANNEL"
echo ""

# 1) auth.test — is the token valid? who is the bot?
echo "── 1: auth.test ──"
A=$(curl -sS -H "Authorization: Bearer $TOKEN" https://slack.com/api/auth.test)
echo "$A" | jq -r 'if .ok then "  bot=\(.user)  team=\(.team)  ok=true" else "  ERROR: \(.error)" end'
echo "$A" | jq -e '.ok' >/dev/null 2>&1 || { fail "token invalid"; exit 1; }
pass "token valid"
echo ""

# 2) post directly using channel NAME (no channels:read / conversations.list needed)
echo "── 2: chat.postMessage to #$CHANNEL (by name) ──"
P=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data "{\"channel\":\"#$CHANNEL\",\"text\":\":coral: *CoralFlow spike* — Slack action layer working. Bot can post headlessly. ✅\"}" \
  https://slack.com/api/chat.postMessage)
echo "$P" | jq -r 'if .ok then "  posted ts=\(.ts)" else "  ERROR: \(.error)" end'
if echo "$P" | jq -e '.ok' >/dev/null 2>&1; then
    pass "MESSAGE POSTED — check #$CHANNEL in Slack 🎉"
else
    ERR=$(echo "$P" | jq -r '.error')
    fail "post failed: $ERR"
    [ "$ERR" = "not_in_channel" ] && echo "   → Invite the bot: in Slack #$CHANNEL type: /invite @<botname>"
fi
echo ""
echo "════ done ════"
