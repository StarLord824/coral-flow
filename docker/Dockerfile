# CoralFlow Spike — Linux test environment
# Ubuntu 24.04 required: Coral binary needs GLIBC 2.39 (22.04 only has 2.35)
# Tests: Coral on Linux (keychain), Antigravity CLI (agy), mcp_config.json, end-to-end agy -p
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/root

# ── Base deps ────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    curl wget ca-certificates gnupg \
    unzip tar \
    python3 python3-pip \
    git jq \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 (needed for some tooling) ────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Coral CLI ────────────────────────────────────────────────────────────────
# Try official install script first, fall back to direct binary download
RUN curl -fsSL https://install.withcoral.com | sh || true
RUN which coral 2>/dev/null || ( \
    CORAL_VERSION=$(curl -s https://api.github.com/repos/withcoral/coral/releases/latest \
        | grep '"tag_name"' | cut -d'"' -f4) && \
    echo "Downloading coral $CORAL_VERSION for Linux x86_64" && \
    curl -fsSL "https://github.com/withcoral/coral/releases/download/${CORAL_VERSION}/coral-x86_64-unknown-linux-gnu.tar.gz" \
        -o /tmp/coral.tar.gz && \
    tar -xzf /tmp/coral.tar.gz -C /usr/local/bin && \
    chmod +x /usr/local/bin/coral && \
    rm /tmp/coral.tar.gz \
)

# ── opencode CLI ─────────────────────────────────────────────────────────────
# Agent runner. Multi-provider; authenticates headlessly via provider API-key
# env vars (no OAuth). Using the user's personal Gemini API key.
# agy (Antigravity) was DROPPED: v1.0.3 has NO headless auth — every path
# (GEMINI_API_KEY, ANTIGRAVITY_API_KEY, GOOGLE_APPLICATION_CREDENTIALS) fell back
# to interactive OAuth. See docs/spike-docker-log.md CP6.
RUN npm install -g opencode-ai
ENV PATH="/root/.local/bin:${PATH}"

# ── Python deps for Slack notification script ────────────────────────────────
RUN pip3 install requests --break-system-packages

# ── Workspace ────────────────────────────────────────────────────────────────
WORKDIR /workspace

# Copy test scripts
COPY test-spike.sh /workspace/test-spike.sh
COPY slack-notify.py /workspace/slack-notify.py
RUN chmod +x /workspace/test-spike.sh

# Default: drop into bash for manual testing
CMD ["/bin/bash"]
