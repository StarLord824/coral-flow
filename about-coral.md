Documentation : https://withcoral.com/docs
Github: https://github.com/withcoral/coral
Official Website: https://withcoral.com

Turn every data source into a table. Query them together.
coral source add github

coral source add linear

coral source add slack

coral sql "SELECT * FROM coral.tables LIMIT 6"

schema	table	description
github	pulls	Pull requests merged into a repo
github	issues	Issues and pull requests
linear	issues	Issues tracked in Linear
linear	projects	Projects and initiatives
slack	channels	Slack channels
slack	messages	Messages in a Slack channel
— 3 sources · 18 tables

SELECT m.text, m.author, i.status, i.priority

FROM slack.messages m

JOIN linear.issues i

  ON m.text LIKE '%' || i.key || '%'

WHERE m.channel = '#engineering'

  AND i.status != 'done'

ORDER BY m.ts DESC LIMIT 5;

text	author	status	priority
ENG-1291 is blocking the release	mchen	in_progress	urgent
anyone looking at ENG-1287?	dlee	todo	high
ENG-1280 fix is up for review	asingh	in_review	medium
— Slack × Linear · 3 rows · 190ms

codex mcp add coral -- coral mcp-stdio

claude mcp add coral -- coral mcp-stdio

npx skills add withcoral/skills

✓ Use Coral over MCP or from the CLI

✓ One runtime shared across agents

coral sql "DESCRIBE EXTENDED pagerduty.incidents"

pagerduty.incidents = "Active and historical incidents"

columns

  title       Utf8       incident title

  urgency     Enum       low | high

  service     Utf8       canonical service key

  started_at  Timestamp  incident start

  resolved_at Timestamp  incident end

relationships

  service → datadog.service_health.service

  service → github.deployments.service

  started_at → github.pulls.merged_at (time window)

  resolved_at → github.pulls.merged_at (time window)

recommended join

  github.pulls.merged_at

    BETWEEN pagerduty.incidents.started_at

        AND pagerduty.incidents.resolved_at

— 142 queries · 12 schema hints · 73% cache hit rate

01
Connect your sources

Point Coral at your APIs, databases and files. Each becomes a readonly schema you can explore and query.

02
Query across them with SQL

Use standard SQL with JOINs across any combination of sources. Coral handles auth, pagination, rate limits and schema mapping.

03
Plug it into any agent or framework

Use Coral over MCP or from the CLI. One runtime shared across agents.

04
Turn usage into semantic context

Coral learns relationships, recommended joins, and schema hints from every query.

Works with the tools you already use
Code
Observability & monitoring
Communication
Workflow & incidents
Payments

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe

GitHub

GitLab

LaunchDarkly

Datadog

Sentry

OpenTelemetry

Slack

Intercom

Linear

ClickUp

Incident.io

Stripe
Agents are more accurate and cost efficient with Coral
We benchmarked Coral vs data source MCPs on the complex tasks that typify coding agent workloads. With Coral, Claude Code is ↑ 31% more accurate and ↓ 70% lower cost.

See the full methodology and results.

Directly
With Coral
Accuracy
+31%
Cost
-70%
Built for production agent workloads
Read-only by design
Coral is a read layer, so agents can query across sources without mutating upstream systems. Safety without brittle sandboxing.

Permissions that fit agent workflows
Scoped tokens, workspace isolation, and per-source permissions. Give agents exactly the access they need and nothing more.

Efficient on every query
Query pushdown, caching, and efficient pagination keep queries responsive while reducing unnecessary API calls and token-heavy tool loops.

Adapts to real query patterns
Coral uses query patterns, schema access history, and source statistics to make discovery, caching, and execution better over time.

Give agents the context that changes outcomes

Coding agents

AI SRE

Security & compliance

Customer escalations

Assistants for internal operations
Unblock broken changes by combining PRs, CI failures, and linked issues in one query.

SELECT pr.number, pr.title, ci.failed_step, li.key AS linked_issue

FROM github.pulls pr

JOIN buildkite.builds ci ON ci.commit_sha = pr.head_sha

JOIN linear.issues li ON li.branch_name = pr.head_ref

WHERE ci.state = 'failed'

ORDER BY ci.finished_at DESC LIMIT 10;

number	title	failed_step	linked_issue
1842	reduce retry backoff	integration-tests	ENG-1291
1838	migrate checkout to v2 API	type-check	ENG-1287
1835	add rate limit to webhook	e2e-smoke	ENG-1280
Get started in 60 seconds
Coral is open source under Apache 2.0. Install it, connect a source, and run your first query.

brew
curl
brew install withcoral/tap/coral

Contact us
Explore the docs
Community
GitHub