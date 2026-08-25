-- VinSEND :: 15 :: contact segments (query-defined filters over properties)

create table if not exists public.contact_segments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  filter jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_segments_project_idx on public.contact_segments (project_id);

alter table public.contact_segments enable row level security;

create policy "contact_segments: member read" on public.contact_segments
  for select using (public.is_org_member(org_id));

create policy "contact_segments: member write" on public.contact_segments
  for all using (public.has_org_role(org_id, array['owner','admin','member']))
  with check (public.has_org_role(org_id, array['owner','admin','member']));
