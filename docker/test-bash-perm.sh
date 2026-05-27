#!/bin/bash
# Isolate: does opencode run a BASH command headlessly, or hang on permission?
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
export GEMINI_API_KEY="$KEY" GOOGLE_API_KEY="$KEY" GOOGLE_GENERATIVE_AI_API_KEY="$KEY"
MODEL="${OC_MODEL:-google/gemini-2.5-flash-lite}"
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo "model=$MODEL"

# Config WITH bash allowed
mkdir -p /root/.config/opencode
cat > /root/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "bash": "allow", "edit": "allow", "webfetch": "allow" }
}
EOF
echo "config: $(cat /root/.config/opencode/opencode.json | jq -c .permission)"
echo ""

echo "── opencode run a bash echo (cap 90s) ──"
OUT=$(timeout 90 opencode run --model "$MODEL" 'Run this shell command and report its exact output: echo CORALFLOW_BASH_OK_12345' 2>&1)
RC=$?
echo "$OUT"
echo "[exit=$RC]"
if [ $RC -eq 124 ]; then
    echo -e "${RED}❌ HUNG on bash → permission config NOT applied / bash blocked headlessly${NC}"
elif echo "$OUT" | grep -q 'CORALFLOW_BASH_OK_12345'; then
    echo -e "${GREEN}✅ bash runs headlessly${NC} → full-loop timeout was latency, not permission. Bump timeout / faster model."
else
    echo -e "${RED}⚠️ no bash output, no hang${NC} — model may have refused to run bash. Inspect."
fi
