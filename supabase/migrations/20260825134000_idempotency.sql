-- VinSEND :: 11 :: idempotency

create table if not exists public.idempotency_keys (
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null,
  request_hash text not null,
  response_body jsonb not null,
  response_status integer not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (project_id, key)
);

create index if not exists idempotency_keys_expiry_idx
  on public.idempotency_keys (expires_at);

alter table public.idempotency_keys enable row level security;
-- No policies. Service-role only.

create or replace function public.prune_expired_idempotency()
returns integer language plpgsql as $$
declare
  n integer;
begin
  delete from public.idempotency_keys where expires_at < now();
  get diagnostics n = row_count;
  return n;
end$$;
