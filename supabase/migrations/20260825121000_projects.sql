-- VinSEND :: 02 :: projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  public_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_org_id_idx on public.projects (org_id, created_at desc);

create trigger tg_projects_updated_at
  before update on public.projects
  for each row execute function public.tg_set_updated_at();

alter table public.projects enable row level security;

create policy "projects: member read" on public.projects
  for select using (public.is_org_member(org_id));

create policy "projects: admin write" on public.projects
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));
