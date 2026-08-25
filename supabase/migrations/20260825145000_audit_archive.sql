-- VinSEND :: 18 :: audit archive metadata
--
-- Every nightly archive run appends a row here holding the SHA-256 of the
-- serialized payload plus the previous archive's hash. This forms a hash
-- chain: any tampering breaks the chain and the next run's verify fails.

create table if not exists public.audit_archives (
  id uuid primary key default gen_random_uuid(),
  covered_from timestamptz not null,
  covered_to timestamptz not null,
  row_count integer not null,
  payload_sha256 text not null,
  previous_sha256 text,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists audit_archives_created_idx
  on public.audit_archives (created_at desc);

alter table public.audit_archives enable row level security;
-- No policies. Service-role reads only.
