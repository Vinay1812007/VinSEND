-- VinSEND :: 13 :: rate limit counters (fixed-window, Postgres-backed)

create table if not exists public.rate_limit_counters (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket, window_start)
);

create index if not exists rate_limit_counters_window_idx
  on public.rate_limit_counters (window_start);

alter table public.rate_limit_counters enable row level security;
-- No policies. Service-role only.

create or replace function public.rate_limit_consume(
  p_bucket text,
  p_window_seconds integer,
  p_limit integer,
  p_cost integer default 1
) returns table (allowed boolean, current_count integer, reset_at timestamptz)
language plpgsql as $$
declare
  v_window_start timestamptz;
  v_new_count integer;
begin
  v_window_start := date_trunc('second', now()) -
    (extract(epoch from now())::bigint % p_window_seconds) * interval '1 second';

  insert into public.rate_limit_counters (bucket, window_start, count, updated_at)
  values (p_bucket, v_window_start, p_cost, now())
  on conflict (bucket, window_start) do update
    set count = public.rate_limit_counters.count + p_cost,
        updated_at = now()
  returning count into v_new_count;

  return query select
    (v_new_count <= p_limit) as allowed,
    v_new_count as current_count,
    (v_window_start + (p_window_seconds || ' seconds')::interval) as reset_at;
end$$;
