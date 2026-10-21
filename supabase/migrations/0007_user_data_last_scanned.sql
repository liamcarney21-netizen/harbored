-- Scan rotation. The daily scan has a fixed budget (40 theme pairs, ~38s), and
-- it used to read user_data with no ORDER BY, so the same first few users were
-- scanned every day and everyone else never was. The scan now visits users
-- least-recently-scanned first and stamps last_scanned_at after a complete
-- scan (service role), so the budget rotates; users who don't fit are
-- reported as users_skipped in scan_runs.
--
-- The client never writes this column (its upsert only sends user_id, data and
-- updated_at). Until this runs, the scan falls back to user_id order.
--
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.user_data
  add column if not exists last_scanned_at timestamptz;

create index if not exists user_data_last_scanned_idx
  on public.user_data (last_scanned_at asc nulls first);
