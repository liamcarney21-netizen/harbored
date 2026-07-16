-- Phase 3 groundwork: only alert on genuinely NEW opportunities.
--
-- content_key is a stable identity for a result (contact + theme + headline), so
-- the same headline across daily scans maps to the same row and its notified_at
-- is carried forward. notified_at = when the user was last told about it (via
-- digest, and later push); NULL means new / not yet alerted.
--
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.scan_results
  add column if not exists content_key text,
  add column if not exists notified_at timestamptz;

-- Fast lookup for "this user's new above-bar results" (the digest/push query).
create index if not exists scan_results_user_notify_idx
  on public.scan_results (user_id, above_bar, notified_at);
