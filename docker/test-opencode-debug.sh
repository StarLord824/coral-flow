#!/bin/bash
# Isolate WHERE opencode hangs. Every step is wrapped in `timeout` so nothing
# can hang forever. Run steps in order; first one that hangs = the culprit.

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅${NC} $1"; }
fail() { echo -e "${RED}❌${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC}  $1"; }
info() { echo -e "${BLUE}ℹ️${NC}  $1"; }

KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
export GEMINI_API_KEY="$KEY"
export GOOGLE_API_KEY="$KEY"
export GOOGLE_GENERATIVE_AI_API_KEY="$KEY"
MODEL="${OC_MODEL:-google/gemini-2.5-pro}"

echo "════ opencode hang-isolation ════"
echo "model=$MODEL  key=${KEY:0:6}…${KEY: -4}"
echo ""

# ── STEP 1: opencode run, NO MCP, trivial prompt (60s cap) ───────────────────
# Remove any MCP config so this is pure opencode+Gemini.
rm -f /root/.config/opencode/opencode.json
echo "── STEP 1: opencode run WITHOUT MCP (cap 60s) ──"
OUT1=$(timeout 60 opencode run --model "$MODEL" "Reply with exactly: PONG" 2>&1)
RC1=$?
echo "$OUT1"
echo "[exit=$RC1]"
if [ $RC1 -eq 124 ]; then
    fail "STEP 1 HUNG → opencode/Gemini auth itself is the problem (not MCP)."
    echo "   Likely: opencode waiting on interactive auth, or wrong key env var, or model needs different provider setup."
    exit 1
elif echo "$OUT1" | grep -qi 'PONG'; then
    pass "STEP 1 OK → opencode + Gemini work headless. MCP is the suspect."
else
    warn "STEP 1 no PONG but didn't hang — inspect output. exit=$RC1"
fi
echo ""

# ── STEP 2: can coral mcp-stdio even start? (5s cap, expect it to wait on stdin)
echo "── STEP 2: coral mcp-stdio starts? (cap 5s) ──"
echo "" | timeout 5 coral mcp-stdio > /tmp/coral_mcp.log 2>&1
RC2=$?
head -5 /tmp/coral_mcp.log
if [ $RC2 -eq 124 ]; then
    info "coral mcp-stdio stayed alive waiting for input (NORMAL for a stdio server)."
else
    warn "coral mcp-stdio exited on its own (rc=$RC2) — check log above."
fi
echo ""

# ── STEP 3: opencode run WITH Coral MCP (cap 90s) ────────────────────────────
mkdir -p /root/.config/opencode
cat > /root/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coral": { "type": "local", "command": ["coral", "mcp-stdio"], "enabled": true }
  }
}
EOF
GITHUB_TOKEN=$GITHUB_TOKEN coral source add github > /dev/null 2>&1
echo "── STEP 3: opencode run WITH Coral MCP (cap 90s) ──"
OUT3=$(timeout 90 opencode run --model "$MODEL" "Use the coral MCP to query github.user and tell me my login. One line." 2>&1)
RC3=$?
echo "$OUT3"
echo "[exit=$RC3]"
if [ $RC3 -eq 124 ]; then
    fail "STEP 3 HUNG → the Coral MCP handshake is what hangs opencode."
    echo "   Next: try MCP without 'enabled' nuances, or check opencode MCP stdio compatibility."
elif echo "$OUT3" | grep -qiE 'StarLord824'; then
    pass "STEP 3 OK → opencode + Gemini + Coral MCP all work headless 🎉"
else
    warn "STEP 3 finished (exit=$RC3) but no login found — inspect output."
fi
echo ""
echo "════ isolation complete ════"
