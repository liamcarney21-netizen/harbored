-- Durable push dedupe. scan_results is refreshed every scan, so notified_at on
-- it only remembers one scan back: a story that dropped out of Google's top
-- results for a day and came back was pushed again. notified_stories keeps one
-- row per (user, story) that was actually pushed; server/pushHandler.js claims
-- the row before sending (primary key = at most one push per story per user)
-- and uses the recent rows for the caps (2 stories per user per day, 1 per
-- contact per 7 days). Rows older than 90 days are deleted by the push step.
--
-- Until this runs, push falls back to scan_results.notified_at.
--
-- Written and read only by the server (service role); RLS on, no policies.
--
-- Run once in the Supabase dashboard → SQL Editor.

create table if not exists public.notified_stories (
  user_id     uuid not null references auth.users (id) on delete cascade,
  contact_id  text,
  story_key   text not null,
  notified_at timestamptz not null default now(),
  primary key (user_id, story_key)
);

create index if not exists notified_stories_user_time_idx
  on public.notified_stories (user_id, notified_at desc);

create index if not exists notified_stories_time_idx
  on public.notified_stories (notified_at);

alter table public.notified_stories enable row level security;
