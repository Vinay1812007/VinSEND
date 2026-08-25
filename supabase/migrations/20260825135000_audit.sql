-- VinSEND :: 12 :: audit events

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_org_created_idx
  on public.audit_events (org_id, created_at desc);

alter table public.audit_events enable row level security;

create policy "audit_events: admin read" on public.audit_events
  for select using (public.has_org_role(org_id, array['owner','admin']));
