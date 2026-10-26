import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { runPush } from './pushHandler.js'
import { runDigest } from './digestHandler.js'
import { createFakeSupabase } from './testing/fakeSupabase.js'
import { installGuards, removeGuards } from './testing/guards.js'

// These run against an in-memory Supabase that applies every filter
// (eq/is/in/gte/order...), so dropping e.g. `.is('notified_at', null)` or the
// above_bar filter from production code makes them fail. The old stub ignored
// filters and returned the same rows for every query.

const NOW = Date.parse('2026-10-21T13:00:00Z')
const iso = (ms) => new Date(ms).toISOString()
const fresh = { scanned_at: iso(NOW - 60000), published_at: iso(NOW - 3 * 3600000), engine: 'claude', relevant: true }

beforeEach(() => { installGuards() })
afterEach(() => removeGuards())

describe('runPush (preview)', () => {
  it('targets only users with a device token, counts the rest as no-device', async () => {
    const supabase = createFakeSupabase({
      tables: {
        scan_results: [
          { id: 'r1', user_id: 'u1', contact_id: '1', contact_name: 'Kellan Carney', theme_label: 'Fintech', headline: 'Big fintech news', score: 88, above_bar: true, notified_at: null, story_key: 's1', ...fresh },
          { id: 'r2', user_id: 'u2', contact_id: '2', contact_name: 'Sarah Chen', theme_label: 'F1', headline: 'F1 news', score: 85, above_bar: true, notified_at: null, story_key: 's2', ...fresh },
          // Filtered out by the query itself: already notified, below the bar, or from an older scan.
          { id: 'r3', user_id: 'u3', contact_id: '3', contact_name: 'X', theme_label: 'T', headline: 'h', score: 95, above_bar: true, notified_at: iso(NOW - 3600000), story_key: 's3', ...fresh },
          { id: 'r4', user_id: 'u4', contact_id: '4', contact_name: 'Y', theme_label: 'T', headline: 'h', score: 40, above_bar: false, notified_at: null, story_key: 's4', ...fresh },
          { id: 'r5', user_id: 'u5', contact_id: '5', contact_name: 'Z', theme_label: 'T', headline: 'h', score: 95, above_bar: true, notified_at: null, story_key: 's5', ...fresh, scanned_at: iso(NOW - 3 * 24 * 3600000) },
        ],
        device_tokens: [{ user_id: 'u1', token: 'tok-1' }],
        user_data: [{ user_id: 'u1', data: {} }, { user_id: 'u2', data: {} }],
      },
    })
    const summary = await runPush(supabase, { send: false, now: () => NOW })
    expect(summary.candidates).toBe(2)
    expect(summary.usersWithNew).toBe(2)
    expect(summary.usersNoDevice).toBe(1)
    expect(summary.devicesPushed).toBe(0) // preview never sends
    expect(summary.previews).toHaveLength(1)
    expect(summary.previews[0].title).toBe('Reach out to Kellan Carney')
    // Preview never writes.
    expect(supabase.rows('scan_results').every(r => r.id === 'r3' || r.notified_at === null)).toBe(true)
    expect(supabase.rows('notified_stories')).toEqual([])
  })

  it('does nothing when there are no new opportunities', async () => {
    const supabase = createFakeSupabase({ tables: { scan_results: [] } })
    const summary = await runPush(supabase, { send: false, now: () => NOW })
    expect(summary.usersWithNew).toBe(0)
    expect(summary.previews).toHaveLength(0)
  })
})

describe('runDigest (preview)', () => {
  const users = [{ id: 'u1', email: 'kellan@example.com', user_metadata: { name: 'Kellan Carney' } }]
  const digestRow = (over = {}) => ({ id: 'r1', user_id: 'u1', contact_name: 'Kellan Carney', theme_label: 'Fintech', headline: 'News', rationale: 'why', score: 88, above_bar: true, scanned_at: iso(NOW - 86400000), ...over })

  it('groups new opportunities per user and resolves their email', async () => {
    const supabase = createFakeSupabase({
      tables: {
        scan_results: [
          digestRow(),
          digestRow({ id: 'r2', above_bar: false }),                              // below the bar
          digestRow({ id: 'r3', scanned_at: iso(NOW - 9 * 86400000) }),          // older than a week
          digestRow({ id: 'r4', engine: 'unscored' }),                           // not scored by Claude
        ],
        user_data: [{ user_id: 'u1', data: { prefs: { recap: true } } }],
      },
      users,
    })
    const summary = await runDigest(supabase, { send: false, now: () => NOW })
    expect(summary.usersWithOpportunities).toBe(1)
    expect(summary.previews).toHaveLength(1)
    expect(summary.previews[0].to).toContain('@example.com')
    expect(summary.previews[0].items).toBe(1)
  })

  it('skips users whose email cannot be resolved', async () => {
    const supabase = createFakeSupabase({
      tables: { scan_results: [digestRow({ contact_name: 'X', theme_label: 't', headline: 'h', rationale: '' })], user_data: [{ user_id: 'u1', data: { prefs: { recap: true } } }] },
      users: [], // no users → no email
    })
    const summary = await runDigest(supabase, { send: false, now: () => NOW })
    expect(summary.skippedNoEmail).toBe(1)
    expect(summary.previews).toHaveLength(0)
  })

  it('emails only people who opted in themselves: never by default, never on the old digest flag', async () => {
    const supabase = createFakeSupabase({
      tables: {
        scan_results: [digestRow(), digestRow({ id: 'r5', user_id: 'u2' }), digestRow({ id: 'r6', user_id: 'u3' })],
        user_data: [
          { user_id: 'u1', data: { prefs: { digest: true } } }, // the old default-on flag
          { user_id: 'u2', data: {} },                            // never chose anything
          { user_id: 'u3', data: { prefs: { recap: false } } },  // switched it off
        ],
      },
      users,
    })
    const summary = await runDigest(supabase, { send: false, now: () => NOW })
    expect(summary.skippedOptOut).toBe(3)
    expect(summary.previews).toHaveLength(0)
  })

  it('never logs the address of a failed send', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 422 })))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = createFakeSupabase({ tables: { scan_results: [digestRow()], user_data: [{ user_id: 'u1', data: { prefs: { recap: true } } }] }, users })
    const summary = await runDigest(supabase, { now: () => NOW })
    expect(summary.sendFailures).toBe(1)
    expect(spy.mock.calls.flat().join(' ')).not.toContain('kellan@')
    spy.mockRestore()
  })
})
