Pirates of the
Coral-bean
Hoist the Jolly Roger and set sail on the high seas of data! Build agents that query any API, database, or file as SQL, powered by Coral. No ETL, no warehouse, no glue code. Just you, your crew, and the open ocean of data.

Treasure
$10,000+
Dates
May 25 – May 31
Ends In
4d
7h
19m
49s
🏴‍☠️ Register Now
📜 Submit Project
Star Coral
coral-query.sql
-- Find root cause across 3 tools in one query

SELECT g.title, s.error_message, sl.text

FROM github.pull_requests g

JOIN sentry.issues s

ON s.first_seen >= g.merged_at

JOIN slack.messages sl

ON sl.channel = '#incidents'

WHERE s.level = 'fatal'

ORDER BY s.first_seen DESC;

→
3 sources joined. 0 glue code. 100% local.
▊
Overview
Rules
Resources
Schedule
Why Set Sail?
In a world where AI agents need data from every corner of the seven seas, there's only one tool that lets them query it all as SQL.

Building agents with MCP servers, CLI tools, and API wrappers? Every data source is a separate voyage. Your agent hops between them one at a time, stuffing the context window with raw responses, burning tokens at every port.

Coral gives your agent one map for all the seas. One SQL query. Multiple sources. Cross-source JOINs. Auth, pagination, rate limits, all handled below deck. The data resolves inside Coral, not inside your agent's head.

One install. One query language. $10,000+ in treasure. ☠️

Query Anything as SQL
Any API, database, or file becomes a SQL table. No custom integrations needed.

Cross-Source Joins
Join GitHub + Slack + Sentry in a single query. Coral handles auth, pagination, and rate limits.

100% Local
Credentials, data, and usage history never leave your machine. No ETL, no warehouse.

CLI or MCP
Run Coral from the command line or through MCP. Schema learning and caching built in.

The Treasure Map
Two paths to glory on the high seas of data. Choose your adventure.

Track 1: Build an Enterprise Agent
Arm your organisation with a smarter crew

Build an agent that retrieves data across multiple sources using Coral to solve a real problem for an organisation. Showcase how Coral powers it.

Example Voyages

Coding Agent Debugger
· GitHub + Sentry + Slack + Datadog
Agent joins failed CI builds with error logs, service metrics, and related team discussions to diagnose root cause in one query.

AI SRE Investigator
· PagerDuty + Datadog + GitHub + StatusGator
Agent correlates high-urgency incidents with recent deploys, metrics, and third-party service status to auto-generate incident summaries.

Sprint Health Dashboard
· Linear + GitHub + Slack + Confluence
Agent joins open issues with PR status, relevant threads, and project docs to show what's blocked and what's in review.

Customer Escalation Agent
· Intercom + Sentry + Grafana + Slack
Agent joins open tickets with error spikes, service health dashboards, and internal discussions so support crews get full technical context without pinging engineering.

Security & Compliance Monitor
· GitHub + Slack + Notion + OSV*
Agent surfaces risky access changes, secrets in commits, and cross-references them with known CVE databases and internal policy docs.

Track 2: Build a Personal Agent
Every pirate needs a first mate

Build an agent that makes your personal workflow more productive. Connect the tools you use every day. Coral handles the rest.

Example Voyages

"What should I work on?" Assistant
· Gmail* + Google Calendar* + Notion
Agent checks your inbox, calendar, and notes to prioritise your morning.

Content Creator Dashboard
· YouTube* + Twitter* + Discord*
Agent tracks your views, engagement, and community activity across platforms in one query.

Open Source Maintainer's First Mate
· GitHub + Slack
Agent triages new issues, identifies duplicates, and drafts release notes from merged PRs.

Personal Health Monitor
· Apple Health* + Google Sheets* + Notion
Agent correlates your sleep, steps, and workout data with mood logs to spot patterns.

Study Planner Agent
· Google Calendar* + Notion + Google Drive*
Agent joins your class schedule, study notes, and assignments to tell you what's due, what to revise, and what you're behind on.

* Source not built yet? Build it yourself and earn a special bounty!

Custom Source Spec Guide
⚔️ See Special Bounties
The Treasure Chest
$10,000+ in gold doubloons and bounties for the bravest pirates on the data seas.

🎓 Top winners also get a personal mentorship session with Kunal Kushwaha.

Captain's Bounty
One winning crew per track. Each crew can have up to 4 members.

Every teammate gets their own prize. No splitting treasure!
Track 1: Enterprise Agent
⚔️
MacBook Neo
Best Enterprise Agent Winners

One MacBook Neo for every teammate (up to 4)

Track 2: Personal Agent
🧭
Apple iPad
Best Personal Agent Winners

One Apple iPad for every teammate (up to 4)

+ exclusive swag for all winners
Early Bird · Register Now
Register early, win before the voyage even begins!
Form your team and register by May 18th. One random team picked will receive ₹5,000 / $50 Amazon Gift Card per teammate (up to 4 members). Fair winds to the early birds!

Register Now →
⚔️ Special Bounties
Beyond the main prizes, earn extra treasure through these challenges.

Early Bird Swag: 10 Lucky Social Sharers
Register early and share on social media (LinkedIn / X) tagging Coral. 10 random pirates will be picked from everyone who spread the word and get a swag box shipped to them.

📦 10 Random Posts → Coral Swag Box
Tell the Tale: Discord Showcase + Social Post
Share your voyage in the Coral Discord #show-and-tell with screenshots and a write-up, then post it on at least one social platform (LinkedIn / X) tagging Coral. Show the world what you plundered.

🏆 Best 50 showcases → Claude Max 5x 1-month vouchers. Top entries will be highlighted on Kunal Kushwaha's YouTube channel (870,000+ subscribers).
Chart New Waters: Build a Source Spec
Need a source that doesn't exist yet? Build it. Any new source spec that gets reviewed and accepted by the Coral crew earns a bounty, whether it's from the track examples above (Gmail, Google Calendar, Discord, LinkedIn) or something completely new. Every new source grows the reef.

How to write a custom source spec →
🐠 Top 10 source specs → $100 cash + $50 donation to sea life charity
Captain's Log: End-to-End "How to Build X" Guides
Write a 2-3 page reproducible guide (a blog post) that any pirate can follow. e.g. "I built a customer success dashboard with Claude Code + Coral, here's the route." Make sure it's published as a blog that's shareable.

⌨️ Best guides → Keychron mechanical keyboard
Join the Crew 🏴‍☠️
Ready to set sail? Register and start building!

Sponsor
Coral
Open-source query layer for agents
Check out Coral
Coral is an open-source query layer for agents. Any API, database, or file becomes a SQL table. Write one query across all of them. Coral handles auth, pagination, rate limits, and schema mapping.

Run Coral from CLI or over MCP. Everything runs locally.

Quickstart

terminal
$ brew install withcoral/tap/coral

$ coral source add [your source]

# start querying

Docs
Discord
GitHub
Judging Criteria
🏴‍☠️ Potential Impact
How effectively does the project address a meaningful problem using Coral's data retrieval capabilities?

⚓ Creativity & Originality
How unique is the idea? How creatively is Coral used to solve problems across multiple data sources?

🗺️ Learning & Growth
The learning curve tackled during the hackathon, especially for first-time Coral users.

⚔️ Technical Implementation
How well was the idea executed technically? Quality of integration with Coral and SQL queries.

🎨 Aesthetics & UX
How intuitive and user-friendly is the final experience? Frontend, CLI, or agent interface.

🪸 Best Use of Coral
How effectively does the project leverage Coral's SQL interface, cross-source joins, and caching?