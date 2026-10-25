import { describe, it, expect } from 'vitest'
import { contentKeyFor, notifiedKeyMap, shapeResultRows, birthdayRowsForUser, pairsForUser, broadThemePairs, pairKey } from './scanHandler.js'

describe('birthdayRowsForUser', () => {
  const now = new Date(2026, 5, 1) // Jun 1, 2026
  const data = { contacts: [
    { id: 'c1', name: 'Sarah Chen', birthday: '06-01' }, // today
    { id: 'c2', name: 'Bob Jones', birthday: '12-25' },  // not today
    { id: 'c3', name: 'No Birthday', birthday: '' },
  ] }

  it('emits an above-bar row only for contacts whose birthday is today', () => {
    const rows = birthdayRowsForUser(data, 'u1', new Map(), 'ts', now)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      contact_name: 'Sarah Chen',
      theme_label: 'Birthday',
      above_bar: true,
      score: 100,
      content_key: 'birthday|c1|2026-06-01',
    })
    expect(rows[0].draft_message).toContain('Happy birthday, Sarah')
  })

  it('carries notified_at forward by content_key so it fires once', () => {
    const notified = new Map([['birthday|c1|2026-06-01', '2026-06-01T13:00:00Z']])
    const rows = birthdayRowsForUser(data, 'u1', notified, 'ts', now)
    expect(rows[0].notified_at).toBe('2026-06-01T13:00:00Z')
  })
})

describe('contentKeyFor', () => {
  it('builds a stable contact|theme|headline key, coercing ids to string', () => {
    expect(contentKeyFor(1, 'Fintech', 'Big news')).toBe('1|Fintech|Big news')
    expect(contentKeyFor(42, 't', 'h')).toBe('42|t|h')
  })
})

describe('notifiedKeyMap', () => {
  it('includes only rows with both a content_key and a notified_at', () => {
    const m = notifiedKeyMap([
      { content_key: 'a', notified_at: '2026-01-01T00:00:00Z' },
      { content_key: 'b', notified_at: null },                       // not yet notified
      { content_key: null, notified_at: '2026-01-01T00:00:00Z' },    // no key
    ])
    expect(m.size).toBe(1)
    expect(m.get('a')).toBe('2026-01-01T00:00:00Z')
    expect(m.has('b')).toBe(false)
  })

  it('handles null / empty input', () => {
    expect(notifiedKeyMap(null).size).toBe(0)
    expect(notifiedKeyMap([]).size).toBe(0)
  })
})

describe('shapeResultRows', () => {
  const found = [
    { contact: { id: 1, name: 'Kellan Carney' }, theme: { label: 'Fintech', category: 'industry' }, item: { title: 'Old headline', source: 'X', link: 'http://x' } },
    { contact: { id: 2, name: 'Sarah Chen' }, theme: { label: 'F1', category: 'sports' }, item: { title: 'Fresh headline', source: 'Y', link: 'http://y' } },
  ]
  // Shape of a scoreItems() result: engine + a separate relevance verdict.
  const scores = new Map([
    [0, { engine: 'claude', relevant: true, score: 78, rationale: 'why', draftMessage: 'draft' }], // above the reach-out bar (70)
    [1, { engine: 'claude', relevant: true, score: 30 }],                                          // below
  ])

  it('carries notified_at forward for a re-found headline, null for a new one', () => {
    const prior = notifiedKeyMap([
      { content_key: '1|Fintech|Old headline', notified_at: '2026-01-01T00:00:00Z' },
    ])
    const rows = shapeResultRows(found, scores, 'u1', prior, '2026-07-16T00:00:00Z')
    // Already alerted → carried forward (won't re-notify)
    expect(rows[0].content_key).toBe('1|Fintech|Old headline')
    expect(rows[0].notified_at).toBe('2026-01-01T00:00:00Z')
    // Never seen → pending
    expect(rows[1].notified_at).toBe(null)
  })

  it('sets above_bar + draft_message at/above threshold, clears them below', () => {
    const rows = shapeResultRows(found, scores, 'u1', new Map(), 'now')
    expect(rows[0]).toMatchObject({ above_bar: true, draft_message: 'draft', rationale: 'why', score: 78 })
    expect(rows[1]).toMatchObject({ above_bar: false, draft_message: null, score: 30 })
  })

  it('defaults a missing score to 0 (below bar)', () => {
    const rows = shapeResultRows([found[0]], new Map(), 'u1', new Map(), 'now')
    expect(rows[0].score).toBe(0)
    expect(rows[0].above_bar).toBe(false)
  })
})

describe('seeds, story keys and pairs', () => {
  it('never pairs or birthdays sample (seed) contacts', async () => {
    const { pairsForUser, hasBirthdayToday } = await import('./scanHandler.js')
    const now = new Date(2026, 5, 1)
    const data = {
      contacts: [
        { id: 3, name: 'Marcus Webb', seed: true, birthday: '06-01' },
        { id: 1717000000000, name: 'Real Person', birthday: '06-01' },
      ],
      themesByContact: { 3: [{ label: 'Villanova Basketball' }], 1717000000000: [{ label: 'Lakers' }] },
    }
    expect(pairsForUser(data).map(p => p.contact.name)).toEqual(['Real Person'])
    expect(birthdayRowsForUser(data, 'u1', new Map(), 'ts', now).map(r => r.contact_name)).toEqual(['Real Person'])
    expect(hasBirthdayToday({ contacts: [data.contacts[0]] }, now)).toBe(false)
  })

  it('keys stories by link (minus tracking params), then guid, then normalized title', async () => {
    const { storyKeyFor } = await import('./scanHandler.js')
    const a = storyKeyFor({ link: 'https://news.google.com/rss/articles/ABC?oc=5', title: 'One headline' })
    expect(a).toMatch(/^[0-9a-f]{40}$/)
    expect(storyKeyFor({ link: 'https://news.google.com/rss/articles/ABC', title: 'Different headline' })).toBe(a)
    expect(storyKeyFor({ guid: 'G1', title: 'x' })).toBe(storyKeyFor({ guid: 'G1', title: 'y' }))
    expect(storyKeyFor({ title: 'Vikings’ QB: "Ready!"' })).toBe(storyKeyFor({ title: 'vikings qb ready' }))
  })

  it('writes the new row fields and carries notified_at by story key', () => {
    const scored = new Map([[0, { engine: 'claude', relevant: true, score: 91, eventWhen: 'Saturday night', rationale: 'Big game.' }]])
    const item = { title: 'Lakers vs Celtics this weekend', link: 'https://n/1', publishedAt: '2026-07-16T00:00:00.000Z', source: 'ESPN' }
    const rows0 = shapeResultRows([{ contact: { id: 1, name: 'Ann' }, theme: { label: 'Lakers' }, item }], scored, 'u1', new Map(), 'now')
    expect(rows0[0]).toMatchObject({ engine: 'claude', relevant: true, published_at: '2026-07-16T00:00:00.000Z', rationale: '[Heads-up · Saturday night] Big game.' })
    const byStory = new Map([[rows0[0].story_key, '2026-07-15T13:00:00Z']])
    const renamed = shapeResultRows([{ contact: { id: 1, name: 'Ann' }, theme: { label: 'Lakers' }, item: { ...item, title: 'Lakers-Celtics on Saturday' } }], scored, 'u1', new Map(), 'now', { notifiedByStory: byStory })
    expect(renamed[0].notified_at).toBe('2026-07-15T13:00:00Z')
  })

  it('keeps a non-Claude or irrelevant result below the bar', () => {
    const found = [{ contact: { id: 1, name: 'A' }, theme: { label: 'T' }, item: { title: 'h', link: 'l' } }]
    expect(shapeResultRows(found, new Map([[0, { engine: 'heuristic', relevant: null, score: 95 }]]), 'u1', new Map(), 'now')[0]).toMatchObject({ above_bar: false, score: 0, engine: 'heuristic' })
    expect(shapeResultRows(found, new Map([[0, { engine: 'claude', relevant: false, score: 90 }]]), 'u1', new Map(), 'now')[0]).toMatchObject({ above_bar: false, relevant: false })
  })
})

describe('theme rotation and broad themes', () => {
  // Four people with two themes each: eight pairs, newest person first.
  const data = {
    contacts: [1, 2, 3, 4].map(i => ({ id: 1700000000000 + i, name: `P${i}` })),
    themesByContact: Object.fromEntries([1, 2, 3, 4].map(i => [1700000000000 + i, [{ id: `a${i}`, label: `A${i}` }, { id: `b${i}`, label: `B${i}` }]])),
  }
  const labels = (pairs) => pairs.map(p => p.theme.label)

  it('scans everything when under the cap, whatever the day', () => {
    expect(pairsForUser(data, 8, { day: 5 })).toHaveLength(8)
    expect(labels(pairsForUser(data, 10, { day: 3 }))).toEqual(labels(pairsForUser(data, 10)))
  })

  it('moves a window of cap-many pairs forward each day, so every pair gets its turn', () => {
    expect(labels(pairsForUser(data, 3))).toEqual(['A4', 'B4', 'A3']) // day 0: the first window, as before
    expect(labels(pairsForUser(data, 3, { day: 1 }))).toEqual(['B3', 'A2', 'B2'])
    expect(labels(pairsForUser(data, 3, { day: 2 }))).toEqual(['A1', 'B1', 'A4']) // wraps
    const seen = new Set([0, 1, 2].flatMap(day => labels(pairsForUser(data, 3, { day }))))
    expect(seen.size).toBe(8) // ceil(8 / 3) = 3 days covers all of them
  })

  it("marks only themes that resolved to a broad topic, never a sample person's", () => {
    const d = {
      contacts: [{ id: 1, name: 'Kellan' }, { id: 2, name: 'Sample', seed: true }],
      themesByContact: {
        1: [{ label: 'Fintech startup', entityType: 'topic' }, { label: 'Villanova', entityType: 'team' }, { label: 'Unrefined' }],
        2: [{ label: 'Real estate', entityType: 'topic' }],
      },
    }
    expect([...broadThemePairs(d)]).toEqual([pairKey(1, 'Fintech startup')])
    expect(broadThemePairs(null).size).toBe(0)
  })
})

describe('pass-along notes', () => {
  const found = [{ contact: { id: 1, name: 'Ann' }, theme: { label: 'F1' }, item: { title: '2027 F1 calendar released', link: 'https://n/f1' } }]

  it('stores the scorer\'s note on a relevant row below the bar, and nothing on an irrelevant one', () => {
    const relevant = new Map([[0, { engine: 'claude', relevant: true, score: 45, passAlong: 'Ann, the 2027 calendar is out.' }]])
    expect(shapeResultRows(found, relevant, 'u1', new Map(), 'now')[0]).toMatchObject({ above_bar: false, draft_message: 'Ann, the 2027 calendar is out.' })
    const irrelevant = new Map([[0, { engine: 'claude', relevant: false, score: 15, passAlong: 'Ann, look.' }]])
    expect(shapeResultRows(found, irrelevant, 'u1', new Map(), 'now')[0].draft_message).toBe(null)
  })
})
