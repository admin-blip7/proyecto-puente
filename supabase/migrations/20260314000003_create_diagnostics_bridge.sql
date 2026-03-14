create table if not exists public.diagnostics_bridge_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text,
  token_hash text not null unique,
  token_last4 text not null,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnostics_bridge_agents_user_id_idx
  on public.diagnostics_bridge_agents (user_id, active, last_seen_at desc);

create table if not exists public.diagnostics_bridge_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  claimed_by_agent_id uuid references public.diagnostics_bridge_agents(id) on delete set null,
  mode text not null check (mode in ('scan_all', 'scan_device')),
  target_udid text,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'completed', 'failed', 'expired')),
  result jsonb,
  error text,
  claimed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnostics_bridge_jobs_requested_by_idx
  on public.diagnostics_bridge_jobs (requested_by, status, created_at desc);

create index if not exists diagnostics_bridge_jobs_agent_idx
  on public.diagnostics_bridge_jobs (claimed_by_agent_id, status, created_at desc);

alter table public.diagnostics_bridge_agents enable row level security;
alter table public.diagnostics_bridge_jobs enable row level security;

drop policy if exists "diagnostics_bridge_agents_service_role_all" on public.diagnostics_bridge_agents;
create policy "diagnostics_bridge_agents_service_role_all"
on public.diagnostics_bridge_agents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "diagnostics_bridge_jobs_service_role_all" on public.diagnostics_bridge_jobs;
create policy "diagnostics_bridge_jobs_service_role_all"
on public.diagnostics_bridge_jobs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
