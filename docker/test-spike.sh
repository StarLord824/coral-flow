#!/bin/bash
# CoralFlow Docker Spike — checkpoint runner
# Covers: Coral on Linux (keychain test), Antigravity CLI, mcp_config.json, agy -p e2e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC} — $1"; }
info() { echo -e "${BLUE}ℹ️  INFO${NC} — $1"; }

echo ""
echo "════════════════════════════════════════════════════"
echo "  CoralFlow Docker Spike — Ubuntu 22.04 Container  "
echo "════════════════════════════════════════════════════"
echo ""

# ── CP1: Coral installed ──────────────────────────────────────────────────────
echo "── CP1: Coral version ───────────────────────────────"
CORAL_VER=$(coral --version 2>/dev/null)
if [ $? -eq 0 ]; then
    pass "Coral installed: $CORAL_VER"
else
    fail "Coral not found in PATH"
    exit 1
fi
echo ""

# ── CP2: coral source add github — THE KEYCHAIN TEST ─────────────────────────
echo "── CP2: coral source add github (keychain-less Linux) "
[ -z "$GITHUB_TOKEN" ] && { fail "GITHUB_TOKEN not set"; exit 1; }

info "Running: GITHUB_TOKEN=*** coral source add github"
info "Watch for 'secrets: keychain' vs an error vs a fallback backend"
echo "---"
GITHUB_TOKEN=$GITHUB_TOKEN coral source add github 2>&1
CORAL_ADD_EXIT=$?
echo "---"

if [ $CORAL_ADD_EXIT -eq 0 ]; then
    pass "coral source add github succeeded on Linux"
    coral source list
else
    fail "coral source add github FAILED (exit $CORAL_ADD_EXIT)"
    warn ">>> This is the keychain blocker. Options to try manually:"
    warn "    1. apt install gnome-keyring libsecret-1-0 && dbus-run-session coral source add github"
    warn "    2. Check if CORAL_SECRETS_BACKEND env var exists"
    warn "    3. Check coral source add --help for a --secrets flag"
fi
echo ""

# ── CP3: coral sql query ──────────────────────────────────────────────────────
echo "── CP3: coral sql — verify data returns ─────────────"
coral sql "SELECT login, name, public_repos FROM github.user LIMIT 1" 2>&1
[ $? -eq 0 ] && pass "coral sql returned data" || fail "coral sql failed"
echo ""

# ── CP4: Claude Code installed ───────────────────────────────────────────────
echo "── CP4: Claude Code version ─────────────────────────"
CLAUDE_VER=$(claude --version 2>/dev/null)
if [ $? -eq 0 ]; then
    pass "Claude Code installed: $CLAUDE_VER"
else
    fail "claude not found in PATH — check install output above"
    exit 1
fi
echo ""

# ── CP5: Register Coral MCP globally ─────────────────────────────────────────
echo "── CP5: Register Coral MCP (global scope) ───────────"
claude mcp add coral --scope user -- coral mcp-stdio 2>&1
claude mcp list 2>&1 | grep -i coral
if claude mcp list 2>&1 | grep -qi 'coral'; then
    pass "Coral MCP registered (user scope, available from any dir)"
else
    fail "Coral MCP not registered"
fi
echo ""

# ── CP6: claude -p end-to-end via Coral MCP (HEADLESS AUTH TEST) ─────────────
echo "── CP6: claude -p end-to-end (ANTHROPIC_API_KEY) ────"
[ -z "$ANTHROPIC_API_KEY" ] && {
    fail "ANTHROPIC_API_KEY not set — get one from console.anthropic.com"
    exit 1
}
export ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY

info "Running claude -p with Coral MCP (verifying headless API-key auth)..."
CLAUDE_OUT=$(claude -p "Using the coral MCP tool, query github.user_repos and list my 3 most recently updated repositories with their languages. Return plain text." --dangerously-skip-permissions 2>&1)
echo "$CLAUDE_OUT"
echo "---"
if echo "$CLAUDE_OUT" | grep -qiE 'invalid.*api.key|authentication.error|login|oauth|please run|/login'; then
    fail "claude -p auth FAILED — ANTHROPIC_API_KEY did not authenticate headlessly"
elif echo "$CLAUDE_OUT" | grep -qiE 'StarLord824|finmate|oss-pulse|repositor'; then
    pass "claude -p end-to-end WORKED headless inside Docker (real answer via Coral MCP)"
else
    warn "Inconclusive — no auth error but no recognizable answer. Inspect output above."
fi
echo ""

# ── CP7: Slack notification script ───────────────────────────────────────────
echo "── CP7: Slack notification script ───────────────────"
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    warn "SLACK_WEBHOOK_URL not set — skipping Slack test"
else
    python3 /workspace/slack-notify.py "CoralFlow Docker spike test: CP7 Slack notification working ✅"
    [ $? -eq 0 ] && pass "Slack notification sent" || fail "Slack notification failed"
fi
echo ""

echo "════════════════════════════════════════════════════"
echo "  Spike complete — review results above"
echo "════════════════════════════════════════════════════"
