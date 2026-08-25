-- VinSEND :: 10 :: contacts and lists

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  public_id text not null unique,
  email citext not null,
  first_name text,
  last_name text,
  properties jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','unsubscribed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists contacts_project_idx on public.contacts (project_id);

create trigger tg_contacts_updated_at
  before update on public.contacts
  for each row execute function public.tg_set_updated_at();

alter table public.contacts enable row level security;

create policy "contacts: member read" on public.contacts
  for select using (public.is_org_member(org_id));

create policy "contacts: member write" on public.contacts
  for all using (public.has_org_role(org_id, array['owner','admin','member']))
  with check (public.has_org_role(org_id, array['owner','admin','member']));


create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_lists enable row level security;

create policy "contact_lists: member read" on public.contact_lists
  for select using (public.is_org_member(org_id));

create policy "contact_lists: member write" on public.contact_lists
  for all using (public.has_org_role(org_id, array['owner','admin','member']))
  with check (public.has_org_role(org_id, array['owner','admin','member']));


create table if not exists public.contact_list_members (
  list_id uuid not null references public.contact_lists(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, contact_id)
);

alter table public.contact_list_members enable row level security;

create policy "contact_list_members: member read" on public.contact_list_members
  for select using (
    exists (
      select 1 from public.contact_lists l
      where l.id = contact_list_members.list_id and public.is_org_member(l.org_id)
    )
  );
