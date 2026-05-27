#!/bin/bash
# Discover Gemma models on this key + confirm they generate (higher free-tier quota)
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
echo "key=${KEY:0:6}…${KEY: -4}"
echo ""

echo "── Gemma models the key can list ──"
timeout 20 curl -sS "https://generativelanguage.googleapis.com/v1beta/models?key=$KEY" \
  | jq -r '.models[].name' 2>/dev/null | grep -i gemma
echo ""

echo "── generateContent test on candidate Gemma IDs ──"
for M in gemma-4-31b-it gemma-4-26b-a4b-it; do
  echo "── $M ──"
  timeout 30 curl -sS \
    "https://generativelanguage.googleapis.com/v1beta/models/$M:generateContent?key=$KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Reply with exactly: PONG"}]}]}' \
    -w "HTTP %{http_code}\n" \
  | jq -r 'if .error then "ERROR \(.error.code) \(.error.status) — \(.error.message[0:70])" else .candidates[0].content.parts[0].text end' 2>/dev/null
done
