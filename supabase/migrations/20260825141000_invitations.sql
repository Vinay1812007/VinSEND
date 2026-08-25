-- VinSEND :: 14 :: team invitations
--
-- One row per pending invite. Tokens are stored hashed; the plaintext is
-- only shown once (via the invite email link).

create extension if not exists "pgcrypto";

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  role text not null check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email, status) deferrable initially deferred
);

create index if not exists invitations_org_status_idx
  on public.invitations (org_id, status);

alter table public.invitations enable row level security;

create policy "invitations: admin read" on public.invitations
  for select using (public.has_org_role(org_id, array['owner','admin']));

create policy "invitations: admin write" on public.invitations
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));
