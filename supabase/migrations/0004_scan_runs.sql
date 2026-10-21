-- Observability for the daily scan: one row per /api/scan run, written at the
-- end of every run by server/scanRun.js through the service-role key.
--
-- healthy = no user errored, every item was scored by Claude (items_fallback
-- = 0), and no push failed. Unhealthy runs also email ALERT_EMAIL; healthy runs
-- ping HEARTBEAT_URL. The code tolerates this table not existing yet.
--
-- Row-level security is on with no policies: only the service role (which
-- bypasses RLS) can read or write it.
--
-- Run once in the Supabase dashboard → SQL Editor.

create table if not exists public.scan_runs (
  id               bigserial primary key,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  users_total      integer not null default 0,
  users_scanned    integer not null default 0,
  users_skipped    integer not null default 0,
  users_errored    integer not null default 0,
  items_claude     integer not null default 0,
  items_fallback   integer not null default 0,
  above_bar        integer not null default 0,
  pushes_attempted integer not null default 0,
  pushes_ok        integer not null default 0,
  pushes_failed    integer not null default 0,
  healthy          boolean not null default false,
  error            text
);

create index if not exists scan_runs_started_idx
  on public.scan_runs (started_at desc);

alter table public.scan_runs enable row level security;
