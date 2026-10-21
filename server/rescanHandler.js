// On-demand scan for the signed-in user (POST /api/rescan) — what the
// client's "Check again" calls instead of the old client-side scanner.
//
// Auth: the caller's own Supabase access token (Authorization: Bearer <jwt>),
// verified server-side exactly like delete-account. Same rules as the cron:
// Claude only (no keyword fallback), sample contacts skipped, stored rows left
// untouched when scoring fails. It doesn't push (the user is looking at the
// app) and doesn't move the user in the cron's rotation.
//
// Responses:
//   200 { ok: true, status: 'scanned' | 'idle', themes, items_found,
//         items_claude, items_unscored, above_bar, rows_written, ... }
//   401 missing/invalid token · 429 more than 3 rescans in an hour
//   502 { ok: false, status: 'scoring_unavailable' | 'news_unavailable' }
//   500 { ok: false, status: 'error' }

import { createServiceClient, userFromAuthHeader, shortId } from './db.js'
import { rescanUser } from './scanHandler.js'
import { rateLimit } from './rateLimit.js'

export const RESCANS_PER_HOUR = 3

export async function handleRescanRequest(authHeader, {
  admin,
  now = Date.now,
  score,
  fetchNews,
  limiter = rateLimit,
} = {}) {
  const client = admin || createServiceClient()
  if (!client) return { status: 500, body: { ok: false, status: 'error', error: 'Rescan is not configured' } }

  const { user, status, error } = await userFromAuthHeader(client, authHeader)
  if (!user) return { status, body: { ok: false, status: 'unauthorized', error } }

  // Per user, not per IP: this spends Anthropic credits on the user's behalf.
  // (In-memory per instance, like the other limits.)
  if (!limiter(`rescan:${user.id}`, RESCANS_PER_HOUR, 3600000)) {
    return { status: 429, body: { ok: false, status: 'rate_limited', error: 'Checked recently — try again in a little while.' } }
  }

  try {
    const result = await rescanUser(client, user.id, { now, score, fetchNews })
    return { status: 200, body: { ok: true, ...result } }
  } catch (err) {
    const stage = err?.stage || 'unexpected'
    console.error(`[rescan] user ${shortId(user.id)} failed at ${stage}: ${err?.message || err}`)
    if (stage === 'score') {
      return { status: 502, body: { ok: false, status: 'scoring_unavailable', error: "Couldn't score the news right now. Your saved results were left as they were." } }
    }
    if (stage === 'news') {
      return { status: 502, body: { ok: false, status: 'news_unavailable', error: "Couldn't reach the news right now. Your saved results were left as they were." } }
    }
    return { status: 500, body: { ok: false, status: 'error', error: "Couldn't check right now." } }
  }
}
