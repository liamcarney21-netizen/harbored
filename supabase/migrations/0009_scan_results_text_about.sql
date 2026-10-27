-- Which of the person's choices a story matched (build 12's "What would you text
-- them about?"), written by server/scanHandler.js.
--
--   text_about  the label of the checked choice the scorer named, copied from the
--               theme (e.g. 'Wildfires & storms'). Null for themes without
--               choices, for birthdays and for anything not relevant.
--
-- Until this runs, the scan writes rows without it and logs that once per run.
-- The 0005 columns are unaffected either way.
--
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.scan_results
  add column if not exists text_about text;
