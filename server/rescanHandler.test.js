import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleRescanRequest } from './rescanHandler.js'
import { createFakeSupabase } from './testing/fakeSupabase.js'
import { installGuards, removeGuards } from './testing/guards.js'

const NOW = Date.parse('2026-10-21T13:00:00Z')
const H = 3600000

function setup({ scan_results = [] } = {}) {
  return createFakeSupabase({
    sessions: { 'good-token': { id: 'u1', email: 'ann@example.com' } },
    tables: {
      user_data: [{ user_id: 'u1', data: { contacts: [{ id: 1, name: 'Ann Lee' }], themesByContact: { 1: [{ id: 't', label: 'Lakers' }] } } }],
      scan_results,
    },
  })
}
const fetchNews = async () => [{ title: 'Lakers land star guard', link: 'https://n/1', guid: '1', pubDate: '', publishedAt: new Date(NOW - H).toISOString(), source: 'ESPN' }]
const allow = () => true

beforeEach(() => { installGuards(); vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { vi.restoreAllMocks(); removeGuards() })

describe('POST /api/rescan', () => {
  it('rejects a missing or invalid token', async () => {
    const admin = setup()
    expect((await handleRescanRequest(undefined, { admin, limiter: allow })).status).toBe(401)
    expect((await handleRescanRequest('Bearer forged', { admin, limiter: allow })).status).toBe(401)
  })

  it('rate-limits per user id (3 per hour)', async () => {
    const admin = setup()
    const keys = []
    const limiter = (key, limit, windowMs) => { keys.push([key, limit, windowMs]); return false }
    const res = await handleRescanRequest('Bearer good-token', { admin, limiter })
    expect(res.status).toBe(429)
    expect(keys).toEqual([['rescan:u1', 3, 3600000]])
  })

  it("scans only the caller's account and returns the per-user summary", async () => {
    const admin = setup()
    const score = vi.fn(async (items) => ({ ok: true, results: items.map(i => ({ id: i.id, engine: 'claude', relevant: true, score: 88, draftMessage: 'Ann!' })) }))
    const res = await handleRescanRequest('Bearer good-token', { admin, limiter: allow, now: () => NOW, score, fetchNews })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, status: 'scanned', themes: 1, items_claude: 1, above_bar: 1, rows_written: 1 })
    expect(admin.rows('scan_results')).toEqual([expect.objectContaining({ user_id: 'u1', score: 88, engine: 'claude' })])
    // Rescans don't move the user in the cron rotation.
    expect(admin.rows('user_data')[0].last_scanned_at).toBeUndefined()
  })

  it('leaves stored results untouched when scoring is unavailable (no keyword fallback)', async () => {
    const existing = { id: 'keep', user_id: 'u1', contact_id: '1', theme_label: 'Lakers', headline: 'Yesterday', score: 75, above_bar: true, content_key: '1|Lakers|Yesterday', notified_at: null, scanned_at: new Date(NOW - 24 * H).toISOString() }
    const admin = setup({ scan_results: [existing] })
    const score = async () => ({ ok: false, error: 'HTTP 529 overloaded_error' })
    const res = await handleRescanRequest('Bearer good-token', { admin, limiter: allow, now: () => NOW, score, fetchNews })
    expect(res.status).toBe(502)
    expect(res.body.status).toBe('scoring_unavailable')
    expect(admin.rows('scan_results')).toEqual([existing])
  })
})
