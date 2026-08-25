-- VinSEND :: 04 :: domains and dns records

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider_id uuid references public.email_providers(id) on delete set null,
  domain citext not null,
  public_id text not null unique,
  status text not null default 'pending'
    check (status in ('pending','verifying','verified','failed')),
  last_checked_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, domain)
);

create index if not exists domains_status_idx on public.domains (project_id, status);

create trigger tg_domains_updated_at
  before update on public.domains
  for each row execute function public.tg_set_updated_at();

alter table public.domains enable row level security;

create policy "domains: member read" on public.domains
  for select using (public.is_org_member(org_id));

create policy "domains: admin write" on public.domains
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));


create table if not exists public.dns_records (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains(id) on delete cascade,
  type text not null check (type in ('spf','dkim','dmarc','mx','cname')),
  host text not null,
  expected_value text not null,
  last_seen_value text,
  status text not null default 'pending'
    check (status in ('pending','matched','mismatched','missing')),
  ttl integer,
  required boolean not null default true,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists dns_records_domain_idx on public.dns_records (domain_id);

create trigger tg_dns_records_updated_at
  before update on public.dns_records
  for each row execute function public.tg_set_updated_at();

alter table public.dns_records enable row level security;

create policy "dns_records: member read" on public.dns_records
  for select using (
    exists (
      select 1 from public.domains d
      where d.id = dns_records.domain_id and public.is_org_member(d.org_id)
    )
  );

create policy "dns_records: admin write" on public.dns_records
  for all using (
    exists (
      select 1 from public.domains d
      where d.id = dns_records.domain_id and public.has_org_role(d.org_id, array['owner','admin'])
    )
  ) with check (
    exists (
      select 1 from public.domains d
      where d.id = dns_records.domain_id and public.has_org_role(d.org_id, array['owner','admin'])
    )
  );

-- Wire sender_identities.domain_id after the domains table exists.
alter table public.sender_identities
  add constraint sender_identities_domain_fk
  foreign key (domain_id) references public.domains(id) on delete set null;
