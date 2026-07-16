-- Phase 3: store each user's push device token(s) so the server can send them
-- notifications. The client upserts its own token after login (RLS below); the
-- server reads all tokens via the service-role key to send pushes.
--
-- Run once in the Supabase dashboard → SQL Editor.

create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  token      text not null,               -- APNs device token
  platform   text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)                 -- re-registering the same token upserts
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Users manage only their own device tokens (the app upserts its token after login).
-- The server-side send path uses the service-role key, which bypasses RLS.
drop policy if exists "manage own device_tokens" on public.device_tokens;
create policy "manage own device_tokens"
  on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
