#!/bin/bash
# Which Gemini models actually work on this (free-tier) key?
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
echo "key=${KEY:0:6}…${KEY: -4}"
for M in gemini-2.5-flash gemini-2.0-flash gemini-2.5-flash-lite gemini-3-flash-preview; do
  echo "── $M ──"
  timeout 30 curl -sS \
    "https://generativelanguage.googleapis.com/v1beta/models/$M:generateContent?key=$KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Reply with exactly: PONG"}]}]}' \
    -w "HTTP %{http_code}\n" \
  | jq -r 'if .error then "ERROR \(.error.code) \(.error.status) — \(.error.message[0:80])" else .candidates[0].content.parts[0].text end' 2>/dev/null
done
