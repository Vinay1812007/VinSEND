-- VinSEND :: 17 :: materialized analytics view + refresh function
--
-- Aggregates email_events into per-day, per-project, per-type counts.
-- Refresh with SELECT public.refresh_email_events_daily().
-- Point an hourly cron at /api/internal/analytics/refresh (added in the same
-- release) to keep it current.

create materialized view if not exists public.email_events_daily as
select
  ee.email_id,
  em.project_id,
  ee.type,
  date_trunc('day', ee.occurred_at)::date as day,
  count(*)::integer as count
from public.email_events ee
join public.emails em on em.id = ee.email_id
group by ee.email_id, em.project_id, ee.type, day;

-- Idempotent-safe indexes.
create index if not exists email_events_daily_project_day_idx
  on public.email_events_daily (project_id, day);
create index if not exists email_events_daily_project_type_day_idx
  on public.email_events_daily (project_id, type, day);

create or replace function public.refresh_email_events_daily()
returns void
language plpgsql
security definer as $$
begin
  refresh materialized view public.email_events_daily;
end$$;
