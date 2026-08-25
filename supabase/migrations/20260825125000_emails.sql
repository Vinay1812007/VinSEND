-- VinSEND :: 06 :: emails, recipients, events

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  public_id text not null unique,
  provider_id uuid references public.email_providers(id) on delete set null,
  from_address citext not null,
  from_name text,
  subject text not null,
  status text not null default 'queued'
    check (status in ('queued','processing','sent','delivered','deferred','bounced','complained','rejected','failed')),
  provider_message_id text,
  tags jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  html_length integer,
  text_length integer,
  html_sha256 text,
  request_id text,
  idempotency_key text,
  api_key_id uuid references public.api_keys(id) on delete set null,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emails_project_created_idx
  on public.emails (project_id, created_at desc);

create index if not exists emails_project_status_partial
  on public.emails (project_id) where status in ('queued','processing');

create index if not exists emails_from_address_idx
  on public.emails (project_id, from_address);

create index if not exists emails_status_idx
  on public.emails (project_id, status, created_at desc);

create trigger tg_emails_updated_at
  before update on public.emails
  for each row execute function public.tg_set_updated_at();

alter table public.emails enable row level security;

create policy "emails: member read" on public.emails
  for select using (public.is_org_member(org_id));


create table if not exists public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  kind text not null check (kind in ('to','cc','bcc','reply_to')),
  address citext not null,
  status text not null default 'queued'
    check (status in ('queued','sent','delivered','deferred','bounced','complained','rejected','failed')),
  created_at timestamptz not null default now()
);

create index if not exists email_recipients_email_idx
  on public.email_recipients (email_id);

create index if not exists email_recipients_address_idx
  on public.email_recipients (address);

alter table public.email_recipients enable row level security;

create policy "email_recipients: member read" on public.email_recipients
  for select using (
    exists (
      select 1 from public.emails e
      where e.id = email_recipients.email_id and public.is_org_member(e.org_id)
    )
  );


create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null default now(),
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists email_events_email_idx
  on public.email_events (email_id, occurred_at);

create unique index if not exists email_events_provider_dedup
  on public.email_events (email_id, provider_event_id)
  where provider_event_id is not null;

alter table public.email_events enable row level security;

create policy "email_events: member read" on public.email_events
  for select using (
    exists (
      select 1 from public.emails e
      where e.id = email_events.email_id and public.is_org_member(e.org_id)
    )
  );
