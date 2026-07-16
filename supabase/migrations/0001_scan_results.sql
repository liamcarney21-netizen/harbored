-- Phase 1: server-side theme scanning.
--
-- scan_results holds the output of the scheduled scan (api/scan.js), so Harbored
-- can surface reasons to reconnect without the user opening the app. Written ONLY
-- by the cron via the Supabase service-role key (which bypasses RLS); each user
-- may read their own rows. Full-refreshed per user on each scan run.
--
-- Run this once in the Supabase dashboard → SQL Editor (or via the Supabase CLI).

create table if not exists public.scan_results (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  contact_id     text not null,          -- app contact ids are JS numbers; stored as text to avoid precision loss
  contact_name   text,
  theme_label    text,
  theme_category text,
  headline       text not null,
  source         text,
  link           text,
  score          integer not null default 0,
  rationale      text,                   -- Claude's one-sentence "why this score"
  draft_message  text,                   -- populated only when above the reach-out bar
  above_bar      boolean not null default false,
  scanned_at     timestamptz not null default now()
);

create index if not exists scan_results_user_scanned_idx
  on public.scan_results (user_id, scanned_at desc);

alter table public.scan_results enable row level security;

-- Users can read their own scan results. There are deliberately NO
-- insert/update/delete policies: writes happen only through the service-role
-- key used by /api/scan, which bypasses RLS entirely.
drop policy if exists "read own scan_results" on public.scan_results;
create policy "read own scan_results"
  on public.scan_results
  for select
  using (auth.uid() = user_id);
