-- VinSEND :: 03 :: email providers and sender identities

create table if not exists public.email_providers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('smtp','ses','mailgun','postmark','sendgrid','brevo')),
  name text not null,
  is_default boolean not null default false,
  config_encrypted bytea not null,
  config_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_providers_project_idx
  on public.email_providers (project_id);

create unique index if not exists email_providers_default_uq
  on public.email_providers (project_id) where is_default;

create trigger tg_email_providers_updated_at
  before update on public.email_providers
  for each row execute function public.tg_set_updated_at();

alter table public.email_providers enable row level security;

create policy "email_providers: member read" on public.email_providers
  for select using (public.is_org_member(org_id));

create policy "email_providers: admin write" on public.email_providers
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));


create table if not exists public.sender_identities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  domain_id uuid,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

alter table public.sender_identities enable row level security;

create policy "sender_identities: member read" on public.sender_identities
  for select using (public.is_org_member(org_id));

create policy "sender_identities: admin write" on public.sender_identities
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));
