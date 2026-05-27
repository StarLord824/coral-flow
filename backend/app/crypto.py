"""Token encryption.

Per-user source tokens (GitHub PAT, Slack bot token, etc.) are encrypted with
AES-GCM before being written to Supabase. Plaintext exists only transiently in the
orchestrator while injecting tokens into a sandbox, and inside the sandbox itself
(env + Coral's local file store), which is wiped on teardown.
"""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import get_settings


def _key() -> bytes:
    raw = get_settings().token_encryption_key
    if not raw:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY is not configured")
    key = base64.b64decode(raw)
    if len(key) != 32:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY must decode to 32 bytes (AES-256)")
    return key


def encrypt(plaintext: str) -> bytes:
    """Return nonce || ciphertext. The nonce is prepended for self-contained storage."""
    nonce = os.urandom(12)
    ct = AESGCM(_key()).encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ct


def decrypt(blob: bytes) -> str:
    nonce, ct = blob[:12], blob[12:]
    return AESGCM(_key()).decrypt(nonce, ct, None).decode("utf-8")


def last4(token: str) -> str:
    """Safe display value for the UI — never the full token."""
    return token[-4:] if len(token) >= 4 else "????"
