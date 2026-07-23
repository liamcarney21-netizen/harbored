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
import { daysUntilBirthday } from '../src/lib/birthday.js'

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

// Birthday is the first non-news signal source. It emits a scan_results row on
// the day itself, so it flows through the exact same dedup (content_key),
// notified_at tracking, push, and digest machinery as scored news — the whole
// point of the shared signal pipeline. The content_key includes the occurrence
// year so it fires once per birthday and again next year.
export function birthdayRowsForUser(data, userId, notifiedByKey, scannedAt, now = new Date()) {
  const { contacts = [] } = data || {}
  const rows = []
  for (const c of contacts) {
    if (daysUntilBirthday(c.birthday, now) !== 0) continue
    const first = (c.name || '').split(' ')[0] || 'them'
    const key = `birthday|${c.id}|${now.getFullYear()}-${c.birthday}`
    rows.push({
      user_id: userId,
      contact_id: String(c.id),
      contact_name: c.name,
      theme_label: 'Birthday',
      theme_category: 'birthday',
      headline: `It's ${first}'s birthday today`,
      source: 'Harbored',
      link: null,
      score: 100,
      rationale: 'A birthday is one of the easiest, most natural reasons to reach out.',
      draft_message: `Happy birthday, ${first}! 🎉 Hope it's a great one.`,
      above_bar: true,
      content_key: key,
      notified_at: notifiedByKey.get(key) ?? null,
      scanned_at: scannedAt,
    })
  }
  return rows
}

// Does this user have any signal today that warrants processing, even with no
// themes to scan? (Keeps birthday-only users from being skipped.)
function hasBirthdayToday(data, now = new Date()) {
  return (data?.contacts || []).some(c => daysUntilBirthday(c.birthday, now) === 0)
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

// Process one user: gather every signal (scored news + birthdays), carry
// notified_at forward by content_key, and full-refresh their stored rows. `data`
// is the user's saved blob (contacts, themes); `pairs` may be empty for a
// birthday-only user.
async function processUser(supabase, userId, data, pairs) {
  const scannedAt = new Date().toISOString()

  // 1. News: freshest headline per theme (fail-soft: no-news themes are skipped).
  let found = []
  let scoreById = new Map()
  if (pairs.length) {
    const newsResults = await Promise.allSettled(
      pairs.map(async ({ contact, theme }) => {
        // Search with the refined query when the theme has one (precise, entity-
        // grounded), else the raw label. Scoring still sees the human theme.label.
        const items = await fetchThemeNews(theme.query || theme.label, 1)
        if (!items?.length) return null
        return { contact, theme, item: items[0] }
      })
    )
    found = newsResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
    if (found.length) {
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
      scoreById = new Map((body.results || []).map(r => [r.id, r]))
    }
  }

  // 2. Carry forward notified_at across the full-refresh (covers all signals).
  const { data: existing } = await supabase
    .from('scan_results')
    .select('content_key, notified_at')
    .eq('user_id', userId)
  const notifiedByKey = notifiedKeyMap(existing)

  // 3. Shape every signal into rows: scored news + today's birthdays.
  const rows = [
    ...(found.length ? shapeResultRows(found, scoreById, userId, notifiedByKey, scannedAt) : []),
    ...birthdayRowsForUser(data, userId, notifiedByKey, scannedAt),
  ]
  if (rows.length === 0) return 0

  // 4. Full-refresh this user's results (latest scan replaces the prior one).
  const del = await supabase.from('scan_results').delete().eq('user_id', userId)
  if (del.error) throw new Error(`delete scan_results (${userId}): ${del.error.message}`)
  const ins = await supabase.from('scan_results').insert(rows)
  if (ins.error) throw new Error(`insert scan_results (${userId}): ${ins.error.message}`)
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
    const pairs = totalPairs >= maxPairsTotal
      ? []
      : pairsForUser(row.data, maxPairsPerUser).slice(0, maxPairsTotal - totalPairs)
    // Process a user if they have themes to scan OR a birthday to alert on today,
    // so birthday-only users (no themes) still get their signal.
    if (pairs.length === 0 && !hasBirthdayToday(row.data)) continue
    totalPairs += pairs.length
    if (pairs.length) summary.usersWithThemes++
    summary.resultsWritten += await processUser(supabase, row.user_id, row.data, pairs)
    summary.usersScanned++
  }

  return summary
}
