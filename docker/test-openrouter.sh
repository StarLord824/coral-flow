#!/bin/bash
# Raw check: OpenRouter key + Kimi K2.6 free — validity, quota, and tool-calling support.
KEY="$OPENROUTER_API_KEY"
MODEL="${OR_MODEL:-moonshotai/kimi-k2.6:free}"
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo "════ OpenRouter raw check ════"
[ -z "$KEY" ] && { echo -e "${RED}❌ OPENROUTER_API_KEY not set${NC}"; exit 1; }
echo "key=${KEY:0:10}…  model=$MODEL"
echo ""

# 1) basic completion
echo "── 1: basic chat completion ──"
R=$(timeout 40 curl -sS https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly: PONG\"}]}")
echo "$R" | jq -r 'if .error then "ERROR: \(.error.message)" else .choices[0].message.content end' 2>/dev/null || echo "$R" | head -c 300
echo ""

# 2) tool-calling support (does the model emit a tool_call?)
echo "── 2: tool-calling test ──"
R2=$(timeout 40 curl -sS https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"What is the GitHub login? Use the tool.\"}],\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"get_login\",\"description\":\"Returns the GitHub login\",\"parameters\":{\"type\":\"object\",\"properties\":{}}}}],\"tool_choice\":\"auto\"}")
if echo "$R2" | jq -e '.choices[0].message.tool_calls' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ model emits tool_calls${NC} — agentic tool use supported"
    echo "$R2" | jq -r '.choices[0].message.tool_calls[0].function.name'
else
    echo -e "${RED}⚠️ no tool_calls in response${NC} — check if model supports function calling:"
    echo "$R2" | jq -r 'if .error then "ERROR: \(.error.message)" else .choices[0].message.content[0:120] end' 2>/dev/null
fi
echo ""
echo "════ done ════"
