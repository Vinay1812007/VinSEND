-- VinSEND :: 07 :: suppressions

create table if not exists public.suppressions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  reason text not null check (reason in ('hard_bounce','complaint','unsubscribe','manual')),
  source text not null default 'system' check (source in ('system','manual','api','webhook_event')),
  notes text,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists suppressions_project_idx on public.suppressions (project_id);

alter table public.suppressions enable row level security;

create policy "suppressions: member read" on public.suppressions
  for select using (public.is_org_member(org_id));

create policy "suppressions: admin write" on public.suppressions
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));
