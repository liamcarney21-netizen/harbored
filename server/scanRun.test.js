import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { runScheduledScan, sendAlert, pingHeartbeat } from './scanRun.js'
import { scoreItems } from './scoreHandler.js'
import { callClaude } from './llm.js'
import { storyKeyFor } from './scanHandler.js'
import { createFakeSupabase } from './testing/fakeSupabase.js'
import { installGuards, removeGuards, fakeClaudeFetch, noSleep } from './testing/guards.js'

const H = 3600000
const DAY0 = Date.parse('2026-10-19T13:00:00Z')

function newsItem(id, title, publishedMs) {
  return {
    title,
    link: `https://news.google.com/rss/articles/${id}?oc=5`,
    guid: id,
    pubDate: new Date(publishedMs).toUTCString(),
    publishedAt: new Date(publishedMs).toISOString(),
    source: 'Wire',
  }
}

function user(id, contacts, prefs) {
  const themesByContact = {}
  for (const c of contacts) themesByContact[c.id] = c.themes.map((label, i) => ({ id: `t${c.id}-${i}`, label, category: 'sports' }))
  return {
    user_id: id,
    data: { contacts: contacts.map(c => ({ id: c.id, name: c.name })), themesByContact, ...(prefs ? { prefs } : {}) },
  }
}

// Harness: real scoreItems → real callClaude → fake Anthropic transport.
function harness({ judge = () => ({ relevant: true, significance: 92, rationale: 'Real news.', draftMessage: 'Saw this!' }), fail, feed }) {
  const claude = fakeClaudeFetch({ judge, fail })
  const sends = []
  const transport = {
    send: vi.fn(async (token, payload, opts) => { sends.push({ token, payload, opts }); return { ok: true, status: 200, reason: '' } }),
    close() {},
  }
  const alert = vi.fn(async () => 'sent')
  const heartbeat = vi.fn(async () => 'sent')
  const options = (t) => ({
    now: () => t,
    scan: {
      fetchNews: async (query) => feed(query),
      score: (items, opts) => scoreItems(items, { allowFallback: false, ...opts, llm: (args) => callClaude({ ...args, fetchImpl: claude, sleep: noSleep }) }),
    },
    push: { transport },
    alert,
    heartbeat,
  })
  return { claude, sends, transport, alert, heartbeat, options }
}

let errorSpy
beforeEach(() => {
  installGuards()
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); removeGuards() })

describe('a Claude failure during the cron (test a)', () => {
  it("leaves that user's rows alone, pushes nothing for them, and marks the run unhealthy", async () => {
    const yesterday = {
      id: 'old-1', user_id: 'u1', contact_id: '1001', contact_name: 'Diego Alvarez', theme_label: 'Vikings',
      theme_category: 'sports', headline: 'Old Vikings headline', source: 'ESPN', link: 'https://x/old', score: 88,
      rationale: 'why', draft_message: 'Diego!', above_bar: true, content_key: '1001|Vikings|Old Vikings headline',
      notified_at: '2026-10-18T13:05:00Z', scanned_at: '2026-10-18T13:00:00Z',
    }
    const supabase = createFakeSupabase({
      tables: {
        user_data: [
          user('u1', [{ id: 1001, name: 'Diego Alvarez', themes: ['Vikings'] }]),
          user('u2', [{ id: 2001, name: 'Sarah Chen', themes: ['Villanova Basketball'] }]),
        ],
        scan_results: [yesterday],
        device_tokens: [{ user_id: 'u1', token: 'tok-u1' }, { user_id: 'u2', token: 'tok-u2' }],
      },
    })
    const h = harness({
      // Every attempt for u1's batch is overloaded; u2's batch is fine.
      fail: (body) => (body.messages[0].content.includes('FAILME') ? 529 : 0),
      feed: (q) => (q === 'Vikings'
        ? [newsItem('v1', 'FAILME Vikings sign star receiver', DAY0 - 2 * H)]
        : [newsItem('n1', 'Villanova wins the title', DAY0 - 3 * H)]),
    })

    const out = await runScheduledScan(supabase, h.options(DAY0))

    // u1: yesterday's row survives exactly as it was; nothing new written.
    expect(supabase.rows('scan_results').filter(r => r.user_id === 'u1')).toEqual([yesterday])
    // Three attempts (1 + 2 retries) for u1's batch, one for u2's.
    expect(h.claude.requests.filter(b => b.messages[0].content.includes('FAILME'))).toHaveLength(3)
    // Only u2's phone was pushed.
    expect(h.sends.map(s => s.token)).toEqual(['tok-u2'])
    const u2 = supabase.rows('scan_results').filter(r => r.user_id === 'u2')
    expect(u2).toHaveLength(1)
    expect(u2[0]).toMatchObject({ engine: 'claude', relevant: true, score: 92, above_bar: true })
    expect(u2[0].notified_at).toBeTruthy()

    expect(out.run).toMatchObject({ healthy: false, users_errored: 1, users_scanned: 1, items_claude: 1, items_fallback: 0, pushes_ok: 1 })
    expect(out.run.error).toContain('score')
    expect(supabase.rows('scan_runs')).toHaveLength(1)
    expect(supabase.rows('scan_runs')[0]).toMatchObject({ healthy: false, users_errored: 1 })
    expect(h.alert).toHaveBeenCalledTimes(1)
    expect(h.heartbeat).not.toHaveBeenCalled()
  })

  it('emails the alert through Resend with counts, not names', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    const resend = vi.fn(async () => new Response('{}', { status: 200 }))
    const run = { started_at: 's', finished_at: 'f', users_total: 2, users_scanned: 1, users_skipped: 0, users_errored: 1, items_claude: 1, items_fallback: 0, above_bar: 1, pushes_attempted: 1, pushes_ok: 1, pushes_failed: 0, healthy: false, error: 'user u1abcdef score: HTTP 529 overloaded_error' }
    expect(await sendAlert(run, { fetchImpl: resend })).toBe('sent')
    const [url, init] = resend.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ from: 'Harbored <onboarding@resend.dev>', to: ['harboredsupport@gmail.com'] })
    expect(body.subject).toContain('unhealthy')
    expect(body.text).toContain('errored 1')

    vi.stubEnv('ALERT_EMAIL', 'ops@example.com')
    await sendAlert(run, { fetchImpl: resend })
    expect(JSON.parse(resend.mock.calls[1][1].body).to).toEqual(['ops@example.com'])
  })

  it('pings the heartbeat only when configured', async () => {
    const hb = vi.fn(async () => new Response('ok', { status: 200 }))
    expect(await pingHeartbeat({ fetchImpl: hb })).toBe('skipped-no-url')
    vi.stubEnv('HEARTBEAT_URL', 'https://hb.example/ping/secret')
    expect(await pingHeartbeat({ fetchImpl: hb })).toBe('sent')
    expect(hb).toHaveBeenCalledWith('https://hb.example/ping/secret', expect.objectContaining({ method: 'GET' }))
  })
})

describe('H1 → H2 → H1 across three scans (test b)', () => {
  const H1 = () => newsItem('H1', 'Vikings sign star receiver', DAY0 - 1 * H)
  const H2 = () => newsItem('H2', 'Vikings name new head coach', DAY0 + 23 * H)

  async function threeScans(pushOptions = {}) {
    const supabase = createFakeSupabase({
      tables: {
        user_data: [user('u1', [{ id: 1001, name: 'Diego Alvarez', themes: ['Vikings'] }])],
        device_tokens: [{ user_id: 'u1', token: 'tok-u1' }],
      },
    })
    let feed = [H1()]
    const h = harness({ feed: () => feed })
    const run = async (t) => {
      const opts = h.options(t)
      return runScheduledScan(supabase, { ...opts, push: { ...opts.push, ...pushOptions } })
    }
    const r1 = await run(DAY0)
    feed = [H2()]
    const r2 = await run(DAY0 + 24 * H)
    feed = [H1()] // Google re-ranks: H1 is back on top (49h old, still "fresh")
    const r3 = await run(DAY0 + 48 * H)
    return { supabase, h, r1, r2, r3 }
  }

  it('never re-pushes H1, with the default caps', async () => {
    const { supabase, h, r3 } = await threeScans()
    expect(h.sends).toHaveLength(1)
    expect(h.sends[0].payload.aps.alert.body).toBe('Vikings sign star receiver')
    expect(r3.push.deduped).toBe(1)
    expect(supabase.rows('notified_stories').map(r => r.story_key)).toEqual([storyKeyFor(H1())])
  })

  it('never re-pushes H1 even with the caps out of the way (dedupe alone)', async () => {
    const { supabase, h, r2, r3 } = await threeScans({ cooldownDays: 0, maxPerDay: 10 })
    expect(h.sends.map(s => s.payload.aps.alert.body)).toEqual(['Vikings sign star receiver', 'Vikings name new head coach'])
    expect(r2.push.stories_pushed).toBe(1)
    expect(r3.push.stories_pushed).toBe(0)
    expect(r3.push.deduped).toBe(1)
    // The re-found H1 row is marked with the original notification time.
    const h1Row = supabase.rows('scan_results').find(r => r.headline === 'Vikings sign star receiver')
    expect(h1Row.notified_at).toBe(new Date(DAY0).toISOString())
    expect(r3.run.healthy).toBe(true)
  })
})

describe("one user's insert error (test c)", () => {
  it("doesn't stop the other users or the push", async () => {
    const supabase = createFakeSupabase({
      tables: {
        user_data: [
          user('u1', [{ id: 1, name: 'Ann Lee', themes: ['Lakers'] }]),
          user('u2', [{ id: 2, name: 'Bo Diaz', themes: ['Celtics'] }]),
          user('u3', [{ id: 3, name: 'Cy Park', themes: ['Knicks'] }]),
        ],
        scan_results: [{ id: 'keep-u2', user_id: 'u2', contact_id: '2', theme_label: 'Celtics', headline: 'Older Celtics news', score: 40, above_bar: false, content_key: '2|Celtics|Older Celtics news', notified_at: null, scanned_at: '2026-10-18T13:00:00Z' }],
        device_tokens: [{ user_id: 'u1', token: 't1' }, { user_id: 'u2', token: 't2' }, { user_id: 'u3', token: 't3' }],
      },
      failWhen: ({ table, op, rows }) => (table === 'scan_results' && op === 'insert' && rows[0].user_id === 'u2' ? { code: 'XX000', message: 'disk on fire' } : null),
    })
    const h = harness({
      // Ann's score comes back fractional (the column is an integer): stored as 73.
      judge: (item) => (item.theme === 'Lakers' ? { relevant: true, significance: 72.5, draftMessage: 'Ann!' } : { relevant: true, significance: 91, draftMessage: 'Hey!' }),
      feed: (q) => [newsItem(q, `${q} land a star in a blockbuster trade`, DAY0 - 4 * H)],
    })

    const out = await runScheduledScan(supabase, h.options(DAY0))

    expect(out.run).toMatchObject({ users_scanned: 2, users_errored: 1, healthy: false })
    expect(out.scan.errors).toEqual([expect.objectContaining({ user: 'u2', stage: 'insert' })])
    expect(supabase.rows('scan_results').filter(r => r.user_id === 'u2').map(r => r.id)).toEqual(['keep-u2'])
    const ann = supabase.rows('scan_results').find(r => r.user_id === 'u1')
    expect(ann.score).toBe(73)
    expect(ann.above_bar).toBe(true)
    // Push still ran: Cy (91) was pushed; Ann (73) is above the display bar
    // but below the push bar; Bo errored.
    expect(h.sends.map(s => s.token)).toEqual(['t3'])
  })
})

describe('rotation, seeds, freshness', () => {
  it('scans least-recently-scanned users first, stamps last_scanned_at, and reports the rest as skipped', async () => {
    const supabase = createFakeSupabase({
      tables: {
        user_data: [
          { ...user('a', [{ id: 1, name: 'Ann', themes: ['Lakers'] }]), last_scanned_at: '2026-10-18T13:00:00Z' },
          { ...user('b', [{ id: 2, name: 'Bo', themes: ['Celtics'] }]), last_scanned_at: null },
        ],
      },
    })
    const h = harness({ feed: (q) => [newsItem(q, `${q} news`, DAY0 - H)] })
    const first = await runScheduledScan(supabase, { ...h.options(DAY0), scan: { ...h.options(DAY0).scan, maxPairsTotal: 1 } })
    expect(first.scan).toMatchObject({ users_scanned: 1, users_skipped: 1, ordered_by: 'last_scanned_at' })
    expect(supabase.rows('scan_results').map(r => r.user_id)).toEqual(['b'])
    expect(supabase.rows('user_data').find(r => r.user_id === 'b').last_scanned_at).toBe(new Date(DAY0).toISOString())

    const second = await runScheduledScan(supabase, { ...h.options(DAY0 + 24 * H), scan: { ...h.options(DAY0 + 24 * H).scan, maxPairsTotal: 1 } })
    expect(second.scan.users_skipped).toBe(1)
    expect(supabase.rows('scan_results').map(r => r.user_id).sort()).toEqual(['a', 'b'])
  })

  it('never scans or pushes about sample (seed) contacts, including their birthdays', async () => {
    const today = new Date(DAY0)
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const supabase = createFakeSupabase({
      tables: {
        user_data: [{ user_id: 'u1', data: { contacts: [{ id: 3, name: 'Marcus Webb', seed: true, birthday: mmdd }], themesByContact: { 3: [{ id: 't', label: 'Villanova Basketball' }] } } }],
        device_tokens: [{ user_id: 'u1', token: 't1' }],
      },
    })
    const h = harness({ feed: () => { throw new Error('should not fetch news for seeds') } })
    const out = await runScheduledScan(supabase, h.options(DAY0))
    expect(out.scan).toMatchObject({ users_idle: 1, users_scanned: 0 })
    expect(h.claude).not.toHaveBeenCalled()
    expect(supabase.rows('scan_results')).toHaveLength(0)
    expect(h.sends).toHaveLength(0)
  })

  it('drops news older than 72 hours before scoring and clears the stale row', async () => {
    const supabase = createFakeSupabase({
      tables: {
        user_data: [user('u1', [{ id: 1, name: 'Ann', themes: ['Lakers'] }])],
        scan_results: [{ id: 'stale', user_id: 'u1', contact_id: '1', theme_label: 'Lakers', headline: 'Three-week-old story', score: 80, above_bar: true, content_key: '1|Lakers|Three-week-old story', notified_at: null, scanned_at: '2026-10-18T13:00:00Z' }],
      },
    })
    const h = harness({ feed: () => [newsItem('old', 'Lakers win historic title', DAY0 - 100 * H)] })
    const out = await runScheduledScan(supabase, h.options(DAY0))
    expect(h.claude).not.toHaveBeenCalled()
    expect(supabase.rows('scan_results')).toHaveLength(0)
    expect(out.run.healthy).toBe(true)
    expect(h.heartbeat).toHaveBeenCalledTimes(1)
  })

  it('keeps a recent row when its fetch fails, but clears rows older than 72 hours', async () => {
    const old = (theme, scannedMs) => ({ id: `old-${theme}`, user_id: 'u1', contact_id: '1', theme_label: theme, headline: `${theme} older story`, score: 50, above_bar: false, content_key: `1|${theme}|${theme} older story`, notified_at: null, scanned_at: new Date(scannedMs).toISOString() })
    const supabase = createFakeSupabase({
      tables: {
        user_data: [user('u1', [{ id: 1, name: 'Ann', themes: ['Lakers', 'Dodgers', 'Rams'] }])],
        scan_results: [old('Dodgers', DAY0 - 96 * H), old('Rams', DAY0 - 24 * H)],
      },
    })
    const h = harness({
      feed: (q) => {
        if (q === 'Lakers') return [newsItem('L', 'Lakers land star guard', DAY0 - H)]
        throw new Error('RSS fetch failed: 503')
      },
    })
    const out = await runScheduledScan(supabase, h.options(DAY0))
    expect(supabase.rows('scan_results').map(r => r.theme_label).sort()).toEqual(['Lakers', 'Rams'])
    expect(out.scan.news_failed).toBe(2)
    expect(out.scan.users_errored).toBe(0)
  })

  it('records items the model omitted as unscored, never pushes them, and flags the run', async () => {
    const supabase = createFakeSupabase({
      tables: {
        user_data: [user('u1', [{ id: 1, name: 'Ann', themes: ['Lakers', 'Dodgers'] }])],
        device_tokens: [{ user_id: 'u1', token: 't1' }],
      },
    })
    const h = harness({
      judge: (item) => (item.theme === 'Dodgers' ? undefined : { relevant: true, significance: 95, draftMessage: 'Ann!' }),
      feed: (q) => [newsItem(q, `${q} clinch the title`, DAY0 - H)],
    })
    const out = await runScheduledScan(supabase, h.options(DAY0))
    const dodgers = supabase.rows('scan_results').find(r => r.theme_label === 'Dodgers')
    expect(dodgers).toMatchObject({ engine: 'unscored', above_bar: false, score: 0, relevant: false, draft_message: null })
    expect(out.run).toMatchObject({ items_claude: 1, items_fallback: 1, healthy: false })
    expect(h.sends).toHaveLength(1)
    expect(h.sends[0].payload.aps.alert.body).toBe('Lakers clinch the title')
  })
})

describe('before the migrations are applied', () => {
  it('falls back to the old columns, the old dedupe and user_id order, and still pushes', async () => {
    const supabase = createFakeSupabase({
      missingTables: ['notified_stories', 'scan_runs'],
      missingColumns: { scan_results: ['published_at', 'engine', 'story_key', 'relevant'], user_data: ['last_scanned_at'] },
      tables: {
        user_data: [user('u1', [{ id: 1, name: 'Ann Lee', themes: ['Lakers'] }])],
        device_tokens: [{ user_id: 'u1', token: 't1' }],
      },
    })
    const h = harness({ feed: () => [newsItem('L', 'Lakers land star guard', DAY0 - H)] })
    const out = await runScheduledScan(supabase, h.options(DAY0))
    expect(out.scan.ordered_by).toBe('user_id')
    expect(out.recorded).toBe('missing-table')
    expect(out.push.dedupe).toBe('scan_results')
    const row = supabase.rows('scan_results')[0]
    expect(row).not.toHaveProperty('engine')
    expect(row.notified_at).toBe(new Date(DAY0).toISOString())
    expect(h.sends).toHaveLength(1)
    expect(out.run.healthy).toBe(true)
    const logged = errorSpy.mock.calls.flat().join('\n')
    expect(logged).toContain('0005')
    expect(logged).toContain('0006')
    expect(logged).toContain('0007')
    expect(logged).toContain('0004')

    // A rescan-style second run the same day doesn't re-push the stored story.
    const again = await runScheduledScan(supabase, h.options(DAY0 + H))
    expect(h.sends).toHaveLength(1)
    expect(again.push.stories_pushed || 0).toBe(0)
  })
})

describe('expired rows and theme rotation', () => {
  it('sweeps rows past the 72h window for every account, including ones with nothing to scan', async () => {
    const base = { user_id: 'idle', contact_id: '5', contact_name: 'Pat', theme_label: 'Lakers', source: 'Wire', link: null }
    const old = { ...base, id: 'gone', headline: 'Old', score: 85, above_bar: true, scanned_at: new Date(DAY0 - 80 * H).toISOString() }
    const recent = { ...base, id: 'kept', headline: 'Recent', score: 40, above_bar: false, scanned_at: new Date(DAY0 - 30 * H).toISOString() }
    const supabase = createFakeSupabase({ tables: { user_data: [{ user_id: 'idle', data: { contacts: [], themesByContact: {} } }], scan_results: [old, recent] } })
    const h = harness({ feed: () => [] })
    const out = await runScheduledScan(supabase, h.options(DAY0))
    expect(supabase.rows('scan_results').map(r => r.id)).toEqual(['kept'])
    expect(out.scan).toMatchObject({ users_idle: 1, rows_expired: 1, cleanup_errors: 0 })
    expect(out.run.healthy).toBe(true)
  })

  it('scans a window of themes past the per-user cap and counts the rest as waiting', async () => {
    const supabase = createFakeSupabase({
      tables: { user_data: [user('u1', [{ id: 1001, name: 'Diego Alvarez', themes: ['Vikings', 'Twins', 'Wild'] }])], scan_results: [] },
    })
    const queries = []
    const h = harness({ feed: (q) => { queries.push(q); return [] } })
    const opts = h.options(DAY0)
    const out = await runScheduledScan(supabase, { ...opts, scan: { ...opts.scan, maxPairsPerUser: 2 } })
    expect(queries).toHaveLength(2)
    expect(out.scan.pairs_waiting).toBe(1)
    // The next day's window starts where this one ended.
    const next = []
    const h2 = harness({ feed: (q) => { next.push(q); return [] } })
    const opts2 = h2.options(DAY0 + 24 * H)
    await runScheduledScan(supabase, { ...opts2, scan: { ...opts2.scan, maxPairsPerUser: 2 } })
    expect(new Set([...queries, ...next])).toEqual(new Set(['Vikings', 'Twins', 'Wild']))
  })
})

describe('scoring several fresh stories per theme', () => {
  it('scores the freshest three, stores only the best one, and can push it', async () => {
    const supabase = createFakeSupabase({
      tables: {
        user_data: [user('u1', [{ id: 1001, name: 'Diego Alvarez', themes: ['Vikings'] }])],
        scan_results: [],
        device_tokens: [{ user_id: 'u1', token: 'tok-u1' }],
      },
    })
    const feed = () => [
      newsItem('a', 'Vikings practice report', DAY0 - 1 * H),
      newsItem('b', 'Vikings trade for a star receiver', DAY0 - 5 * H),
      newsItem('c', 'Vikings injury notes', DAY0 - 9 * H),
      newsItem('d', 'Week-old Vikings column', DAY0 - 7 * 24 * H),
    ]
    const judge = (item) => /trade/.test(item.headline)
      ? { relevant: true, significance: 91, rationale: 'A real trade.', draftMessage: 'Diego, did you see the trade?' }
      : { relevant: true, significance: 30, rationale: 'Routine.' }
    const h = harness({ judge, feed })
    const out = await runScheduledScan(supabase, h.options(DAY0))
    const scored = JSON.parse(h.claude.requests[0].messages[0].content.split('<items>')[1].split('</items>')[0])
    expect(scored.map(i => i.headline)).toEqual(['Vikings practice report', 'Vikings trade for a star receiver', 'Vikings injury notes'])
    const rows = supabase.rows('scan_results')
    expect(rows.map(r => r.headline)).toEqual(['Vikings trade for a star receiver'])
    expect(rows[0]).toMatchObject({ above_bar: true, score: 91 })
    expect(out.push.stories_pushed).toBe(1)
  })
})

describe('a held run', () => {
  it('is unhealthy, so the owner is alerted, when the breaker holds pushes', async () => {
    const { buildRunRecord } = await import('./scanRun.js')
    const scan = { users_total: 6, users_scanned: 6, users_skipped: 0, users_errored: 0, items_claude: 6, items_fallback: 0, above_bar: 6, cleanup_errors: 0, errors: [] }
    const push = { held_by_breaker: 6, pushes_attempted: 0, pushes_ok: 0, pushes_failed: 0, users_errored: 0, errors: [{ user: 'all', message: 'breaker held 6 pushes (6 people have a device)' }] }
    const run = buildRunRecord({ startedAt: 'a', finishedAt: 'b', scan, push })
    expect(run.healthy).toBe(false)
    expect(run.error).toMatch(/breaker held 6 pushes/)
  })
})
