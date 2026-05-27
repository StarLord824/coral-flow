#!/bin/bash
# Focused test: does agy bypass OAuth when GEMINI_API_KEY is set?
# Run: docker run --rm --env-file .env coralflow-spike bash -c "./test-agy-auth.sh"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; }
warn() { echo -e "${YELLOW}⚠️${NC}  $1"; }

echo "════ agy headless-auth test ════"
echo ""

# Strip conflicting vars — test ONLY ANTIGRAVITY_API_KEY (per Antigravity guidance)
unset GEMINI_API_KEY GOOGLE_API_KEY GOOGLE_GENAI_API_KEY
echo "  (stripped GEMINI_API_KEY / GOOGLE_API_KEY / GOOGLE_GENAI_API_KEY)"
echo "  Testing with ONLY ANTIGRAVITY_API_KEY set."
echo ""

# Show which auth-related vars are present (masked)
for v in GEMINI_API_KEY GOOGLE_API_KEY GOOGLE_GENAI_API_KEY ANTIGRAVITY_API_KEY; do
    val="${!v}"
    if [ -n "$val" ]; then
        echo "  $v = ${val:0:6}…${val: -4} (len ${#val})"
    else
        echo "  $v = (unset)"
    fi
done
echo ""

# Quick key-format sanity check
if [ -n "$GEMINI_API_KEY" ] && [[ "$GEMINI_API_KEY" != AIza* ]]; then
    warn "GEMINI_API_KEY does not start with 'AIza' — may be wrong key type"
fi
echo ""

# Set up Coral MCP config (needed for the agent to answer)
mkdir -p /root/.config/antigravity
cat > /root/.config/antigravity/mcp_config.json << 'EOF'
{
  "mcpServers": {
    "coral": { "command": "coral", "args": ["mcp-stdio"], "type": "stdio" }
  }
}
EOF

# Connect github so the agent has data to query
GITHUB_TOKEN=$GITHUB_TOKEN coral source add github > /dev/null 2>&1

echo "── Running agy -p (10s OAuth timeout to fail fast) ──"
OUT=$(agy -p "Reply with exactly the word: PONG" --print-timeout 30s 2>&1)
echo "--- agy output ---"
echo "$OUT"
echo "------------------"

if echo "$OUT" | grep -qiE 'authentication (required|timed out)|Please visit the URL|oauth'; then
    fail "agy STILL demands OAuth — GEMINI_API_KEY does NOT bypass it in this version"
    echo "    → Decision: agy is not headless-viable. Use Claude Code or another API-key CLI."
elif echo "$OUT" | grep -qi 'PONG'; then
    pass "agy ran headlessly via API key — NO OAuth! agy is viable."
    echo "    → agy + GEMINI_API_KEY works headless. Proceed with agy."
else
    warn "Inconclusive — agy neither asked for OAuth nor returned PONG. Inspect output above."
fi
