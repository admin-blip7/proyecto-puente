alter table if exists public.diagnostics_bridge_agents
  add column if not exists machine_id text;

create unique index if not exists diagnostics_bridge_agents_machine_id_idx
  on public.diagnostics_bridge_agents (machine_id)
  where machine_id is not null;

create table if not exists public.diagnostics_bridge_pairings (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null,
  pairing_code text not null unique,
  agent_name text not null,
  platform text,
  status text not null default 'pending' check (status in ('pending', 'paired', 'expired')),
  user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references public.diagnostics_bridge_agents(id) on delete set null,
  issued_token text,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  paired_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnostics_bridge_pairings_machine_idx
  on public.diagnostics_bridge_pairings (machine_id, status, created_at desc);

alter table public.diagnostics_bridge_pairings enable row level security;

drop policy if exists "diagnostics_bridge_pairings_service_role_all" on public.diagnostics_bridge_pairings;
create policy "diagnostics_bridge_pairings_service_role_all"
on public.diagnostics_bridge_pairings
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

alter table if exists public.device_diagnostics
  add column if not exists scanned_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists bridge_job_id uuid references public.diagnostics_bridge_jobs(id) on delete set null,
  add column if not exists bridge_agent_id uuid references public.diagnostics_bridge_agents(id) on delete set null;

create index if not exists device_diagnostics_scanned_by_user_idx
  on public.device_diagnostics (scanned_by_user_id, scanned_at desc);
