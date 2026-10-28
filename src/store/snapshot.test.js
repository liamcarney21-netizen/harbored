import { describe, it, expect } from 'vitest'
import { normalizeSnapshot, repairSnapshot, mergeSnapshots } from './snapshot'

const DUP = 't1784519208243'
const KELLAN = 1784519208243001
const DAN = 1784519208243002

// The owner's row as July builds left it: three themes from one quiz answer
// sharing an id, made-up emails, and the sample crew mixed in.
function legacyRow() {
  return {
    contacts: [
      { id: 1, name: 'Kellan Carney', seed: true, email: 'kellan.carney@example.com', phone: '+1 (555) 0100-1037' },
      { id: 5, name: 'Connor Blake', seed: true, email: 'connor.blake@example.com', phone: '+1 (555) 0104-1185' },
      { id: KELLAN, name: 'Kellan', email: 'kellan@example.com', phone: '', notes: 'server notes' },
      { id: DAN, name: 'Dan Real', email: 'dan@gmail.com', phone: '+1 612 555 0101', notes: '' },
    ],
    themesByContact: {
      1: [{ id: 't4', label: 'Minnesota Vikings', category: 'sports' }],
      5: [{ id: 't8', label: 'Marathon Running', category: 'hobby' }],
      [KELLAN]: [
        { id: DUP, label: 'Villanova basketball', category: 'sports' },
        { id: DUP, label: 'Charleston South Carolina', category: 'sports' },
        { id: DUP, label: 'Fintech startup', category: 'sports' },
      ],
      [DAN]: [{ id: 't1', label: 'Minnesota Vikings', category: 'sports' }],
    },
    touches: [
      { id: 'touch-1', contactId: 1, date: '2026-10-21T00:00:00.000Z', channel: 'sms', message: 'hi' },
      { id: 'touch-d', contactId: DAN, date: '2026-10-20T00:00:00.000Z', channel: 'sms', message: 'yo' },
    ],
    meetings: [{ id: 'mtg-1', contactId: 5, title: 'Coffee', datetime: '2026-07-11T14:30:00.000Z' }],
  }
}

const labels = (snap, cid) => (snap.themesByContact[cid] || []).map(t => t.label)
const ids = (snap, cid) => (snap.themesByContact[cid] || []).map(t => t.id)

describe('theme ids', () => {
  it('gives repeated theme ids distinct, deterministic suffixes; the last copy keeps the id', () => {
    const a = normalizeSnapshot(legacyRow())
    const b = normalizeSnapshot(legacyRow())
    expect(ids(a, KELLAN)).toEqual([`${DUP}~2`, `${DUP}~3`, DUP])
    expect(ids(b, KELLAN)).toEqual(ids(a, KELLAN))
    expect(labels(a, KELLAN)).toEqual(['Villanova basketball', 'Charleston South Carolina', 'Fintech startup'])
  })

  it('clears a search that one refinement stamped on every copy, so each is refined again', () => {
    const bled = { query: '"Sunny Benefits" (funding OR hiring)', entityType: 'company', watchFor: ['funding rounds'], display: 'Watching Sunny Benefits.' }
    const row = legacyRow()
    row.themesByContact[KELLAN] = row.themesByContact[KELLAN].map(t => ({ ...t, ...bled }))
    row.themesByContact[DAN] = [{ id: 't1', label: 'Minnesota Vikings', query: '"Minnesota Vikings"', entityType: 'team' }]
    const s = normalizeSnapshot(row)
    expect(s.themesByContact[KELLAN].map(t => [t.label, t.query, t.display])).toEqual([
      ['Villanova basketball', null, null],
      ['Charleston South Carolina', null, null],
      ['Fintech startup', null, null],
    ])
    expect(s.themesByContact[DAN][0].query).toBe('"Minnesota Vikings"')
    expect(repairSnapshot(row).changed).toBe(true)
  })

  it('never reuses an id that is already taken', () => {
    const s = normalizeSnapshot({
      contacts: [{ id: 1, name: 'A' }],
      themesByContact: { 1: [{ id: 'x', label: 'one' }, { id: 'x~2', label: 'two' }, { id: 'x', label: 'three' }] },
    })
    expect(ids(s, 1)).toEqual(['x~3', 'x~2', 'x'])
  })
})

describe('repairSnapshot', () => {
  it('removes the sample people with their themes, touches and meetings, and blanks made-up emails', () => {
    const { snap, changed } = repairSnapshot(legacyRow())
    expect(changed).toBe(true)
    expect(snap.contacts.map(c => c.name)).toEqual(['Kellan', 'Dan Real'])
    expect(Object.keys(snap.themesByContact).sort()).toEqual([String(KELLAN), String(DAN)].sort())
    expect(snap.touches.map(t => t.id)).toEqual(['touch-d'])
    expect(snap.meetings).toEqual([])
    expect(snap.contacts.find(c => c.id === KELLAN).email).toBe('')
    expect(snap.contacts.find(c => c.id === DAN).email).toBe('dan@gmail.com')
    expect(labels(snap, KELLAN)).toHaveLength(3)
  })

  it('keeps the samples, and their emails, for the App Review account', () => {
    const { snap } = repairSnapshot(legacyRow(), { keepSamples: true })
    expect(snap.contacts.filter(c => c.seed)).toHaveLength(2)
    expect(snap.contacts.find(c => c.id === 1).email).toBe('kellan.carney@example.com')
    expect(snap.contacts.find(c => c.id === KELLAN).email).toBe('')
  })

  it('does nothing the second time', () => {
    const once = repairSnapshot(legacyRow()).snap
    const twice = repairSnapshot(once)
    expect(twice.changed).toBe(false)
    expect(twice.snap).toEqual(once)
  })

  it('reports duplicate ids as a change even when nothing else needs fixing', () => {
    const row = legacyRow()
    row.contacts = row.contacts.filter(c => !c.seed).map(c => ({ ...c, email: '' }))
    expect(repairSnapshot(row).changed).toBe(true)
  })
})

describe('three-way merge', () => {
  const base = () => normalizeSnapshot(repairSnapshot(legacyRow()).snap)

  it('a removal made here stays removed when the server did not touch that person', () => {
    const local = base()
    local.contacts = local.contacts.filter(c => c.id !== KELLAN)
    delete local.themesByContact[KELLAN]
    const server = base()
    server.contacts.find(c => c.id === DAN).notes = 'edited on the web'
    const m = mergeSnapshots(base(), server, local)
    expect(m.contacts.map(c => c.id)).toEqual([DAN])
    expect(m.themesByContact[KELLAN]).toBeUndefined()
    expect(m.contacts[0].notes).toBe('edited on the web')
  })

  it('a stale copy does not undo a removal, a mute or a note made elsewhere', () => {
    const server = base()
    server.contacts = server.contacts.filter(c => c.id !== KELLAN)
    delete server.themesByContact[KELLAN]
    server.prefs = { push: false, digest: false }
    server.contacts.find(c => c.id === DAN).notes = 'new notes from the web'
    const local = base()
    local.reasonState = { 'some-reason': { state: 'dismissed', at: '2026-10-23T12:00:00.000Z' } }
    const m = mergeSnapshots(base(), server, local)
    expect(m.contacts.map(c => c.id)).toEqual([DAN])
    expect(m.prefs).toEqual({ push: false, digest: false })
    expect(m.contacts[0].notes).toBe('new notes from the web')
    expect(m.reasonState['some-reason'].state).toBe('dismissed')
  })

  it('keeps both sides when they changed different fields of the same person', () => {
    const server = base()
    server.contacts.find(c => c.id === DAN).notes = 'web note'
    const local = base()
    local.contacts.find(c => c.id === DAN).phone = '+1 612 555 0199'
    const dan = mergeSnapshots(base(), server, local).contacts.find(c => c.id === DAN)
    expect(dan.notes).toBe('web note')
    expect(dan.phone).toBe('+1 612 555 0199')
  })

  it('an edit on one side beats a removal on the other', () => {
    const server = base()
    server.contacts.find(c => c.id === KELLAN).notes = 'still friends'
    const local = base()
    local.contacts = local.contacts.filter(c => c.id !== KELLAN)
    delete local.themesByContact[KELLAN]
    const m = mergeSnapshots(base(), server, local)
    expect(m.contacts.find(c => c.id === KELLAN).notes).toBe('still friends')
    expect(labels(m, KELLAN)).toHaveLength(3)
  })

  it('keeps all three legacy themes when both copies still carry the shared id', () => {
    const server = legacyRow()
    const local = legacyRow()
    local.touches.push({ id: 'touch-x', contactId: DAN, date: '2026-10-23T11:00:00.000Z', channel: 'sms', message: 'hi' })
    const m = mergeSnapshots(null, server, local)
    expect(labels(m, KELLAN)).toEqual(['Villanova basketball', 'Charleston South Carolina', 'Fintech startup'])
  })

  it('does not mistake reordered jsonb keys for an edit', () => {
    const b = base()
    const reordered = JSON.parse(JSON.stringify(b), (k, v) => (
      v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v
    ))
    const local = base()
    local.contacts = local.contacts.filter(c => c.id !== KELLAN)
    delete local.themesByContact[KELLAN]
    expect(mergeSnapshots(b, reordered, local).contacts.map(c => c.id)).toEqual([DAN])
  })
})

describe("build 12's fields", () => {
  const NOW = Date.parse('2026-10-27T17:00:00Z')
  const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString()

  it('keeps well-formed relation and theme fields, and drops or clamps the rest', () => {
    const snap = normalizeSnapshot({
      contacts: [{ id: 1, name: 'Collin', relation: 'teammate' }, { id: 2, name: 'Ann', relation: 'nemesis' }],
      themesByContact: {
        1: [{
          id: 'a', label: 'Southern California',
          textAbout: [{ label: 'Wildfires & storms', on: true }, { label: 'wildfires and storms', on: true }, { label: 'x'.repeat(41), on: true }, { label: 'Real estate', on: 'yes' }],
          textAboutConfirmed: true, bar: 99, favors: false,
          notAbout: [{ headline: 'Recent', at: daysAgo(2) }, { headline: 'Old', at: daysAgo(61) }, { headline: 'Undated' }],
        }],
        2: [
          { id: 'b', label: 'Health and wellness', bare: true, narrower: ['Yoga', 'Yoga', 7], bar: 'high', favors: 'no', textAboutConfirmed: true },
          { id: 'c', label: 'Lakers', bar: 50, narrower: ['Not bare, so dropped'] },
        ],
      },
    })
    expect(snap.contacts.map(c => c.relation)).toEqual(['teammate', undefined])
    const more = normalizeSnapshot({ contacts: [
      { id: 3, name: 'Colin', relationNote: ' at High Point ', closeness: 'close' },
      { id: 4, name: 'Dana', relationNote: 'x'.repeat(50), closeness: 'besties' },
    ] })
    expect(more.contacts[0]).toMatchObject({ relationNote: 'at High Point', closeness: 'close' })
    expect(more.contacts[1]).not.toHaveProperty('relationNote')
    expect(more.contacts[1]).not.toHaveProperty('closeness')
    expect(snap.contacts[1]).not.toHaveProperty('relation')
    const [a] = snap.themesByContact[1]
    expect(a.textAbout).toEqual([{ label: 'Wildfires & storms', on: true }, { label: 'Real estate', on: false }])
    expect(a).toMatchObject({ textAboutConfirmed: true, bar: 85, favors: false })
    expect(a.notAbout.map(e => e.headline)).toEqual(['Recent'])
    const [b, c] = snap.themesByContact[2]
    expect(b).toEqual({ id: 'b', label: 'Health and wellness', bare: true, narrower: ['Yoga'] })
    expect(c).toEqual({ id: 'c', label: 'Lakers' })
  })

  it("merges one device's choices with another device's bar on the same theme", () => {
    const base = { contacts: [{ id: 1, name: 'Collin' }], themesByContact: { 1: [{ id: 'a', label: 'Southern California', textAbout: [{ label: 'Big local events', on: true }] }] } }
    const server = { ...base, themesByContact: { 1: [{ ...base.themesByContact[1][0], bar: 75 }] } }
    const local = { ...base, themesByContact: { 1: [{ ...base.themesByContact[1][0], textAbout: [{ label: 'Big local events', on: false }], textAboutConfirmed: true }] } }
    const merged = mergeSnapshots(base, server, local)
    expect(merged.themesByContact[1][0]).toMatchObject({ bar: 75, textAboutConfirmed: true, textAbout: [{ label: 'Big local events', on: false }] })
  })
})
