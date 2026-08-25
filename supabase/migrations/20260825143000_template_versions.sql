-- VinSEND :: 16 :: template version history
--
-- One snapshot per save. The `templates` table always holds the current
-- version. This history table keeps every prior payload so a user can view
-- or restore an earlier version.

create table if not exists public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null,
  name text not null,
  subject text not null,
  html text not null,
  text text,
  variables jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create index if not exists template_versions_template_idx
  on public.template_versions (template_id, version desc);

alter table public.template_versions enable row level security;

create policy "template_versions: member read" on public.template_versions
  for select using (public.is_org_member(org_id));

create policy "template_versions: member write" on public.template_versions
  for all using (public.has_org_role(org_id, array['owner','admin','member']))
  with check (public.has_org_role(org_id, array['owner','admin','member']));
