// Account deletion (POST /api/delete-account).
// The caller proves who they are with their own Supabase access token; every
// server-side row for that user is removed, then the auth user itself.
// App Store guideline 5.1.1(v) requires this to be reachable in-app.
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function handleDeleteAccount(authHeader) {
  const token = (authHeader || '').replace(/^Bearer\s+/i, '')
  if (!token) return { status: 401, body: { error: 'Missing access token' } }

  const admin = adminClient()
  if (!admin) return { status: 500, body: { error: 'Deletion is not configured' } }

  const { data, error: userErr } = await admin.auth.getUser(token)
  const user = data?.user
  if (userErr || !user) return { status: 401, body: { error: 'Invalid or expired session' } }

  for (const table of ['device_tokens', 'scan_results', 'user_data']) {
    const { error } = await admin.from(table).delete().eq('user_id', user.id)
    // A table that has no row for this user is fine; a real failure is not —
    // stop rather than orphan data under a deleted auth user.
    if (error) return { status: 500, body: { error: `Could not remove ${table}` } }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) return { status: 500, body: { error: 'Could not delete the account' } }

  return { status: 200, body: { deleted: true } }
}
