# CoralFlow E2B sandbox template: coralflow-base
# Build:  e2b template build -c "/root/.jupyter/start-up.sh" -d e2b.Dockerfile
#
# MUST be Ubuntu 24.04+ — Coral's binary requires GLIBC >= 2.39 (validated in spike;
# Ubuntu 22.04 ships 2.35 and fails with a GLIBC_2.39 not found error).
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/root
ENV PATH="/root/.local/bin:${PATH}"

# Base deps
RUN apt-get update && apt-get install -y \
    curl ca-certificates gnupg tar git jq python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Node 20 (for opencode)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# Coral CLI (Linux x86_64) — install deterministically to /usr/local/bin.
# (The install.withcoral.com script puts the binary in a home dir that E2B's runtime
# does not keep on PATH, so we extract the release tarball straight to /usr/local/bin
# and verify at build time — a missing coral fails the build loudly.)
RUN set -eux; \
    V=$(curl -s https://api.github.com/repos/withcoral/coral/releases/latest | grep '"tag_name"' | cut -d'"' -f4); \
    curl -fsSL "https://github.com/withcoral/coral/releases/download/${V}/coral-x86_64-unknown-linux-gnu.tar.gz" -o /tmp/c.tgz; \
    mkdir -p /tmp/coralx; tar -xzf /tmp/c.tgz -C /tmp/coralx; \
    BIN=$(find /tmp/coralx -name coral -type f | head -1); \
    cp "$BIN" /usr/local/bin/coral; chmod 755 /usr/local/bin/coral; \
    rm -rf /tmp/c.tgz /tmp/coralx; \
    /usr/local/bin/coral --version

# opencode CLI (agent runner — headless API-key auth, no OAuth)
RUN npm install -g opencode-ai

# Slack action helper for the agent (Coral is read-only)
RUN pip3 install requests --break-system-packages
WORKDIR /workspace
