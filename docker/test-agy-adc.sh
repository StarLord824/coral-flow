#!/bin/bash
# Test: does agy authenticate headlessly via GOOGLE_APPLICATION_CREDENTIALS (service account / ADC)?
# Run:
#   docker run --rm --env-file .env \
#     -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json \
#     -v ".../env_key.json:/tmp/sa.json:ro" \
#     -v ".../test-agy-adc.sh:/workspace/test-agy-adc.sh" \
#     coralflow-spike bash -c "chmod +x test-agy-adc.sh && ./test-agy-adc.sh"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; }
warn() { echo -e "${YELLOW}⚠️${NC}  $1"; }

echo "════ agy ADC (service-account) headless-auth test ════"
echo ""

# Strip API-key vars so we test ONLY the service-account path
unset GEMINI_API_KEY GOOGLE_API_KEY GOOGLE_GENAI_API_KEY ANTIGRAVITY_API_KEY

echo "  GOOGLE_APPLICATION_CREDENTIALS = $GOOGLE_APPLICATION_CREDENTIALS"
if [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "  SA file present: $(jq -r '.client_email' "$GOOGLE_APPLICATION_CREDENTIALS" 2>/dev/null)"
else
    fail "SA file not found at \$GOOGLE_APPLICATION_CREDENTIALS"
    exit 1
fi
echo ""

# Coral MCP config for agy
mkdir -p /root/.config/antigravity
cat > /root/.config/antigravity/mcp_config.json << 'EOF'
{
  "mcpServers": {
    "coral": { "command": "coral", "args": ["mcp-stdio"], "type": "stdio" }
  }
}
EOF

echo "── Running agy -p (30s timeout) ──"
OUT=$(agy -p "Reply with exactly the word: PONG" --print-timeout 30s 2>&1)
echo "--- agy output ---"
echo "$OUT"
echo "------------------"

if echo "$OUT" | grep -qiE 'authentication (required|timed out)|Please visit the URL|oauth'; then
    fail "agy STILL demands OAuth — service-account / ADC path does NOT work either"
elif echo "$OUT" | grep -qi 'PONG'; then
    pass "agy ran headlessly via SERVICE ACCOUNT — agy is viable!"
else
    warn "Inconclusive — no OAuth prompt, but no PONG. Inspect output (may be a quota/permission error)."
fi
