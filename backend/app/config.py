"""Runtime configuration, loaded from environment.

Nothing secret is hard-coded. The orchestrator holds platform-level keys (E2B,
Supabase, the token-encryption key). Per-user source tokens are never stored here —
they are encrypted at rest in Supabase and injected into the sandbox at spawn time.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Platform
    e2b_api_key: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    # Anon/publishable key — used to validate user JWTs against /auth/v1/user.
    supabase_anon_key: str = ""
    # Direct Postgres connection (backend bypasses RLS, scopes by user in queries).
    supabase_direct_conn_string: str = ""

    # AES-GCM key (base64, 32 bytes) used to encrypt per-user source tokens
    token_encryption_key: str = ""

    # E2B sandbox template (pre-baked: coral + opencode + node + python)
    sandbox_template: str = "coralflow-base"
    sandbox_timeout_seconds: int = 900  # E2B idle timeout

    # Agent model — OpenRouter. owl-alpha validated the full multi-step loop end to
    # end; free tiers stalled it. Must be declared in opencode.json's provider block
    # (see sandbox.OPENCODE_CONFIG) since it's not in opencode's built-in catalog.
    agent_model: str = "openrouter/owl-alpha"
    # Hard cap on a single agent run so a stalled/throttled model can't hang forever.
    agent_run_timeout_seconds: int = 240

    default_slack_channel: str = "incidents-alerts"

    # Platform-level OpenRouter key (model auth) used when an agent has no per-agent key.
    openrouter_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
