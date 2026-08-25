-- VinSEND :: 08 :: webhooks and delivery attempts

create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  public_id text not null unique,
  url text not null,
  events text[] not null default array[]::text[],
  signing_secret_encrypted bytea not null,
  status text not null default 'active' check (status in ('active','paused','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhooks_project_idx on public.webhooks (project_id);

create trigger tg_webhooks_updated_at
  before update on public.webhooks
  for each row execute function public.tg_set_updated_at();

alter table public.webhooks enable row level security;

create policy "webhooks: member read" on public.webhooks
  for select using (public.is_org_member(org_id));

create policy "webhooks: admin write" on public.webhooks
  for all using (public.has_org_role(org_id, array['owner','admin']))
  with check (public.has_org_role(org_id, array['owner','admin']));


create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhooks(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  attempt integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending','delivered','failed','abandoned')),
  http_status integer,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhook_deliveries_retry_idx
  on public.webhook_deliveries (webhook_id, next_retry_at)
  where status = 'pending';

create trigger tg_webhook_deliveries_updated_at
  before update on public.webhook_deliveries
  for each row execute function public.tg_set_updated_at();

alter table public.webhook_deliveries enable row level security;

create policy "webhook_deliveries: member read" on public.webhook_deliveries
  for select using (
    exists (
      select 1 from public.webhooks w
      where w.id = webhook_deliveries.webhook_id and public.is_org_member(w.org_id)
    )
  );
