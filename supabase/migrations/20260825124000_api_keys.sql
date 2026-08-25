-- VinSEND :: 05 :: api keys

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  public_id text not null unique,
  name text not null check (length(name) between 1 and 120),
  prefix text not null unique,
  hash text not null unique,
  scopes text[] not null default array['emails.send','emails.read']::text[],
  environment text not null default 'live' check (environment in ('live','test')),
  created_by uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_project_idx
  on public.api_keys (project_id, revoked_at);

alter table public.api_keys enable row level security;

create policy "api_keys: member read" on public.api_keys
  for select using (public.is_org_member(org_id));

create policy "api_keys: admin write" on public.api_keys
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));
