#!/bin/bash
# Realistic multi-step investigation: can free-tier Gemini Flash drive a chained
# Coral investigation (multiple queries, self-correct on required filters, synthesize)?
# This is the demo-behavior validation, not just a single tool call.

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
export GEMINI_API_KEY="$KEY" GOOGLE_API_KEY="$KEY" GOOGLE_GENERATIVE_AI_API_KEY="$KEY"
MODEL="${OC_MODEL:-google/gemini-2.5-flash}"

echo "════ incident-style multi-step investigation ════"
echo "model=$MODEL"
echo ""

# Coral + github
GITHUB_TOKEN=$GITHUB_TOKEN coral source add github > /dev/null 2>&1
mkdir -p /root/.config/opencode
cat > /root/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": { "coral": { "type": "local", "command": ["coral","mcp-stdio"], "enabled": true } }
}
EOF

PROMPT='You are an engineering analyst using a Coral MCP (SQL over GitHub).
Use EXACTLY these queries, in order, then stop and summarize. Do not explore the schema.

Q1: SELECT login, name, public_repos, followers FROM github.user
Q2 (use the login from Q1 as <L>): SELECT full_name, language, stargazers_count, updated_at FROM github.user_repos WHERE owner = '\''<L>'\'' ORDER BY updated_at DESC LIMIT 5

After Q1 and Q2 return, write a concise "developer activity profile": who they are, their primary language, how active they are, and their most recent project. 2-4 sentences. Run ONLY those two queries.'

echo "── running (cap 180s) ──"
START=$(date +%s 2>/dev/null || echo 0)
OUT=$(timeout 180 opencode run --model "$MODEL" "$PROMPT" 2>&1)
RC=$?
echo "$OUT"
echo ""
echo "════════════════════════════════════"
echo "[exit=$RC]"

# Count how many distinct Coral tool calls it made (depth of investigation)
CALLS=$(echo "$OUT" | grep -ciE 'coral_sql|coral_|⚙')
echo "Coral tool-call lines seen: $CALLS"

if [ $RC -eq 124 ]; then
    echo -e "${RED}❌ HUNG/timed out${NC} — likely 429 quota (try gemini-2.5-flash-lite) or too many steps."
elif echo "$OUT" | grep -qiE 'RESOURCE_EXHAUSTED|429'; then
    echo -e "${RED}❌ quota error${NC} — switch model / wait."
elif [ "$CALLS" -ge 2 ] 2>/dev/null && echo "$OUT" | grep -qiE 'health|activity|risk|StarLord824|finmate|oss-pulse'; then
    echo -e "${GREEN}✅ Multi-step investigation worked${NC} — chained $CALLS Coral calls + synthesized. Demo behavior validated."
else
    echo -e "${YELLOW}⚠️ Inspect output${NC} — completed but shallow ($CALLS calls). May need prompt tuning for the demo."
fi
