# app/connector_map.py
"""
Maps each Coral source name to the env vars it needs in the sandbox.
Used by _sandbox_env() in sandbox.py to inject credentials at spawn time.

Each entry: source_name -> list of (env_var, label, required)
"""

CONNECTOR_ENV_MAP: dict[str, list[dict]] = {
    "github": [
        {"env": "GITHUB_TOKEN", "label": "Personal Access Token", "required": True},
    ],
    "sentry": [
        {"env": "SENTRY_TOKEN", "label": "Auth Token", "required": True},
        {"env": "SENTRY_ORG", "label": "Organization Slug", "required": True},
    ],
    "linear": [
        {"env": "LINEAR_API_KEY", "label": "API Key", "required": True},
    ],
    "datadog": [
        {"env": "DD_API_KEY", "label": "API Key", "required": True},
        {"env": "DD_APPLICATION_KEY", "label": "Application Key", "required": True},
        {"env": "DD_SITE", "label": "Site (e.g. datadoghq.com)", "required": False},
    ],
    "pagerduty": [
        {"env": "PAGERDUTY_TOKEN", "label": "API Token", "required": True},
    ],
    "slack": [
        {"env": "SLACK_BOT_TOKEN", "label": "Bot OAuth Token (xoxb-)", "required": True},
    ],
    "notion": [
        {"env": "NOTION_API_KEY", "label": "Integration Token", "required": True},
    ],
    "stripe": [
        {"env": "STRIPE_API_KEY", "label": "Secret Key", "required": True},
    ],
    "jira": [
        {"env": "JIRA_URL", "label": "Instance URL", "required": True},
        {"env": "JIRA_USERNAME", "label": "Email", "required": True},
        {"env": "JIRA_API_TOKEN", "label": "API Token", "required": True},
    ],
    "confluence": [
        {"env": "CONFLUENCE_URL", "label": "Instance URL", "required": True},
        {"env": "CONFLUENCE_USERNAME", "label": "Email", "required": True},
        {"env": "CONFLUENCE_API_TOKEN", "label": "API Token", "required": True},
    ],
    "gitlab": [
        {"env": "GITLAB_TOKEN", "label": "Personal Access Token", "required": True},
        {"env": "GITLAB_BASE_URL", "label": "Base URL (self-hosted)", "required": False},
    ],
    "grafana": [
        {"env": "GRAFANA_URL", "label": "Instance URL", "required": True},
        {"env": "GRAFANA_TOKEN", "label": "Service Account Token", "required": True},
    ],
    "clickup": [
        {"env": "CLICKUP_API_KEY", "label": "API Key", "required": True},
    ],
    "intercom": [
        {"env": "INTERCOM_ACCESS_TOKEN", "label": "Access Token", "required": True},
    ],
    "launchdarkly": [
        {"env": "LAUNCHDARKLY_SDK_KEY", "label": "SDK Key", "required": True},
    ],
    "incident_io": [
        {"env": "INCIDENT_IO_API_KEY", "label": "API Key", "required": True},
    ],
    "posthog": [
        {"env": "POSTHOG_API_KEY", "label": "Personal API Key", "required": True},
        {"env": "POSTHOG_HOST", "label": "Host (cloud or self-hosted)", "required": False},
    ],
    "wandb": [
        {"env": "WANDB_API_KEY", "label": "API Key", "required": True},
    ],
    "openobserve": [
        {"env": "OPENOBSERVE_URL", "label": "Instance URL", "required": True},
        {"env": "OPENOBSERVE_USERNAME", "label": "Username", "required": True},
        {"env": "OPENOBSERVE_PASSWORD", "label": "Password", "required": True},
    ],
    "statusgator": [
        {"env": "STATUSGATOR_API_KEY", "label": "API Key", "required": True},
    ],
    "cloudwatch_logs": [
        {"env": "AWS_ACCESS_KEY_ID", "label": "Access Key ID", "required": True},
        {"env": "AWS_SECRET_ACCESS_KEY", "label": "Secret Access Key", "required": True},
        {"env": "AWS_REGION", "label": "Region", "required": True},
    ],
    "cloudwatch_metrics": [
        {"env": "AWS_ACCESS_KEY_ID", "label": "Access Key ID", "required": True},
        {"env": "AWS_SECRET_ACCESS_KEY", "label": "Secret Access Key", "required": True},
        {"env": "AWS_REGION", "label": "Region", "required": True},
    ],
    # Local sources — no auth needed; Coral reads from the local machine
    "codex": [],
    "claude": [],
}

# Sources that are READ channels (data IN) — these get `coral source add`
CORAL_READ_SOURCES: set[str] = {k for k, v in CONNECTOR_ENV_MAP.items()}

# Slack is special: Coral's slack source reads messages FROM Slack (data IN),
# but the bot token (SLACK_BOT_USER_OAUTH_TOKEN) also powers the agent's
# action layer (posting RCA via slack-notify.py). Both uses coexist.
# The agent_sources table stores SLACK_BOT_USER_OAUTH_TOKEN under source_type="slack".
