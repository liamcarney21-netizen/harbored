import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pushGateReason, selectStoriesToPush, runPush, buildPayload, localHour, withinPushHours } from './pushHandler.js'
import { createFakeSupabase } from './testing/fakeSupabase.js'
import { installGuards, removeGuards } from './testing/guards.js'

const H = 3600000
const NOW = Date.parse('2026-10-21T13:00:00Z')
const iso = (ms) => new Date(ms).toISOString()

let n = 0
const row = (over = {}) => ({
  id: `r${++n}`,
  user_id: 'u1',
  contact_id: '1',
  contact_name: 'Ann Lee',
  theme_label: 'Lakers',
  theme_category: 'sports',
  headline: `Lakers story ${n}`,
  score: 90,
  above_bar: true,
  notified_at: null,
  scanned_at: iso(NOW),
  published_at: iso(NOW - 2 * H),
  engine: 'claude',
  relevant: true,
  story_key: `story-${n}`,
  content_key: `1|Lakers|Lakers story ${n}`,
  ...over,
})

function transportWith(results = {}) {
  const sends = []
  return {
    sends,
    send: vi.fn(async (token, payload, opts) => {
      sends.push({ token, payload, opts })
      return results[token] || { ok: true, status: 200, reason: '' }
    }),
    close() {},
  }
}

beforeEach(() => {
  installGuards()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); removeGuards() })

describe('push gate (test f)', () => {
  it('requires Claude, relevance, significance ≥ 80 and a publish date within 72h', () => {
    expect(pushGateReason(row(), NOW)).toBe(null)
    expect(pushGateReason(row({ engine: 'unscored' }), NOW)).toBe('not-claude')
    expect(pushGateReason(row({ engine: 'heuristic' }), NOW)).toBe('not-claude')
    expect(pushGateReason(row({ engine: null }), NOW)).toBe('not-claude') // pre-0005 row after the migration
    expect(pushGateReason(row({ relevant: false }), NOW)).toBe('not-relevant')
    expect(pushGateReason(row({ relevant: null }), NOW)).toBe('not-relevant')
    expect(pushGateReason(row({ score: 79 }), NOW)).toBe('below-push-bar')
    expect(pushGateReason(row({ score: 75, above_bar: true }), NOW)).toBe('below-push-bar') // shown, not pushed
    expect(pushGateReason(row({ published_at: iso(NOW - 73 * H) }), NOW)).toBe('stale')
    expect(pushGateReason(row({ published_at: null }), NOW)).toBe('no-publish-date')
    expect(pushGateReason(row({ above_bar: false }), NOW)).toBe('below-bar')
    expect(pushGateReason(row({ notified_at: iso(NOW) }), NOW)).toBe('already-notified')
  })

  it('lets birthdays through and, before migration 0005, relies on above_bar + score', () => {
    expect(pushGateReason(row({ theme_category: 'birthday', theme_label: 'Birthday', engine: 'birthday', score: 100 }), NOW)).toBe(null)
    const legacy = row()
    for (const k of ['engine', 'relevant', 'published_at']) delete legacy[k]
    expect(pushGateReason(legacy, NOW)).toBe(null)
    expect(pushGateReason({ ...legacy, score: 70 }, NOW)).toBe('below-push-bar')
  })

  it('caps at 2 stories per user per day and 1 per contact per 7 days', () => {
    const history = {
      stories: new Map(),
      lastByContact: new Map([['2', NOW - 3 * 24 * H]]), // Bo was notified 3 days ago
      times: [NOW - 2 * H],                               // one story already today
    }
    const rows = [
      row({ contact_id: '1', score: 95 }),
      row({ contact_id: '1', score: 94 }), // same contact, same run
      row({ contact_id: '2', score: 93 }), // contact cooldown
      row({ contact_id: '3', score: 92 }),
      row({ contact_id: '4', score: 91 }), // over the daily cap
    ]
    const plan = selectStoriesToPush(rows, history, { nowMs: NOW })
    expect(plan.toPush.map(e => e.row.contact_id)).toEqual(['1'])
    expect(plan.counts).toMatchObject({ capped_contact: 2, capped_daily: 2 })
    expect(selectStoriesToPush(rows, { stories: new Map(), lastByContact: new Map(), times: [] }, { nowMs: NOW }).toPush.map(e => e.row.contact_id)).toEqual(['1', '2'])
  })

  it('dedupes on story_key and pushes a story matched by two themes once', () => {
    const rows = [row({ story_key: 'S', contact_id: '1' }), row({ story_key: 'S', contact_id: '2', theme_label: 'NBA' }), row({ story_key: 'OLD' })]
    const history = { stories: new Map([['OLD', iso(NOW - 30 * H)]]), lastByContact: new Map(), times: [] }
    const plan = selectStoriesToPush(rows, history, { nowMs: NOW })
    expect(plan.toPush).toHaveLength(1)
    expect(plan.toPush[0].rows).toHaveLength(2)
    expect(plan.counts.deduped).toBe(1)
  })

  it('titles birthdays by category, not by the label', () => {
    expect(buildPayload(row({ theme_category: 'birthday', theme_label: 'Birthday' }), 1).aps.alert.title).toBe("🎂 It's Ann's birthday")
    expect(buildPayload(row({ theme_label: 'Birthday' }), 1).aps.alert.title).toBe('Reach out to Ann Lee')
  })
})

describe('broad themes', () => {
  it('never pushes from a theme that resolved to a broad topic; birthdays are exempt', () => {
    const broadPairs = new Set(['1|Lakers'])
    expect(pushGateReason(row(), NOW, { broadPairs })).toBe('broad-theme')
    expect(pushGateReason(row({ theme_label: 'Celtics' }), NOW, { broadPairs })).toBe(null)
    expect(pushGateReason(row({ theme_category: 'birthday', theme_label: 'Lakers' }), NOW, { broadPairs })).toBe(null)
  })

  it("reads the user's themes when the scan didn't hand them over", async () => {
    const broad = row({ theme_label: 'Fintech startup', score: 95 })
    const specific = row({ contact_id: '2', theme_label: 'Villanova', score: 85 })
    const supabase = createFakeSupabase({
      tables: {
        scan_results: [broad, specific],
        device_tokens: [{ user_id: 'u1', token: 't' }],
        user_data: [{ user_id: 'u1', data: { contacts: [{ id: 1, name: 'Ann Lee' }, { id: 2, name: 'Bo' }], themesByContact: {
          1: [{ id: 'a', label: 'Fintech startup', entityType: 'topic' }],
          2: [{ id: 'b', label: 'Villanova', entityType: 'team' }],
        } } }],
      },
    })
    const transport = transportWith()
    const summary = await runPush(supabase, { now: () => NOW, since: iso(NOW - H), transport })
    expect(summary.gated).toMatchObject({ 'broad-theme': 1 })
    expect(transport.sends).toHaveLength(1)
    expect(transport.sends[0].payload.aps.alert.body).toBe(specific.headline)
  })
})

describe('runPush (live, fake APNs)', () => {
  it('pushes once per user with a per-day collapse id, records the story and marks the rows', async () => {
    const r = row()
    const supabase = createFakeSupabase({ tables: { scan_results: [r], device_tokens: [{ user_id: 'u1', token: 'tok-a' }, { user_id: 'u1', token: 'tok-b' }], user_data: [{ user_id: 'u1', data: {} }] } })
    const transport = transportWith()
    const summary = await runPush(supabase, { now: () => NOW, since: iso(NOW - H), transport })
    expect(summary).toMatchObject({ live: true, dedupe: 'notified_stories', stories_pushed: 1, pushes_attempted: 2, pushes_ok: 2, pushes_failed: 0 })
    expect(transport.sends.map(s => s.opts.collapseId)).toEqual(['harbored-u1-2026-10-21', 'harbored-u1-2026-10-21'])
    expect(supabase.rows('notified_stories')).toEqual([{ user_id: 'u1', contact_id: '1', story_key: r.story_key, notified_at: iso(NOW) }])
    expect(supabase.rows('scan_results')[0].notified_at).toBe(iso(NOW))
  })

  it('skips users who turned push off, and users the scan marked as errored', async () => {
    const supabase = createFakeSupabase({
      tables: {
        scan_results: [row({ user_id: 'off' }), row({ user_id: 'bad' }), row({ user_id: 'on' })],
        device_tokens: [{ user_id: 'off', token: 't-off' }, { user_id: 'bad', token: 't-bad' }, { user_id: 'on', token: 't-on' }],
        user_data: [{ user_id: 'off', data: { prefs: { push: false } } }, { user_id: 'bad', data: {} }, { user_id: 'on', data: { prefs: { push: true } } }],
      },
    })
    const transport = transportWith()
    const summary = await runPush(supabase, { now: () => NOW, since: iso(NOW - H), transport, excludeUserIds: ['bad'] })
    expect(transport.sends.map(s => s.token)).toEqual(['t-on'])
    expect(summary).toMatchObject({ users_prefs_off: 1, users_excluded: 1 })
  })

  it('only considers rows from the current run', async () => {
    const supabase = createFakeSupabase({ tables: { scan_results: [row({ scanned_at: iso(NOW - 25 * H) })], device_tokens: [{ user_id: 'u1', token: 't' }] } })
    const transport = transportWith()
    const summary = await runPush(supabase, { now: () => NOW, transport }) // default: last 24h
    expect(summary.candidates).toBe(0)
    expect(transport.send).not.toHaveBeenCalled()
  })

  it('releases the claim when no device accepts, so the story is not lost as "sent"', async () => {
    const supabase = createFakeSupabase({ tables: { scan_results: [row()], device_tokens: [{ user_id: 'u1', token: 't' }], user_data: [{ user_id: 'u1', data: {} }] } })
    const transport = transportWith({ t: { ok: false, status: 500, reason: 'InternalServerError' } })
    const summary = await runPush(supabase, { now: () => NOW, since: iso(NOW - H), transport })
    expect(summary).toMatchObject({ pushes_failed: 1, stories_pushed: 0 })
    expect(supabase.rows('notified_stories')).toEqual([])
    expect(supabase.rows('scan_results')[0].notified_at).toBe(null)
  })

  it('deletes tokens APNs reports as Unregistered, and BadDeviceToken only once a send has worked', async () => {
    const tokens = [
      { user_id: 'u1', token: 'gone' }, { user_id: 'u1', token: 'bad' }, { user_id: 'u1', token: 'good' },
    ]
    const supabase = createFakeSupabase({ tables: { scan_results: [row()], device_tokens: tokens, user_data: [{ user_id: 'u1', data: {} }] } })
    const transport = transportWith({ gone: { ok: false, status: 410, reason: 'Unregistered' }, bad: { ok: false, status: 400, reason: 'BadDeviceToken' } })
    const summary = await runPush(supabase, { now: () => NOW, since: iso(NOW - H), transport })
    expect(summary).toMatchObject({ pushes_ok: 1, pushes_failed: 0, tokens_pruned: 2 })
    expect(supabase.rows('device_tokens').map(t => t.token)).toEqual(['good'])

    // Every token "bad" with no success: likely APNS_ENV/topic misconfig → keep them, count failures.
    const supabase2 = createFakeSupabase({ tables: { scan_results: [row()], device_tokens: [{ user_id: 'u1', token: 'bad' }], user_data: [{ user_id: 'u1', data: {} }] } })
    const s2 = await runPush(supabase2, { now: () => NOW, since: iso(NOW - H), transport: transportWith({ bad: { ok: false, status: 400, reason: 'BadDeviceToken' } }) })
    expect(s2).toMatchObject({ tokens_pruned: 0, pushes_failed: 1 })
    expect(supabase2.rows('device_tokens')).toHaveLength(1)
  })

  it('never logs device tokens or contact names', async () => {
    const supabase = createFakeSupabase({ tables: { scan_results: [row()], device_tokens: [{ user_id: 'u1', token: 'SECRET-TOKEN-123' }], user_data: [{ user_id: 'u1', data: {} }] } })
    await runPush(supabase, { now: () => NOW, since: iso(NOW - H), transport: transportWith({ 'SECRET-TOKEN-123': { ok: false, status: 403, reason: 'InvalidProviderToken' } }) })
    const logged = console.error.mock.calls.flat().join('\n')
    expect(logged).toContain('403')
    expect(logged).not.toContain('SECRET')
    expect(logged).not.toContain('Ann')
  })
})

describe('the notification budget', () => {
  const at = (ms) => ({ user_id: 'u1', contact_id: 'x', story_key: `s${ms}`, notified_at: iso(ms) })
  const historyOf = (rows) => {
    const times = rows.map(r => Date.parse(r.notified_at))
    return { stories: new Map(rows.map(r => [r.story_key, r.notified_at])), lastByContact: new Map(), times }
  }

  it('never buzzes: pushes carry no sound', () => {
    const payload = buildPayload(row(), 1)
    expect(payload.aps.sound).toBeUndefined()
    expect(payload.aps['interruption-level']).toBeUndefined()
  })

  it('holds stories once three notifications went out this week; a birthday still gets through', () => {
    const three = historyOf([at(NOW - 2 * 24 * H), at(NOW - 4 * 24 * H), at(NOW - 6 * 24 * H)])
    const news = row({ contact_id: '9' })
    const bday = row({ contact_id: '8', theme_category: 'birthday', theme_label: 'Birthday', score: 100 })
    const plan = selectStoriesToPush([news, bday], three, { nowMs: NOW })
    expect(plan.toPush.map(e => e.row.theme_category)).toEqual(['birthday'])
    expect(plan.counts.capped_weekly).toBe(1)
    // Two stories pushed together count as one notification, and pushes over a week old don't count.
    const two = historyOf([at(NOW - 2 * 24 * H), { ...at(NOW - 2 * 24 * H), story_key: 'twin' }, at(NOW - 8 * 24 * H), at(NOW - 3 * 24 * H)])
    expect(selectStoriesToPush([news], two, { nowMs: NOW }).toPush).toHaveLength(1)
  })

  it("reads the hour in the person's own time zone, and treats an unknown zone as inside the window", () => {
    expect(localHour('America/Chicago', NOW)).toBe(8)   // 13:00 UTC in October = 8 AM CDT
    expect(localHour('Asia/Tokyo', NOW)).toBe(22)
    expect(localHour('Not/AZone', NOW)).toBe(null)
    expect(withinPushHours('America/Chicago', NOW)).toBe(true)
    expect(withinPushHours('Asia/Tokyo', NOW)).toBe(false)
    expect(withinPushHours(undefined, NOW)).toBe(true)
  })

  it('holds a push that would land outside 8 AM to 9 PM local time, without spending the story', async () => {
    const tokyo = row({ user_id: 'tokyo' })
    const chicago = row({ user_id: 'chicago' })
    const supabase = createFakeSupabase({
      tables: {
        scan_results: [tokyo, chicago],
        device_tokens: [{ user_id: 'tokyo', token: 't-tokyo' }, { user_id: 'chicago', token: 't-chicago' }],
        user_data: [{ user_id: 'tokyo', data: { prefs: { tz: 'Asia/Tokyo' } } }, { user_id: 'chicago', data: { prefs: { tz: 'America/Chicago' } } }],
      },
    })
    const transport = transportWith()
    const summary = await runPush(supabase, { now: () => NOW, since: iso(NOW - H), transport })
    expect(transport.sends.map(x => x.token)).toEqual(['t-chicago'])
    expect(summary.users_quiet_hours).toBe(1)
    expect(supabase.rows('notified_stories').map(r => r.user_id)).toEqual(['chicago'])
    expect(supabase.rows('scan_results').find(r => r.user_id === 'tokyo').notified_at).toBe(null)
  })

  it('holds every push when one run would notify most people at once, and lets a deliberate run through', async () => {
    const users = ['a', 'b', 'c', 'd', 'e', 'f']
    const tables = () => ({
      scan_results: users.map(u => row({ user_id: u })),
      device_tokens: users.map(u => ({ user_id: u, token: `t-${u}` })),
      user_data: users.map(u => ({ user_id: u, data: {} })),
    })
    const held = createFakeSupabase({ tables: tables() })
    const transport = transportWith()
    const summary = await runPush(held, { now: () => NOW, since: iso(NOW - H), transport })
    expect(summary.held_by_breaker).toBe(6)
    expect(transport.sends).toHaveLength(0)
    expect(held.rows('notified_stories')).toHaveLength(0)

    vi.stubEnv('PUSH_BREAKER_OFF', '1')
    const through = createFakeSupabase({ tables: tables() })
    const t2 = transportWith()
    expect((await runPush(through, { now: () => NOW, since: iso(NOW - H), transport: t2 })).stories_pushed).toBe(6)
    vi.unstubAllEnvs()
  })
})
