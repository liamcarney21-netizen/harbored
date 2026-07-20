// Server-side theme scan — the inversion at the heart of the native roadmap
// (see ROADMAP.md). Instead of scanning when a user opens the app, this runs on
// a schedule (api/scan.js, via Vercel Cron): it reads every user's saved themes,
// fetches the freshest headline per theme, scores the batch with Claude (the same
// handler the live path uses, with a heuristic fallback), and writes the results
// to scan_results. That stored output is what will later feed the weekly digest
// email and push notifications.

import { createClient } from '@supabase/supabase-js'
import { fetchThemeNews } from './newsHandler.js'
import { handleScoreRequest, SIGNIFICANCE_THRESHOLD } from './scoreHandler.js'

// Bound the work per run so a single serverless invocation stays within its time
// budget and Anthropic spend stays predictable. At real scale this becomes a
// fan-out/queue (one job per user); these caps are fine for the current size.
const MAX_PAIRS_PER_USER = 6
const MAX_PAIRS_TOTAL = 40

// Builds the service-role Supabase client from env (server-only key that bypasses
// RLS so the cron can read all users and write results). Returns null if the env
// isn't configured, so callers can fail with a clear message instead of a crash.
export function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// Collect up to `maxPerUser` (contact, theme) pairs from one user's stored blob.
// Newest contacts first: when the cap bites, it must never silently drop the
// themes the user just added — those are exactly the ones they expect watched.
// Contact ids are Date.now() for user-added contacts and small ints for seeds,
// so a descending numeric sort puts fresh additions ahead of sample data.
function pairsForUser(data, maxPerUser) {
  const { contacts = [], themesByContact = {} } = data || {}
  const ordered = [...contacts].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
  const pairs = []
  for (const contact of ordered) {
    for (const theme of themesByContact[contact.id] || []) {
      pairs.push({ contact, theme })
      if (pairs.length >= maxPerUser) return pairs
    }
  }
  return pairs
}

// content_key is the stable identity of a result — the same headline for the
// same contact+theme maps to the same key across scans, so notified_at can be
// carried forward and we never re-alert on it.
export function contentKeyFor(contactId, themeLabel, headline) {
  return `${String(contactId)}|${themeLabel}|${headline}`
}

// Build content_key → notified_at from the user's existing rows (only rows that
// carry both a key and a notified timestamp count).
export function notifiedKeyMap(existingRows) {
  const m = new Map()
  for (const r of existingRows || []) {
    if (r.content_key && r.notified_at) m.set(r.content_key, r.notified_at)
  }
  return m
}

// Shape scored news into storage rows, carrying notified_at forward for any
// headline the user was already alerted to (matched by content_key).
export function shapeResultRows(found, scoreById, userId, notifiedByKey, scannedAt) {
  return found.map(({ contact, theme, item }, i) => {
    const scored = scoreById.get(i) || {}
    const score = Number.isFinite(scored.score) ? scored.score : 0
    const above = score >= SIGNIFICANCE_THRESHOLD
    const key = contentKeyFor(contact.id, theme.label, item.title)
    return {
      user_id: userId,
      contact_id: String(contact.id),
      contact_name: contact.name,
      theme_label: theme.label,
      theme_category: theme.category ?? null,
      headline: item.title,
      source: item.source ?? null,
      link: item.link ?? null,
      score,
      rationale: scored.rationale ?? null,
      draft_message: above ? (scored.draftMessage ?? null) : null,
      above_bar: above,
      content_key: key,
      notified_at: notifiedByKey.get(key) ?? null,
      scanned_at: scannedAt,
    }
  })
}

async function scanUser(supabase, userId, pairs) {
  // 1. Freshest headline per theme (fail-soft: a theme with no news is skipped).
  const newsResults = await Promise.allSettled(
    pairs.map(async ({ contact, theme }) => {
      const items = await fetchThemeNews(theme.label, 1)
      if (!items?.length) return null
      return { contact, theme, item: items[0] }
    })
  )
  const found = newsResults
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
  if (found.length === 0) return 0

  // 2. Score the batch (Claude, heuristic fallback inside the handler).
  const items = found.map((f, i) => ({
    id: i,
    headline: f.item.title,
    source: f.item.source,
    pubDate: f.item.pubDate,
    themeLabel: f.theme.label,
    contactName: f.contact.name,
    contactCompany: f.contact.company,
    contactRole: f.contact.role,
  }))
  const { body } = await handleScoreRequest({ items })
  const byId = new Map((body.results || []).map(r => [r.id, r]))

  // 3. Carry forward notified_at for headlines we've already alerted on, so the
  //    daily full-refresh doesn't reset "already notified" state.
  const { data: existing } = await supabase
    .from('scan_results')
    .select('content_key, notified_at')
    .eq('user_id', userId)
  const notifiedByKey = notifiedKeyMap(existing)

  // 4. Shape rows for storage (with notified_at carried forward via content_key).
  const scannedAt = new Date().toISOString()
  const rows = shapeResultRows(found, byId, userId, notifiedByKey, scannedAt)

  // 5. Full-refresh this user's results (latest scan replaces the prior one),
  //    with notified_at carried forward via content_key above.
  const del = await supabase.from('scan_results').delete().eq('user_id', userId)
  if (del.error) throw new Error(`delete scan_results (${userId}): ${del.error.message}`)
  if (rows.length) {
    const ins = await supabase.from('scan_results').insert(rows)
    if (ins.error) throw new Error(`insert scan_results (${userId}): ${ins.error.message}`)
  }
  return rows.length
}

export async function runScan(supabase, {
  maxPairsPerUser = MAX_PAIRS_PER_USER,
  maxPairsTotal = MAX_PAIRS_TOTAL,
} = {}) {
  const { data: userRows, error } = await supabase
    .from('user_data')
    .select('user_id, data')
  if (error) throw new Error(`read user_data: ${error.message}`)

  const summary = { usersScanned: 0, usersWithThemes: 0, resultsWritten: 0 }
  let totalPairs = 0

  for (const row of userRows || []) {
    if (totalPairs >= maxPairsTotal) break
    const pairs = pairsForUser(row.data, maxPairsPerUser)
      .slice(0, maxPairsTotal - totalPairs)
    if (pairs.length === 0) continue
    totalPairs += pairs.length
    summary.usersWithThemes++
    summary.resultsWritten += await scanUser(supabase, row.user_id, pairs)
    summary.usersScanned++
  }

  return summary
}
