-- CoralFlow schema. Apply to the Supabase Postgres (auth schema is managed by Supabase).
-- One workspace per user (v1). An agent = one E2B sandbox with N Coral sources.

create extension if not exists "pgcrypto";

-- ─── workspaces ───────────────────────────────────────────────────────────
create table if not exists public.workspaces (
    id            uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users (id) on delete cascade,
    name          text not null default 'My workspace',
    created_at    timestamptz not null default now(),
    unique (owner_user_id)            -- 1:1 for v1
);

-- ─── agents (one sandbox per agent) ─────────────────────────────────────────
create table if not exists public.agents (
    id             uuid primary key default gen_random_uuid(),
    workspace_id   uuid not null references public.workspaces (id) on delete cascade,
    name           text not null default 'investigator',
    model          text not null default 'openrouter/moonshotai/kimi-k2.6',
    sandbox_id     text,
    sandbox_state  text not null default 'cold',   -- cold | spawning | ready | dead
    last_active_at timestamptz,
    created_at     timestamptz not null default now()
);
create index if not exists agents_workspace_idx on public.agents (workspace_id);

-- ─── agent_sources (Coral data sources connected to an agent) ───────────────
-- Encrypted token at rest; only last4 shown to the UI. source_type 'slack' here
-- means the OUT action (bot token); read sources are github/sentry/linear/etc.
create table if not exists public.agent_sources (
    id               uuid primary key default gen_random_uuid(),
    agent_id         uuid not null references public.agents (id) on delete cascade,
    source_type      text not null,                 -- github | sentry | linear | slack | ...
    scope            text,
    token_ciphertext bytea,                          -- AES-GCM (nonce||ct)
    token_last4      text,
    connected        boolean not null default false,
    created_at       timestamptz not null default now(),
    unique (agent_id, source_type)
);
create index if not exists agent_sources_agent_idx on public.agent_sources (agent_id);

-- ─── chat_messages ──────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
    id            uuid primary key default gen_random_uuid(),
    agent_id      uuid not null references public.agents (id) on delete cascade,
    role          text not null,                     -- user | assistant | tool
    content       text not null default '',
    evidence_json jsonb,
    created_at    timestamptz not null default now()
);
create index if not exists chat_messages_agent_idx on public.chat_messages (agent_id, created_at);

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- The browser uses the anon key and must only see its own rows. The backend uses
-- the direct Postgres connection (superuser) which bypasses RLS and enforces
-- workspace scoping in its queries.
alter table public.workspaces    enable row level security;
alter table public.agents        enable row level security;
alter table public.agent_sources enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "own workspace" on public.workspaces;
create policy "own workspace" on public.workspaces
    for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists "own agents" on public.agents;
create policy "own agents" on public.agents
    for all using (workspace_id in (select id from public.workspaces where owner_user_id = auth.uid()));

drop policy if exists "own agent_sources" on public.agent_sources;
create policy "own agent_sources" on public.agent_sources
    for all using (agent_id in (
        select a.id from public.agents a
        join public.workspaces w on w.id = a.workspace_id
        where w.owner_user_id = auth.uid()));

drop policy if exists "own chat_messages" on public.chat_messages;
create policy "own chat_messages" on public.chat_messages
    for all using (agent_id in (
        select a.id from public.agents a
        join public.workspaces w on w.id = a.workspace_id
        where w.owner_user_id = auth.uid()));

-- ─── new-user trigger: auto-create a workspace + default agent ──────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    ws_id uuid;
begin
    insert into public.workspaces (owner_user_id, name)
        values (new.id, coalesce(new.raw_user_meta_data->>'name', 'My') || '''s workspace')
        returning id into ws_id;
    insert into public.agents (workspace_id, name)
        values (ws_id, 'investigator');
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
