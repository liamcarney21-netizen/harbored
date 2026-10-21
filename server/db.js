// Small Supabase helpers shared by the scan, push, digest and rescan paths.
//
// Schema changes ship as hand-applied migrations (supabase/migrations), so the
// server must keep working on a database where the newest migration has not
// been run yet. These predicates recognise the two ways that shows up:
//  - a column that doesn't exist yet (Postgres 42703 on reads/filters,
//    PostgREST PGRST204 "Could not find the 'x' column" on writes);
//  - a table that doesn't exist yet (Postgres 42P01, PostgREST PGRST205).
// Callers catch these, console.error once, and fall back to the old behaviour.

import { createClient } from '@supabase/supabase-js'

export function isMissingColumnError(err) {
  if (!err) return false
  const code = String(err.code || '')
  const msg = String(err.message || err || '')
  return code === '42703' || code === 'PGRST204' ||
    /column .* does not exist/i.test(msg) ||
    /could not find the '[^']+' column/i.test(msg)
}

export function isMissingTableError(err) {
  if (!err) return false
  const code = String(err.code || '')
  const msg = String(err.message || err || '')
  return code === '42P01' || code === 'PGRST205' ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
}

export function isDuplicateKeyError(err) {
  if (!err) return false
  return String(err.code || '') === '23505' || /duplicate key/i.test(String(err.message || ''))
}

// Builds the service-role Supabase client from env (server-only key that
// bypasses RLS). Returns null if the env isn't configured, so callers can fail
// with a clear message instead of a crash.
export function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// Resolve the caller of a user-facing endpoint from their own Supabase access
// token (Authorization: Bearer <jwt>). Same check deleteAccountHandler uses:
// the service-role client asks Supabase Auth who the token belongs to, so a
// forged or expired token never resolves to a user.
export async function userFromAuthHeader(admin, authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { user: null, status: 401, error: 'Missing access token' }
  const { data, error } = await admin.auth.getUser(token)
  const user = data?.user
  if (error || !user) return { user: null, status: 401, error: 'Invalid or expired session' }
  return { user, status: 200, error: null }
}

// First 8 chars of a user id — enough to correlate log lines and run records
// without writing full identifiers (and never emails or names) to logs.
export function shortId(id) {
  return String(id || '').slice(0, 8)
}
