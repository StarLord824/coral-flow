#!/bin/bash
# Isolate the Gemini key from opencode entirely. Raw curl to the Generative
# Language API. If THIS works, the key is good and opencode is the issue.
# If this fails/hangs, the key or API access is the root cause.

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
echo "════ raw Gemini API key test ════"
echo "key=${KEY:0:6}…${KEY: -4} (len ${#KEY})"
echo ""

# 1) List models the key can access (decisive on key validity + API enablement)
echo "── 1: GET /models (cap 20s) ──"
timeout 20 curl -sS "https://generativelanguage.googleapis.com/v1beta/models?key=$KEY" \
  -o /tmp/models.json -w "HTTP %{http_code}\n"
echo "rc=$?"
echo "first models / error:"
jq -r 'if .error then "ERROR: \(.error.code) \(.error.status) — \(.error.message)" else (.models[0:3][].name) end' /tmp/models.json 2>/dev/null || head -c 400 /tmp/models.json
echo ""

# 2) Actually generate content (the call opencode makes)
echo "── 2: POST generateContent gemini-2.5-pro (cap 30s) ──"
timeout 30 curl -sS \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=$KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Reply with exactly: PONG"}]}]}' \
  -o /tmp/gen.json -w "HTTP %{http_code}\n"
RC=$?
echo "rc=$RC"
if [ $RC -eq 124 ]; then
    echo -e "${RED}❌ generateContent HUNG${NC} — network/region block to generativelanguage.googleapis.com?"
elif jq -e '.candidates' /tmp/gen.json >/dev/null 2>&1; then
    echo -e "${GREEN}✅ KEY WORKS${NC} — response:"
    jq -r '.candidates[0].content.parts[0].text' /tmp/gen.json
    echo "   → Key is good. opencode config is the problem, not the key."
else
    echo -e "${RED}❌ API error:${NC}"
    jq -r '.error | "  \(.code) \(.status) — \(.message)"' /tmp/gen.json 2>/dev/null || head -c 600 /tmp/gen.json
fi
echo ""
echo "════ done ════"
