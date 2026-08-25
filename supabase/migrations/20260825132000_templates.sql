-- VinSEND :: 09 :: templates

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  public_id text not null unique,
  name text not null,
  subject text not null,
  html text not null,
  text text,
  variables jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_project_idx on public.templates (project_id);

create trigger tg_templates_updated_at
  before update on public.templates
  for each row execute function public.tg_set_updated_at();

alter table public.templates enable row level security;

create policy "templates: member read" on public.templates
  for select using (public.is_org_member(org_id));

create policy "templates: admin write" on public.templates
  for all using (public.has_org_role(org_id, array['owner','admin','member']))
  with check (public.has_org_role(org_id, array['owner','admin','member']));
