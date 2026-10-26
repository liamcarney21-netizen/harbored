-- Funnel events: a handful of in-app moments per account (setup started,
-- people imported, themes added, first scan, first reason seen, a draft opened
-- or sent, notification permission), so we can see where people stop. Names
-- and small counts only: never contact names or details, headlines or message
-- text. The client writes them (src/services/events.js); the app never reads
-- them back, only the service role does (dashboard, scripts).
--
-- Rows go with the account: on delete cascade, and delete-account clears them.
--
-- Run once in the Supabase dashboard → SQL Editor.

create table if not exists public.events (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) <= 40),
  props      jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),
  platform   text check (platform in ('ios', 'web')),
  created_at timestamptz not null default now()
);

create index if not exists events_name_time_idx on public.events (name, created_at desc);
create index if not exists events_user_time_idx on public.events (user_id, created_at desc);

alter table public.events enable row level security;

-- Users can add their own events and nothing else: no select, update or
-- delete policy, so the app can't read anyone's events, including its own.
drop policy if exists "insert own events" on public.events;
create policy "insert own events"
  on public.events
  for insert
  to authenticated
  with check (auth.uid() = user_id);
