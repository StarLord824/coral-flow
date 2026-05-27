#!/bin/bash
# Quick quota check across the models we've been using
KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
for M in gemini-3-flash-preview gemini-2.5-flash gemini-2.5-flash-lite gemma-4-31b-it; do
  R=$(timeout 25 curl -sS \
    "https://generativelanguage.googleapis.com/v1beta/models/$M:generateContent?key=$KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"hi"}]}]}' -w "|%{http_code}")
  CODE="${R##*|}"
  if [ "$CODE" = "200" ]; then echo "✅ $M → HTTP 200 (quota OK)"; else
    echo "❌ $M → HTTP $CODE ($(echo "${R%|*}" | jq -r '.error.status' 2>/dev/null))"; fi
done
