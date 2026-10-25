// Server-side theme scan (api/scan.js via Vercel Cron, and api/rescan.js for one
// user). For each user it reads their saved themes, fetches recent news per
// theme, keeps the freshest item published in the last 72 hours, scores the
// batch with Claude and writes the results to scan_results. Push and the
// weekly digest read from there.
//
// Failure rules (the September 2026 outage was a silent keyword fallback):
//  - Scoring never falls back to the keyword heuristic here. If the Claude call
//    fails for a user, that user's stored rows are left as they were
//    (yesterday's results and notified_at memory survive; only the end-of-run
//    sweep of rows past the 72h window touches them), nothing is pushed for
//    them, and the run counts them as errored. Items the model omitted are
//    written as engine 'unscored' (above_bar false, score 0).
//  - Each user is processed inside its own try/catch; one user's failure never
//    stops the others or the push that follows.
//  - New rows are inserted BEFORE superseded rows are deleted, so a failed
//    insert can't wipe a user's results.

import { createHash } from 'node:crypto'
import { fetchThemeNews, filterFresh, FRESH_HOURS } from './newsHandler.js'
import { scoreItems, SIGNIFICANCE_THRESHOLD } from './scoreHandler.js'
import { daysUntilBirthday } from '../src/lib/birthday.js'
import { isMissingColumnError, shortId } from './db.js'

// Kept importable from here: api/push.js, api/digest.js and vite.config.js use it.
export { createServiceClient } from './db.js'

// Bound the work per run so one serverless invocation (60s max) can still
// push and record the run afterwards. Users are visited least-recently-scanned
// first (user_data.last_scanned_at), so the cap rotates instead of starving
// the same users every day; whoever doesn't fit is reported as users_skipped.
// Within a user, themes beyond MAX_PAIRS_PER_USER take turns by day (see
// pairsForUser), so every theme is watched.
export const MAX_PAIRS_PER_USER = 6
export const MAX_PAIRS_TOTAL = 40
export const NEWS_ITEMS_PER_THEME = 8
export const SCAN_BUDGET_MS = 34000 // no new user is started after this (leaves ≥12s before the Claude deadline)
export const LLM_DEADLINE_MS = 46000 // no Claude attempt or retry starts after this
const DAY_MS = 86400000

// Fields added by migration 0005. If they aren't there yet, rows are written
// without them (old behaviour) and the run logs it once.
const NEW_ROW_FIELDS = ['published_at', 'engine', 'story_key', 'relevant']

export class UserScanError extends Error {
  constructor(stage, message) {
    super(message)
    this.stage = stage
  }
}

const sha1 = (s) => createHash('sha1').update(String(s)).digest('hex')

export function pairKey(contactId, themeLabel) {
  return `${String(contactId)}|${themeLabel}`
}

// Every (contact, theme) pair a user is watching, newest contacts first.
// Sample contacts (seed: true) are never scanned or pushed about: they are
// fictional people. Contact ids are Date.now()-based for user-added contacts
// and small ints for seeds, so a descending sort puts fresh additions first —
// when the per-user cap bites, it never drops the themes just added.
export function livePairs(data) {
  const { contacts = [], themesByContact = {} } = data || {}
  const ordered = (Array.isArray(contacts) ? contacts : [])
    .filter(c => c && !c.seed)
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
  const pairs = []
  for (const contact of ordered) {
    const themes = themesByContact?.[contact.id]
    for (const theme of Array.isArray(themes) ? themes : []) {
      if (theme && theme.label) pairs.push({ contact, theme })
    }
  }
  return pairs
}

// The pairs to scan today. Up to the cap, that's all of them. Past it, a
// window of `maxPerUser` pairs moves forward by its own length each day and
// wraps, so n pairs are all scanned within ceil(n / maxPerUser) days instead
// of the same first few forever. Day 0 is the first window.
export function pairsForUser(data, maxPerUser = MAX_PAIRS_PER_USER, { day = 0 } = {}) {
  const all = livePairs(data)
  if (all.length <= maxPerUser) return all
  const start = (Math.max(0, Math.floor(day)) * maxPerUser) % all.length
  return Array.from({ length: maxPerUser }, (_, i) => all[(start + i) % all.length])
}

export function scanDay(nowMs) {
  return Math.floor(nowMs / DAY_MS)
}

// Themes that resolved to a broad topic rather than a specific team, company,
// person or place ("fintech startup" for a contact with no company). Their
// rows can show on Today, but they never push: only the model's judgment
// would stand between a generic headline and a notification.
export function broadThemePairs(data) {
  const broad = new Set()
  for (const { contact, theme } of livePairs(data)) {
    if (theme.entityType === 'topic') broad.add(pairKey(contact.id, theme.label))
  }
  return broad
}

// content_key is the stable identity of a result — the same headline for the
// same contact+theme maps to the same key across scans. The client keys
// "sent"/"skipped" state on it, so its format must not change.
export function contentKeyFor(contactId, themeLabel, headline) {
  return `${String(contactId)}|${themeLabel}|${headline}`
}

export function normalizeLink(link) {
  const raw = String(link || '').trim()
  if (!raw) return ''
  try {
    const u = new URL(raw)
    for (const k of [...u.searchParams.keys()]) {
      if (/^utm_/i.test(k) || k === 'oc') u.searchParams.delete(k)
    }
    u.hash = ''
    return u.toString()
  } catch {
    return raw
  }
}

export function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// story_key identifies the article itself (not the contact/theme it matched),
// so the durable dedupe in notified_stories survives re-ranking, a theme being
// renamed, or the same story matching two themes: sha1 of the article link,
// else of the RSS guid, else of the normalized title.
export function storyKeyFor({ link, guid, title } = {}) {
  const l = normalizeLink(link)
  if (l) return sha1(l)
  if (guid && String(guid).trim()) return sha1(String(guid).trim())
  return sha1(normalizeTitle(title))
}

function isSeedOrMissing(c) {
  return !c || c.seed
}

// Birthday is the first non-news signal source. It emits a scan_results row on
// the day itself, so it flows through the same dedupe, notified tracking, push
// and digest machinery as scored news. The content_key includes the occurrence
// year so it fires once per birthday and again next year.
export function birthdayRowsForUser(data, userId, notifiedByKey, scannedAt, now = new Date()) {
  const { contacts = [] } = data || {}
  const rows = []
  for (const c of Array.isArray(contacts) ? contacts : []) {
    if (isSeedOrMissing(c)) continue
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
      published_at: scannedAt,
      engine: 'birthday',
      story_key: sha1(key),
      relevant: true,
    })
  }
  return rows
}

// Does this user have any signal today that warrants processing, even with no
// themes to scan? (Keeps birthday-only users from being skipped.)
export function hasBirthdayToday(data, now = new Date()) {
  return (Array.isArray(data?.contacts) ? data.contacts : [])
    .some(c => !isSeedOrMissing(c) && daysUntilBirthday(c.birthday, now) === 0)
}

// content_key → notified_at from the user's existing rows (only rows that
// carry both a key and a notified timestamp count).
export function notifiedKeyMap(existingRows) {
  const m = new Map()
  for (const r of existingRows || []) {
    if (r.content_key && r.notified_at) m.set(r.content_key, r.notified_at)
  }
  return m
}

// story_key → notified_at, so a story re-found under a slightly different
// headline (same link) keeps its notified state too.
export function notifiedStoryMap(existingRows) {
  const m = new Map()
  for (const r of existingRows || []) {
    if (r.story_key && r.notified_at) m.set(r.story_key, r.notified_at)
  }
  return m
}

function clampScore(v) {
  return Math.max(0, Math.min(100, Math.round(Number(v))))
}

// Shape scored news into storage rows, carrying notified_at forward for any
// story the user was already alerted to. Only Claude-scored, relevant items
// can be above the bar; everything else is stored as below-bar context.
export function shapeResultRows(found, scoreById, userId, notifiedByKey, scannedAt, { notifiedByStory = new Map() } = {}) {
  return found.map(({ contact, theme, item }, i) => {
    const scored = scoreById.get(i) || {}
    const engine = scored.engine || 'unscored'
    const usable = engine === 'claude' && Number.isFinite(Number(scored.score)) && scored.score !== null
    const score = usable ? clampScore(scored.score) : 0
    const relevant = usable && scored.relevant === true
    const above = relevant && score >= SIGNIFICANCE_THRESHOLD
    const key = contentKeyFor(contact.id, theme.label, item.title)
    const storyKey = storyKeyFor(item)
    let rationale = usable ? (scored.rationale ?? null) : null
    // No dedicated column: a heads-up rides as a structured prefix on the
    // rationale, which the client parses back out (old rows are unaffected).
    if (usable && scored.eventWhen) rationale = `[Heads-up · ${scored.eventWhen}] ${rationale ?? ''}`.trim()
    return {
      user_id: userId,
      contact_id: String(contact.id),
      contact_name: contact.name ?? null,
      theme_label: theme.label,
      theme_category: theme.category ?? null,
      headline: item.title,
      source: item.source ?? null,
      link: item.link || null,
      score,
      rationale,
      // Above the bar: the reach-out draft. Below it: the scorer's note for
      // passing a relevant story along (a favor), when it judged one fits.
      draft_message: above ? (scored.draftMessage ?? null) : (relevant ? (scored.passAlong ?? null) : null),
      above_bar: above,
      content_key: key,
      notified_at: notifiedByKey.get(key) ?? notifiedByStory.get(storyKey) ?? null,
      scanned_at: scannedAt,
      published_at: item.publishedAt || null,
      engine,
      story_key: storyKey,
      relevant,
    }
  })
}

function stripNewFields(rows) {
  return rows.map(r => {
    const copy = { ...r }
    for (const f of NEW_ROW_FIELDS) delete copy[f]
    return copy
  })
}

async function insertRows(supabase, rows, state) {
  let { error } = await supabase.from('scan_results').insert(state.legacyRowColumns ? stripNewFields(rows) : rows)
  if (error && !state.legacyRowColumns && isMissingColumnError(error)) {
    console.error(`[scan] scan_results is missing the 0005 columns (${error.message}); writing rows without published_at/engine/story_key/relevant until migration 0005 is applied`)
    state.legacyRowColumns = true
    ;({ error } = await supabase.from('scan_results').insert(stripNewFields(rows)))
  }
  if (error) throw new UserScanError('insert', error.message)
}

async function markScanned(supabase, userId, scannedAt, state) {
  if (state.noLastScanned) return
  const { error } = await supabase.from('user_data').update({ last_scanned_at: scannedAt }).eq('user_id', userId)
  if (!error) return
  if (isMissingColumnError(error)) {
    state.noLastScanned = true
    console.error('[scan] user_data.last_scanned_at is missing; apply migration 0007 so the scan order rotates')
  } else {
    console.error(`[scan] could not record last_scanned_at for ${shortId(userId)}: ${error.message}`)
  }
}

const defaultScore = (items, opts) => scoreItems(items, { allowFallback: false, ...opts })

// Scan one user. Throws UserScanError (with .stage) when nothing should be
// written for them; otherwise returns per-user stats. `pairs` is the slice to
// scan now; `complete` says whether it covers all of the user's pairs (only
// then is last_scanned_at bumped, so a user cut off by the cap goes first next
// time).
export async function scanUser(supabase, userId, data, {
  pairs = pairsForUser(data),
  complete = true,
  now = Date.now,
  deadline,
  score = defaultScore,
  fetchNews = fetchThemeNews,
  state = {},
  recordScanTime = true,
} = {}) {
  const nowMs = now()
  const scannedAt = new Date(nowMs).toISOString()
  const stats = {
    status: 'scanned', themes: pairs.length, news_ok: 0, news_failed: 0, items_found: 0,
    items_claude: 0, items_unscored: 0, above_bar: 0, rows_written: 0, rows_deleted: 0, cleanup_error: null,
  }

  // 1. News: up to 8 recent items per theme (the query carries when:3d), keep
  // the freshest one published in the last 72 hours. Cost stays one scored
  // item per theme.
  const refreshed = new Set()
  const found = []
  if (pairs.length) {
    const settled = await Promise.allSettled(pairs.map(async ({ theme }) => {
      // Search with the refined query when the theme has one, else the label.
      const items = await fetchNews(theme.query || theme.label, NEWS_ITEMS_PER_THEME)
      return filterFresh(items || [], { now: nowMs })[0] || null
    }))
    settled.forEach((r, i) => {
      if (r.status !== 'fulfilled') { stats.news_failed++; return }
      stats.news_ok++
      refreshed.add(pairKey(pairs[i].contact.id, pairs[i].theme.label))
      if (r.value) found.push({ ...pairs[i], item: r.value })
    })
    if (stats.news_ok === 0) throw new UserScanError('news', `all ${pairs.length} news fetches failed`)
  }
  stats.items_found = found.length

  // 2. Score with Claude — no keyword fallback on this path.
  let scoreById = new Map()
  if (found.length) {
    const items = found.map((f, i) => ({
      id: i,
      headline: f.item.title,
      source: f.item.source,
      pubDate: f.item.pubDate,
      publishedAt: f.item.publishedAt,
      link: f.item.link,
      themeLabel: f.theme.label,
      themeQuery: f.theme.query || undefined,
      entityType: f.theme.entityType || undefined,
      watchFor: Array.isArray(f.theme.watchFor) ? f.theme.watchFor : undefined,
      contactName: f.contact.name,
      contactCompany: f.contact.company,
      contactRole: f.contact.role,
    }))
    const res = await score(items, { deadline, now })
    if (!res || !res.ok) throw new UserScanError('score', res?.error || 'scoring failed')
    scoreById = new Map((res.results || []).map(r => [r.id, r]))
  }

  // 3. Existing rows: notified_at carry-forward and cleanup. A failed read
  // must not be mistaken for "no rows" (every story would look new).
  const { data: existing, error: readErr } = await supabase.from('scan_results').select('*').eq('user_id', userId)
  if (readErr) throw new UserScanError('read', readErr.message)

  const notifiedByKey = notifiedKeyMap(existing)
  const rows = [
    ...(found.length ? shapeResultRows(found, scoreById, userId, notifiedByKey, scannedAt, { notifiedByStory: notifiedStoryMap(existing) }) : []),
    ...birthdayRowsForUser(data, userId, notifiedByKey, scannedAt, new Date(nowMs)),
  ]

  // 4. Which stored rows does this scan supersede? Pairs refreshed this run
  // (whether or not they had fresh news), pairs that no longer exist (deleted
  // themes or contacts, sample contacts), earlier birthday rows, and anything
  // older than the 72h freshness window (it can never be pushed again, so
  // dropping it loses no dedupe memory). Recent rows for pairs whose fetch
  // failed, or that the cap left unscanned, are kept.
  const live = new Set(livePairs(data).map(p => pairKey(p.contact.id, p.theme.label)))
  const staleBefore = nowMs - FRESH_HOURS * 3600000
  const isStale = (r) => {
    const t = Date.parse(r.published_at || r.scanned_at || '')
    return Number.isFinite(t) && t < staleBefore
  }
  const supersededIds = (existing || [])
    .filter(r => {
      if (r.theme_category === 'birthday') return true
      const k = pairKey(r.contact_id, r.theme_label)
      return refreshed.has(k) || !live.has(k) || isStale(r)
    })
    .map(r => r.id)
    .filter(id => id !== undefined && id !== null)

  // 5. Insert first, then delete what was superseded.
  if (rows.length) {
    await insertRows(supabase, rows, state)
    stats.rows_written = rows.length
  }
  if (supersededIds.length) {
    const { error: delErr } = await supabase.from('scan_results').delete().in('id', supersededIds)
    if (delErr) {
      stats.cleanup_error = delErr.message
      console.error(`[scan] user ${shortId(userId)}: new rows written but old rows not removed: ${delErr.message}`)
    } else {
      stats.rows_deleted = supersededIds.length
    }
  }

  for (const r of rows) {
    if (r.engine === 'claude') stats.items_claude++
    else if (r.engine === 'unscored') stats.items_unscored++
    if (r.above_bar) stats.above_bar++
  }

  if (complete && recordScanTime) await markScanned(supabase, userId, scannedAt, state)
  return stats
}

// Read every user_data row, least recently scanned first. Paginated: a single
// select is silently capped at 1000 rows by PostgREST.
async function loadUsers(supabase, state) {
  const PAGE = 500
  const MAX_PAGES = 40
  const read = (ordered, from) => {
    let q = supabase.from('user_data').select(ordered ? 'user_id, data, last_scanned_at' : 'user_id, data')
    q = ordered
      ? q.order('last_scanned_at', { ascending: true, nullsFirst: true }).order('user_id', { ascending: true })
      : q.order('user_id', { ascending: true })
    return q.range(from, from + PAGE - 1)
  }
  let ordered = !state.noLastScanned
  const rows = []
  for (let page = 0; page < MAX_PAGES; page++) {
    let { data, error } = await read(ordered, page * PAGE)
    if (error && ordered && page === 0 && isMissingColumnError(error)) {
      console.error(`[scan] user_data.last_scanned_at is missing (${error.message}); apply migration 0007. Scanning in user_id order.`)
      ordered = false
      state.noLastScanned = true
      ;({ data, error } = await read(false, 0))
    }
    if (error) throw new Error(`read user_data: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  state.ordered = ordered
  return rows
}

export async function runScan(supabase, {
  maxPairsPerUser = MAX_PAIRS_PER_USER,
  maxPairsTotal = MAX_PAIRS_TOTAL,
  budgetMs = SCAN_BUDGET_MS,
  llmDeadlineMs = LLM_DEADLINE_MS,
  now = Date.now,
  startedAt,
  score,
  fetchNews,
} = {}) {
  const startMs = startedAt ? new Date(startedAt).getTime() : now()
  const day = scanDay(startMs)
  const state = {}
  const users = await loadUsers(supabase, state)

  const summary = {
    started_at: new Date(startMs).toISOString(),
    finished_at: null,
    ordered_by: state.ordered ? 'last_scanned_at' : 'user_id',
    users_total: users.length,
    users_scanned: 0,
    users_skipped: 0,
    users_errored: 0,
    users_idle: 0,
    pairs_waiting: 0, // themes past the per-user cap, scanned on another day
    items_claude: 0,
    items_fallback: 0, // items not scored by Claude (omitted by the model); never keyword-scored
    above_bar: 0,
    rows_written: 0,
    news_failed: 0,
    cleanup_errors: 0,
    rows_expired: 0,
    errors: [],
    // Original response keys, kept for existing callers.
    usersScanned: 0,
    usersWithThemes: 0,
    resultsWritten: 0,
  }
  const erroredUserIds = []
  const processedUserIds = []
  const prefsByUser = new Map()
  const broadPairsByUser = new Map()
  let totalPairs = 0

  for (const row of users) {
    const data = row?.data && typeof row.data === 'object' ? row.data : {}
    prefsByUser.set(row.user_id, data.prefs && typeof data.prefs === 'object' ? data.prefs : {})
    broadPairsByUser.set(row.user_id, broadThemePairs(data))
    const all = pairsForUser(data, maxPairsPerUser, { day })
    const birthday = hasBirthdayToday(data, new Date(now()))
    if (all.length === 0 && !birthday) { summary.users_idle++; continue }
    summary.pairs_waiting += Math.max(0, livePairs(data).length - all.length)

    if (now() - startMs > budgetMs) { summary.users_skipped++; continue }
    const pairs = all.slice(0, Math.max(0, maxPairsTotal - totalPairs))
    const complete = pairs.length === all.length
    if (pairs.length === 0 && !birthday) { summary.users_skipped++; continue }
    totalPairs += pairs.length

    try {
      const stats = await scanUser(supabase, row.user_id, data, {
        pairs, complete, now, deadline: startMs + llmDeadlineMs, score, fetchNews, state,
      })
      if (complete) summary.users_scanned++
      else summary.users_skipped++ // cut off by the cap: birthdays/partial themes written, first in line next run
      if (pairs.length) summary.usersWithThemes++
      summary.items_claude += stats.items_claude
      summary.items_fallback += stats.items_unscored
      summary.above_bar += stats.above_bar
      summary.rows_written += stats.rows_written
      summary.news_failed += stats.news_failed
      if (stats.cleanup_error) {
        summary.cleanup_errors++
        summary.errors.push({ user: shortId(row.user_id), stage: 'cleanup', message: String(stats.cleanup_error).slice(0, 300) })
      }
      processedUserIds.push(row.user_id)
    } catch (err) {
      summary.users_errored++
      erroredUserIds.push(row.user_id)
      const stage = err?.stage || 'unexpected'
      const message = String(err?.message || err).slice(0, 300)
      summary.errors.push({ user: shortId(row.user_id), stage, message })
      console.error(`[scan] user ${shortId(row.user_id)} failed at ${stage}: ${message}`)
    }
  }

  // Rows past the freshness window can never be shown or pushed again.
  // Scanned users lose theirs above; this sweep covers everyone else (idle
  // accounts with no themes left, users skipped or errored this run), whose
  // rows would otherwise sit there for good.
  const expireBefore = new Date(now() - FRESH_HOURS * 3600000).toISOString()
  const { error: expireErr, count: expired } = await supabase
    .from('scan_results').delete({ count: 'exact' }).lt('scanned_at', expireBefore)
  if (expireErr) {
    summary.cleanup_errors++
    summary.errors.push({ user: 'all', stage: 'expire', message: String(expireErr.message).slice(0, 300) })
    console.error(`[scan] could not remove expired rows: ${expireErr.message}`)
  } else {
    summary.rows_expired = expired || 0
  }

  summary.usersScanned = processedUserIds.length
  summary.resultsWritten = summary.rows_written
  summary.finished_at = new Date(now()).toISOString()
  // Internal hand-off to the push step; non-enumerable so it never lands in a
  // JSON response or log line.
  Object.defineProperty(summary, 'internal', {
    value: { erroredUserIds, processedUserIds, prefsByUser, broadPairsByUser },
    enumerable: false,
  })
  return summary
}

// One user, on demand (api/rescan.js — the client's "Check again"). Same rules
// as the cron: no keyword fallback, seeds skipped, rows untouched on failure.
// It does not push (the user is looking at the app) and does not bump
// last_scanned_at (that tracks the cron rotation; otherwise users who tap
// "Check again" would sort last and could stop getting pushes).
export async function rescanUser(supabase, userId, { now = Date.now, score, fetchNews, maxPairsPerUser = MAX_PAIRS_PER_USER, deadlineMs = 50000 } = {}) {
  const { data: row, error } = await supabase.from('user_data').select('user_id, data').eq('user_id', userId).maybeSingle()
  if (error) throw new UserScanError('read', error.message)
  const data = row?.data && typeof row.data === 'object' ? row.data : {}
  const pairs = pairsForUser(data, maxPairsPerUser, { day: scanDay(now()) })
  if (pairs.length === 0 && !hasBirthdayToday(data, new Date(now()))) {
    return { status: 'idle', themes: 0, news_ok: 0, news_failed: 0, items_found: 0, items_claude: 0, items_unscored: 0, above_bar: 0, rows_written: 0, rows_deleted: 0, cleanup_error: null }
  }
  return scanUser(supabase, userId, data, {
    pairs, complete: true, recordScanTime: false, now, deadline: now() + deadlineMs, score, fetchNews, state: {},
  })
}
