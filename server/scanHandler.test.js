import { describe, it, expect } from 'vitest'
import { contentKeyFor, notifiedKeyMap, shapeResultRows, birthdayRowsForUser } from './scanHandler.js'

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
  const scores = new Map([
    [0, { score: 78, rationale: 'why', draftMessage: 'draft' }], // above the reach-out bar (70)
    [1, { score: 30 }],                                          // below
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
