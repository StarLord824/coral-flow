#!/bin/bash
# Test: does opencode authenticate headlessly via a Gemini API key (no OAuth)
# and answer via the Coral MCP?
# Run:
#   docker run --rm --env-file .env \
#     -v ".../test-opencode.sh:/workspace/test-opencode.sh" \
#     coralflow-spike bash -c "chmod +x test-opencode.sh && ./test-opencode.sh"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; }
warn() { echo -e "${YELLOW}⚠️${NC}  $1"; }
info() { echo -e "${BLUE}ℹ️${NC}  $1"; }

echo "════ opencode + Gemini headless test ════"
echo ""

# ── A: opencode installed ────────────────────────────────────────────────────
OC_VER=$(opencode --version 2>/dev/null)
[ $? -eq 0 ] && pass "opencode installed: $OC_VER" || { fail "opencode not found"; exit 1; }
echo ""

# ── B: API key present ───────────────────────────────────────────────────────
# The .env may have the AIza key under GEMINI_API_KEY. Mirror it to every name
# opencode's Google provider might read, so we empirically find what works.
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
if [ -z "$KEY" ] || [[ "$KEY" != AIza* ]]; then
    fail "No valid AIza... Gemini key found in GEMINI_API_KEY or GOOGLE_API_KEY"
    exit 1
fi
export GEMINI_API_KEY="$KEY"
export GOOGLE_API_KEY="$KEY"
export GOOGLE_GENERATIVE_AI_API_KEY="$KEY"
info "Gemini key mirrored to GEMINI_API_KEY / GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY (${KEY:0:6}…${KEY: -4})"
echo ""

# ── C: connect Coral github source ───────────────────────────────────────────
GITHUB_TOKEN=$GITHUB_TOKEN coral source add github > /dev/null 2>&1
coral source list 2>&1 | grep -qi github && pass "Coral github source connected" || warn "Coral github source not connected"
echo ""

# ── D: write opencode config with Coral MCP ──────────────────────────────────
mkdir -p /root/.config/opencode
cat > /root/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coral": {
      "type": "local",
      "command": ["coral", "mcp-stdio"],
      "enabled": true
    }
  }
}
EOF
pass "opencode.json written with Coral MCP (~/.config/opencode/opencode.json)"
echo ""

# ── E: discover available Google models ──────────────────────────────────────
echo "── available google models ──"
opencode models google 2>&1 | head -20
echo ""

# ── F: headless run via Gemini + Coral MCP ───────────────────────────────────
echo "── opencode run (headless) ──"
# Pick a model from the list above if this one 404s.
MODEL="${OC_MODEL:-google/gemini-2.5-pro}"
info "Using model: $MODEL"
OUT=$(opencode run --model "$MODEL" "Use the coral MCP tool to query github.user_repos and list my 3 most recently updated repositories with their languages. Plain text only." 2>&1)
echo "--- opencode output ---"
echo "$OUT"
echo "-----------------------"

if echo "$OUT" | grep -qiE 'oauth|please visit|login required|authenticate|auth login|no such model|unknown model|model not found'; then
    if echo "$OUT" | grep -qiE 'no such model|unknown model|model not found'; then
        warn "Model name wrong — pick one from the 'available google models' list and rerun with OC_MODEL=..."
    else
        fail "opencode demanded auth/OAuth — Gemini key did NOT authenticate headlessly"
    fi
elif echo "$OUT" | grep -qiE 'StarLord824|finmate|oss-pulse|repositor'; then
    pass "opencode end-to-end WORKED headless via Gemini + Coral MCP 🎉"
else
    warn "Inconclusive — no auth/model error but no recognizable answer. Inspect output above."
fi
