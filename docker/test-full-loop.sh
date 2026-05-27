#!/bin/bash
# THE FULL DEMO LOOP: investigate via Coral MCP → post findings to Slack.
# Proves: data-in (Coral) → reason (opencode+Gemini) → action-out (Slack).
# The agent posts to Slack by running /workspace/slack-notify.py (Coral is read-only).

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
export GEMINI_API_KEY="$KEY" GOOGLE_API_KEY="$KEY" GOOGLE_GENERATIVE_AI_API_KEY="$KEY"
export SLACK_BOT_USER_OAUTH_TOKEN GITHUB_TOKEN SLACK_CHANNEL
MODEL="${OC_MODEL:-google/gemini-3-flash-preview}"

echo "════ FULL DEMO LOOP: Coral → reason → Slack ════"
echo "model=$MODEL"
echo ""

# Coral github source
GITHUB_TOKEN=$GITHUB_TOKEN coral source add github > /dev/null 2>&1

# opencode + Coral MCP config
mkdir -p /root/.config/opencode
cat > /root/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "bash": "allow", "edit": "allow", "webfetch": "allow" },
  "mcp": { "coral": { "type": "local", "command": ["coral","mcp-stdio"], "enabled": true } }
}
EOF

# Sanity: the notify script works on its own
python3 /workspace/slack-notify.py ":mag: CoralFlow full-loop test starting…" >/dev/null 2>&1 \
  && echo -e "${GREEN}✅${NC} notify script OK" || echo -e "${RED}❌${NC} notify script failed"
echo ""

PROMPT='You are a GitHub activity reporter with two capabilities:
1) A Coral MCP that runs SQL over GitHub. Use these EXACT queries:
   - SELECT login, name, public_repos FROM github.user
   - SELECT full_name, language, updated_at FROM github.user_repos WHERE owner = '\''<login from previous>'\'' ORDER BY updated_at DESC LIMIT 3
2) A shell. To post to Slack, run:  python3 /workspace/slack-notify.py "<your message>"

Steps: run the two Coral queries, then post a 2-3 sentence activity summary to Slack using the script. Confirm when the Slack post succeeds. Be concise.'

CAP="${LOOP_TIMEOUT:-180}"
echo "── running full loop (cap ${CAP}s) ──"
OUT=$(timeout "$CAP" opencode run --model "$MODEL" "$PROMPT" 2>&1)
RC=$?
echo "$OUT"
echo ""
echo "════════════════════════════════════"
echo "[exit=$RC]"
CORAL_CALLS=$(echo "$OUT" | grep -ciE 'coral_sql|coral_')
SLACK_CALL=$(echo "$OUT" | grep -ciE 'slack-notify|posted to|chat.postMessage|bash')

if [ $RC -eq 124 ]; then
    echo -e "${RED}❌ timed out${NC} (quota or too many steps)"
elif echo "$OUT" | grep -qiE 'RESOURCE_EXHAUSTED|429'; then
    echo -e "${RED}❌ quota error${NC}"
elif echo "$OUT" | grep -qiE 'posted to|ts=|success|sent'; then
    echo -e "${GREEN}✅ FULL LOOP WORKED${NC} — Coral calls=$CORAL_CALLS. Check #${SLACK_CHANNEL:-incidents-alerts} for the agent's summary 🎉"
else
    echo -e "${YELLOW}⚠️ Inspect output${NC} — Coral calls=$CORAL_CALLS. Did a Slack message arrive? Check the channel."
fi
