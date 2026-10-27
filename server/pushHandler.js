// APNs push send service. Picks each user's push-worthy stories from the
// current scan, applies the push gate, caps and durable dedupe, sends one
// notification per user per run, and records what was sent.
//
// The notification budget (CLAUDE.md; pinned by notificationBudget.test.js):
// at most one notification a day and three a week per person (birthdays get
// through the weekly cap), one per contact a week, only between 8 AM and 9 PM
// in the person's own time zone, and never with a sound. A run that would
// notify an unusual share of everyone is held by the breaker instead.
//
// Push gate (stricter than the display bar, because a false-positive push is
// the worst outcome):
//  - engine 'claude' (never keyword-scored), relevant === true,
//    score (significance) >= PUSH_THRESHOLD (80), or the theme's own bar + 10
//    when the person raised it ("Too small to text about"; up to 95),
//    published within 72 hours;
//  - never from a theme that resolved to a broad topic (entityType 'topic' in
//    the user's saved themes): those rows can show on Today but don't push;
//  - birthdays (theme_category 'birthday') are always eligible on the day;
//  - at most MAX_STORIES_PER_USER_PER_DAY stories per user per rolling 24h and
//    one story per contact per CONTACT_COOLDOWN_DAYS (birthdays exempt);
//  - a story (story_key = sha1 of the article link) is pushed at most once per
//    user, ever, decided against notified_stories (migration 0006). Without
//    that table it falls back to scan_results.notified_at, which only
//    remembers what is still stored (the old one-scan-deep behaviour).
//  - users with prefs.push === false in their saved data are skipped.
// Stories are claimed (notified_stories row, or notified_at) BEFORE sending and
// released only if no device accepted the push: a crash mid-run can lose a
// push but can never send the same one twice. scan_results.notified_at is
// still set for every pushed row.
//
// PREVIEW MODE (default until Apple creds are set): computes exactly what it
// WOULD send and sends nothing — safe to run anytime. To actually send, set:
//   APNS_KEY        contents of the .p8 auth key (PEM, or base64 of it)
//   APNS_KEY_ID     the key's 10-char id
//   APNS_TEAM_ID    your Apple Developer team id
//   APNS_BUNDLE_ID  app.harbored
//   APNS_ENV        production | sandbox   (default production)
//
// Logs never contain device tokens, emails or contact names.

import http2 from 'node:http2'
import jwt from 'jsonwebtoken'
import { pushBarFor } from './scoreHandler.js'
import { FRESH_HOURS } from './newsHandler.js'
import { broadThemePairs, themeBarPairs, pairKey } from './scanHandler.js'
import { isDuplicateKeyError, isMissingTableError, shortId } from './db.js'

export const MAX_STORIES_PER_USER_PER_DAY = 2
export const MAX_PUSHES_PER_USER_PER_WEEK = 3
export const CONTACT_COOLDOWN_DAYS = 7
// Local hours a push may land in (start inclusive, end exclusive), in the
// time zone the app reports (prefs.tz). The daily run at 16:00 UTC is 8 AM to
// noon across the continental US, so this mostly holds pushes for people
// elsewhere; their reasons still wait on Today.
export const PUSH_HOURS = { start: 8, end: 21 }
// Blast-radius breaker: a run that would notify at least this many people and
// more than this share of everyone with a device is more likely a scoring bug
// than news. It holds every push and the run alerts the owner instead.
// PUSH_BREAKER_OFF=1 lets one deliberate run through.
export const BREAKER_MIN_USERS = 5
export const BREAKER_SHARE = 0.5
export const NOTIFIED_RETENTION_DAYS = 90
const HOUR = 3600000
const DAY = 24 * HOUR
// notified_stories history window: covers the contact cooldown, and anything
// older is past the 72h freshness gate anyway.
const HISTORY_DAYS = 8

const APNS_HOSTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
}

function apnsConfigured() {
  return !!(process.env.APNS_KEY && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_BUNDLE_ID)
}

// The .p8 is multi-line PEM. Accept it either raw (fine in the Vercel env UI) or
// base64-encoded (easier as a single-line value in .env.local).
function apnsPrivateKey() {
  const raw = process.env.APNS_KEY || ''
  return raw.includes('BEGIN') ? raw : Buffer.from(raw, 'base64').toString('utf8')
}

// APNs provider JWT (ES256). Valid up to 1h; minted once per run.
function providerJwt() {
  return jwt.sign({}, apnsPrivateKey(), {
    algorithm: 'ES256',
    keyid: process.env.APNS_KEY_ID,
    issuer: process.env.APNS_TEAM_ID,
  })
}

export function isBirthdayRow(row) {
  return row?.theme_category === 'birthday'
}

// The hour (0-23) it is now in an IANA time zone, or null if there isn't a
// usable one.
export function localHour(timeZone, nowMs = Date.now()) {
  if (!timeZone || typeof timeZone !== 'string') return null
  try {
    const h = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(nowMs)))
    return Number.isFinite(h) ? h % 24 : null
  } catch {
    return null
  }
}

// Unknown time zones count as inside the window: the run time already suits
// the US, where every current account is.
export function withinPushHours(timeZone, nowMs = Date.now()) {
  const h = localHour(timeZone, nowMs)
  return h === null || (h >= PUSH_HOURS.start && h < PUSH_HOURS.end)
}

export function rowStoryKey(row) {
  return row.story_key || row.content_key || `${row.contact_id}|${row.theme_label}|${row.headline}`
}

// Why a stored row may NOT be pushed, or null when it may. Columns from
// migration 0005 (engine, relevant, published_at) are checked whenever they
// exist on the row; before 0005 is applied, freshness and Claude-only scoring
// are guaranteed by the scan itself and push only reads the current run's rows.
// `broadPairs` holds the user's broad-topic themes (scanHandler.broadThemePairs),
// `themeBars` the themes with their own bar (scanHandler.themeBarPairs).
export function pushGateReason(row, nowMs = Date.now(), { broadPairs, themeBars } = {}) {
  if (!row || row.above_bar !== true) return 'below-bar'
  if (row.notified_at) return 'already-notified'
  if (isBirthdayRow(row)) return null
  if (broadPairs?.has(pairKey(row.contact_id, row.theme_label))) return 'broad-theme'
  const has = (k) => Object.prototype.hasOwnProperty.call(row, k)
  if (has('engine') && row.engine !== 'claude') return 'not-claude'
  if (has('relevant') && row.relevant !== true) return 'not-relevant'
  const score = Number(row.score)
  if (!Number.isFinite(score) || score < pushBarFor(themeBars?.get(pairKey(row.contact_id, row.theme_label)))) return 'below-push-bar'
  if (has('published_at')) {
    const published = row.published_at ? Date.parse(row.published_at) : NaN
    if (!Number.isFinite(published)) return 'no-publish-date'
    if (nowMs - published > FRESH_HOURS * HOUR) return 'stale'
  }
  return null
}

function historyFor(rows) {
  const stories = new Map()
  const lastByContact = new Map()
  const times = []
  for (const r of rows || []) {
    const t = Date.parse(r.notified_at)
    if (!Number.isFinite(t)) continue
    if (r.story_key) stories.set(r.story_key, r.notified_at)
    if (r.contact_id !== undefined && r.contact_id !== null) {
      const c = String(r.contact_id)
      lastByContact.set(c, Math.max(lastByContact.get(c) || 0, t))
    }
    times.push(t)
  }
  return { stories, lastByContact, times }
}

// Decide which of one user's candidate rows to push now. Pure (exported for
// tests). Birthdays first, then highest significance.
export function selectStoriesToPush(rows, history, {
  nowMs = Date.now(),
  maxPerDay = MAX_STORIES_PER_USER_PER_DAY,
  maxPerWeek = MAX_PUSHES_PER_USER_PER_WEEK,
  cooldownDays = CONTACT_COOLDOWN_DAYS,
  broadPairs,
  themeBars,
} = {}) {
  const h = history || historyFor([])
  const sorted = [...rows].sort((a, b) =>
    (Number(isBirthdayRow(b)) - Number(isBirthdayRow(a))) || (Number(b.score) - Number(a.score)))
  const counts = { gated: {}, deduped: 0, capped_daily: 0, capped_contact: 0, capped_weekly: 0 }
  const recent = h.times.filter(t => nowMs - t < DAY).length
  // Stories pushed together share one notified_at, so distinct times in the
  // last week are the notifications this person has had.
  const pushesThisWeek = new Set(h.times.filter(t => nowMs - t < 7 * DAY)).size
  const toPush = []
  const byKey = new Map()
  const alreadyNotified = []
  const contactsThisRun = new Set()

  for (const row of sorted) {
    const reason = pushGateReason(row, nowMs, { broadPairs, themeBars })
    if (reason) { counts.gated[reason] = (counts.gated[reason] || 0) + 1; continue }
    const key = rowStoryKey(row)
    if (h.stories.has(key)) {
      alreadyNotified.push({ row, notifiedAt: h.stories.get(key) })
      counts.deduped++
      continue
    }
    if (byKey.has(key)) { byKey.get(key).rows.push(row); continue } // same story matched another theme/contact
    const contact = String(row.contact_id)
    if (!isBirthdayRow(row)) {
      const last = h.lastByContact.get(contact)
      if (contactsThisRun.has(contact) || (last && nowMs - last < cooldownDays * DAY)) { counts.capped_contact++; continue }
      if (pushesThisWeek >= maxPerWeek) { counts.capped_weekly++; continue }
    }
    if (recent + toPush.length >= maxPerDay) { counts.capped_daily++; continue }
    const entry = { key, row, rows: [row] }
    toPush.push(entry)
    byKey.set(key, entry)
    contactsThisRun.add(contact)
  }
  return { toPush, alreadyNotified, counts }
}

export function buildPayload(topItem, count) {
  // A single birthday signal gets a birthday-native title instead of the
  // generic "Reach out to …" framing. Keyed on the category, not the label, so
  // a user theme literally named "Birthday" doesn't get it.
  const isBirthday = isBirthdayRow(topItem)
  const first = (topItem.contact_name || '').split(' ')[0] || topItem.contact_name
  let title
  if (count > 1) title = `${count} people worth reaching out to`
  else if (isBirthday) title = `🎂 It's ${first}'s birthday`
  else title = `Reach out to ${topItem.contact_name}`
  return {
    aps: {
      // No sound: the notification shows on the lock screen and in
      // Notification Center, but never buzzes or chimes.
      alert: { title, body: topItem.headline },
      badge: count,
    },
    // Deep-link target for when the user taps the notification.
    url: '/dashboard',
  }
}

function apnsReason(body) {
  try { return String(JSON.parse(body)?.reason || '') } catch { return '' }
}

// Send one push to one device token via APNs HTTP/2. Always resolves
// {ok, status, reason}; never rejects, never hangs past timeoutMs.
function sendApns(getSession, providerToken, deviceToken, payload, { collapseId, timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    let settled = false
    let timer = null
    let req = null
    let status = 0
    let body = ''
    const finish = (result) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolve(result)
    }
    try {
      const headers = {
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        authorization: `bearer ${providerToken}`,
        'apns-topic': process.env.APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
      }
      if (collapseId) headers['apns-collapse-id'] = collapseId
      req = getSession().request(headers)
    } catch (err) {
      finish({ ok: false, status: 0, reason: `request failed: ${err?.code || err?.message || err}` })
      return
    }
    timer = setTimeout(() => {
      try { req.close(http2.constants.NGHTTP2_CANCEL) } catch { /* already closed */ }
      finish({ ok: false, status: 0, reason: 'timeout' })
    }, timeoutMs)
    req.on('response', (headers) => { status = Number(headers[':status']) || 0 })
    req.setEncoding('utf8')
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => finish({ ok: status === 200, status, reason: apnsReason(body) }))
    req.on('close', () => finish({ ok: status === 200, status, reason: apnsReason(body) || (status ? '' : 'stream closed') }))
    req.on('error', (err) => finish({ ok: false, status, reason: `stream error: ${err?.code || err?.message || err}` }))
    req.end(JSON.stringify(payload))
  })
}

// Live APNs transport: one HTTP/2 session, reconnected if it dies. The
// session 'error' listener matters: without it a connection error is an
// unhandled 'error' event that crashes the whole invocation.
export function createApnsTransport({ timeoutMs = 10000 } = {}) {
  const env = ['sandbox', 'development'].includes(process.env.APNS_ENV) ? 'sandbox' : 'production'
  const providerToken = providerJwt()
  let session = null
  const getSession = () => {
    if (session && !session.closed && !session.destroyed) return session
    session = http2.connect(APNS_HOSTS[env])
    session.on('error', (err) => console.error(`[push] APNs connection error: ${err?.code || err?.message || err}`))
    session.on('goaway', () => { /* the next request reconnects */ })
    return session
  }
  return {
    send: (deviceToken, payload, opts = {}) => sendApns(getSession, providerToken, deviceToken, payload, { timeoutMs, ...opts }),
    close: () => { if (session) { try { session.close() } catch { /* ignore */ } } },
  }
}

function isUnregistered(res) {
  return res.status === 410 || res.reason === 'Unregistered'
}
function isBadToken(res) {
  return res.reason === 'BadDeviceToken'
}

async function loadCandidates(supabase, { since, userIds }) {
  let q = supabase.from('scan_results').select('*').eq('above_bar', true).is('notified_at', null)
  if (since) q = q.gte('scanned_at', since)
  if (userIds) q = q.in('user_id', userIds)
  const { data, error } = await q.order('score', { ascending: false })
  if (error) throw new Error(`read scan_results: ${error.message}`)
  return data || []
}

// What the gate needs from each user's saved data: prefs, broad themes and
// themes with their own bar.
async function loadUserContext(supabase, userIds) {
  const { data, error } = await supabase.from('user_data').select('user_id, data').in('user_id', userIds)
  if (error) throw new Error(`read user_data: ${error.message}`)
  const prefs = new Map()
  const broadPairs = new Map()
  const themeBars = new Map()
  for (const r of data || []) {
    prefs.set(r.user_id, r?.data?.prefs && typeof r.data.prefs === 'object' ? r.data.prefs : {})
    broadPairs.set(r.user_id, broadThemePairs(r?.data))
    themeBars.set(r.user_id, themeBarPairs(r?.data))
  }
  return { prefs, broadPairs, themeBars }
}

async function loadHistory(supabase, userIds, nowMs) {
  const since = new Date(nowMs - HISTORY_DAYS * DAY).toISOString()
  const { data, error } = await supabase
    .from('notified_stories')
    .select('user_id, contact_id, story_key, notified_at')
    .in('user_id', userIds)
    .gte('notified_at', since)
  if (!error) return { mode: 'notified_stories', rows: data || [] }
  if (!isMissingTableError(error)) throw new Error(`read notified_stories: ${error.message}`)

  console.error('[push] notified_stories is missing; apply migration 0006. Deduping on scan_results.notified_at (one scan deep).')
  const fb = await supabase.from('scan_results').select('*').in('user_id', userIds).gte('notified_at', since)
  if (fb.error) throw new Error(`read scan_results history: ${fb.error.message}`)
  return {
    mode: 'scan_results',
    rows: (fb.data || []).map(r => ({ user_id: r.user_id, contact_id: r.contact_id, story_key: rowStoryKey(r), notified_at: r.notified_at })),
  }
}

async function markRowsNotified(supabase, ids, notifiedAt) {
  if (!ids.length) return null
  const { error } = await supabase.from('scan_results').update({ notified_at: notifiedAt }).in('id', ids)
  return error || null
}

async function claimStories(supabase, userId, entries, nowIso, mode) {
  if (mode === 'notified_stories') {
    const claimed = []
    for (const e of entries) {
      const { error } = await supabase.from('notified_stories').insert({
        user_id: userId, contact_id: String(e.row.contact_id), story_key: e.key, notified_at: nowIso,
      })
      if (!error) claimed.push(e)
      else if (!isDuplicateKeyError(error)) {
        // Can't record it, so don't send it (a send we can't remember could
        // repeat tomorrow). Release what this user already claimed.
        await releaseClaims(supabase, userId, claimed, mode)
        throw new Error(`record notified_stories: ${error.message}`)
      }
      // Duplicate key: another run already told them about this story.
    }
    return claimed
  }
  const err = await markRowsNotified(supabase, entries.flatMap(e => e.rows.map(r => r.id)), nowIso)
  if (err) throw new Error(`mark scan_results notified: ${err.message}`)
  return entries
}

async function releaseClaims(supabase, userId, entries, mode) {
  if (!entries.length) return
  const { error } = mode === 'notified_stories'
    ? await supabase.from('notified_stories').delete().eq('user_id', userId).in('story_key', entries.map(e => e.key))
    : await supabase.from('scan_results').update({ notified_at: null }).in('id', entries.flatMap(e => e.rows.map(r => r.id)))
  if (error) console.error(`[push] could not release unsent stories for ${shortId(userId)}: ${error.message}`)
}

export async function runPush(supabase, {
  send = true,
  since,
  userIds,
  excludeUserIds = [],
  prefsByUser,
  broadPairsByUser,
  themeBarsByUser,
  now = Date.now,
  deadline,
  transport,
  maxPerDay = MAX_STORIES_PER_USER_PER_DAY,
  maxPerWeek = MAX_PUSHES_PER_USER_PER_WEEK,
  cooldownDays = CONTACT_COOLDOWN_DAYS,
} = {}) {
  const nowMs = now()
  const nowIso = new Date(nowMs).toISOString()
  // Only the current run's rows (api/scan.js passes the run start). Standalone
  // calls look back 24h, so a first install or a newly configured APNs key
  // never flushes a backlog of old stories.
  const sinceIso = since === null ? null : (since || new Date(nowMs - DAY).toISOString())

  const summary = {
    usersWithNew: 0, devicesPushed: 0, usersNoDevice: 0, previews: [],
    live: false, dedupe: null, candidates: 0,
    users_excluded: 0, users_prefs_off: 0, users_errored: 0, users_deferred: 0,
    users_quiet_hours: 0, held_by_breaker: 0,
    gated: {}, deduped: 0, capped_daily: 0, capped_contact: 0, capped_weekly: 0, stories_pushed: 0,
    pushes_attempted: 0, pushes_ok: 0, pushes_failed: 0, tokens_pruned: 0,
    errors: [],
  }

  const rows = await loadCandidates(supabase, { since: sinceIso, userIds })
  summary.candidates = rows.length
  const excluded = new Set(excludeUserIds)
  const byUser = new Map()
  for (const r of rows) {
    if (excluded.has(r.user_id)) continue
    const arr = byUser.get(r.user_id) || []
    arr.push(r)
    byUser.set(r.user_id, arr)
  }
  summary.users_excluded = new Set(rows.filter(r => excluded.has(r.user_id)).map(r => r.user_id)).size
  if (byUser.size === 0) return summary

  const users = [...byUser.keys()]
  // The scan hands over what it already read; a standalone run reads it.
  const context = prefsByUser instanceof Map && broadPairsByUser instanceof Map && themeBarsByUser instanceof Map
    ? { prefs: prefsByUser, broadPairs: broadPairsByUser, themeBars: themeBarsByUser }
    : await loadUserContext(supabase, users)
  const prefs = context.prefs
  const { mode, rows: historyRows } = await loadHistory(supabase, users, nowMs)
  summary.dedupe = mode
  const historyByUser = new Map()
  for (const h of historyRows) {
    const arr = historyByUser.get(h.user_id) || []
    arr.push(h)
    historyByUser.set(h.user_id, arr)
  }

  // Decide first (pure), then fetch tokens only for users with something to send.
  const plans = []
  for (const userId of users) {
    if (prefs.get(userId)?.push === false) { summary.users_prefs_off++; continue }
    const plan = selectStoriesToPush(byUser.get(userId), historyFor(historyByUser.get(userId)), {
      nowMs, maxPerDay, maxPerWeek, cooldownDays, broadPairs: context.broadPairs.get(userId), themeBars: context.themeBars.get(userId),
    })
    for (const [reason, n] of Object.entries(plan.counts.gated)) summary.gated[reason] = (summary.gated[reason] || 0) + n
    summary.deduped += plan.counts.deduped
    summary.capped_daily += plan.counts.capped_daily
    summary.capped_contact += plan.counts.capped_contact
    summary.capped_weekly += plan.counts.capped_weekly
    plans.push({ userId, ...plan })
  }
  const pushable = plans.filter(p => p.toPush.length)
  summary.usersWithNew = pushable.length

  const live = send && (transport ? true : apnsConfigured())
  summary.live = live

  // Bookkeeping: rows whose story was already pushed get notified_at too.
  if (live) {
    for (const p of plans) {
      for (const { row, notifiedAt } of p.alreadyNotified) {
        const err = await markRowsNotified(supabase, [row.id], notifiedAt)
        if (err) console.error(`[push] could not mark a deduped row for ${shortId(p.userId)}: ${err.message}`)
      }
    }
  }
  if (pushable.length === 0) return summary

  // Quiet hours, in each person's own time zone. Nothing is claimed, so the
  // story can still go out on a later run while it's fresh.
  const ready = pushable.filter(p => {
    if (withinPushHours(prefs.get(p.userId)?.tz, nowMs)) return true
    summary.users_quiet_hours++
    return false
  })
  if (ready.length === 0) return summary

  // The breaker: hold everything rather than notify half the user base on
  // what is more likely a scoring bug than a news day.
  if (live && !process.env.PUSH_BREAKER_OFF && ready.length >= BREAKER_MIN_USERS) {
    const { data: deviceRows, error: dErr } = await supabase.from('device_tokens').select('user_id')
    if (dErr) throw new Error(`read device_tokens: ${dErr.message}`)
    const withDevices = new Set((deviceRows || []).map(r => r.user_id)).size
    if (ready.length > withDevices * BREAKER_SHARE) {
      summary.held_by_breaker = ready.length
      summary.errors.push({ user: 'all', message: `breaker held ${ready.length} pushes (${withDevices} people have a device); check scoring, then set PUSH_BREAKER_OFF=1 for one run if it's real news` })
      console.error(`[push] breaker held ${ready.length} pushes out of ${withDevices} people with a device`)
      return summary
    }
  }

  const { data: tokenRows, error: tErr } = await supabase
    .from('device_tokens')
    .select('user_id, token')
    .in('user_id', ready.map(p => p.userId))
  if (tErr) throw new Error(`read device_tokens: ${tErr.message}`)
  const tokensByUser = new Map()
  for (const t of tokenRows || []) {
    const arr = tokensByUser.get(t.user_id) || []
    if (t.token && !arr.includes(t.token)) arr.push(t.token)
    tokensByUser.set(t.user_id, arr)
  }

  const apns = live ? (transport || createApnsTransport()) : null
  const unregistered = new Set()
  const badTokens = new Set()
  const dayKey = nowIso.slice(0, 10)

  try {
    for (const plan of ready) {
      const { userId } = plan
      const tokens = tokensByUser.get(userId) || []
      if (tokens.length === 0) { summary.usersNoDevice++; continue }

      if (!live) {
        const payload = buildPayload(plan.toPush[0].row, plan.toPush.length)
        summary.previews.push({ user: shortId(userId), devices: tokens.length, items: plan.toPush.length, title: payload.aps.alert.title })
        continue
      }
      if (deadline && now() > deadline) { summary.users_deferred++; continue }

      try {
        const claimed = await claimStories(supabase, userId, plan.toPush, nowIso, mode)
        if (claimed.length === 0) continue
        const payload = buildPayload(claimed[0].row, claimed.length)
        // One collapse id per user per day: a second push that day replaces
        // the first in Notification Center instead of stacking.
        const collapseId = `harbored-${shortId(userId)}-${dayKey}`
        let accepted = 0
        for (const deviceToken of tokens) {
          const res = await apns.send(deviceToken, payload, { collapseId })
          summary.pushes_attempted++
          if (res.ok) { accepted++; summary.pushes_ok++; continue }
          if (isUnregistered(res)) { unregistered.add(deviceToken); continue }
          if (isBadToken(res)) { badTokens.add(deviceToken); continue }
          summary.pushes_failed++
          console.error(`[push] APNs ${res.status || 'no status'}${res.reason ? ` ${res.reason}` : ''} for user ${shortId(userId)}`)
        }
        if (accepted === 0) {
          await releaseClaims(supabase, userId, claimed, mode)
          continue
        }
        summary.devicesPushed += accepted
        summary.stories_pushed += claimed.length
        if (mode === 'notified_stories') {
          const err = await markRowsNotified(supabase, claimed.flatMap(e => e.rows.map(r => r.id)), nowIso)
          if (err) console.error(`[push] sent, but could not set notified_at for ${shortId(userId)}: ${err.message}`)
        }
      } catch (err) {
        summary.users_errored++
        summary.errors.push({ user: shortId(userId), message: String(err?.message || err).slice(0, 300) })
        console.error(`[push] user ${shortId(userId)} failed: ${err?.message || err}`)
      }
    }
  } finally {
    if (apns && !transport) apns.close()
  }

  // Dead tokens. 410/Unregistered is always safe to delete. BadDeviceToken is
  // also what every token returns when APNS_ENV or the topic is misconfigured,
  // so it's only trusted when this run proved the config works (some send
  // succeeded); otherwise it's counted as a failure and alerts instead.
  const dead = [...unregistered]
  if (summary.pushes_ok > 0) dead.push(...badTokens)
  else summary.pushes_failed += badTokens.size
  for (const token of dead) {
    const { error } = await supabase.from('device_tokens').delete().eq('token', token)
    if (error) console.error(`[push] could not remove a dead device token: ${error.message}`)
    else summary.tokens_pruned++
  }

  // Keep notified_stories bounded (~90 days of history).
  if (live && mode === 'notified_stories') {
    const cutoff = new Date(nowMs - NOTIFIED_RETENTION_DAYS * DAY).toISOString()
    const { error } = await supabase.from('notified_stories').delete().lt('notified_at', cutoff)
    if (error) console.error(`[push] notified_stories retention cleanup failed: ${error.message}`)
  }

  return summary
}
