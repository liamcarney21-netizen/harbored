-- Real article dates, scoring provenance and a story identity on every scan
-- result (written by server/scanHandler.js).
--
--   published_at  the article's own publish time from the RSS pubDate (the app
--                 used to show scan time as article time)
--   engine        'claude' | 'unscored' (model omitted the item) | 'birthday'
--                 — the cron never writes keyword-scored rows
--   story_key     sha1 of the article link (fallback: RSS guid, then the
--                 normalized title); the dedupe key for notified_stories
--   relevant      Claude's separate "is this about the watched subject?" verdict
--
-- content_key is unchanged (the client keys sent/skipped state on it).
-- Until this runs, the scan writes rows without these four fields.
--
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.scan_results
  add column if not exists published_at timestamptz,
  add column if not exists engine       text,
  add column if not exists story_key    text,
  add column if not exists relevant     boolean;

-- The push step reads the current run's unnotified above-bar rows.
create index if not exists scan_results_push_candidates_idx
  on public.scan_results (scanned_at)
  where above_bar and notified_at is null;
