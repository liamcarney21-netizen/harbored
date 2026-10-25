// The sync under the races the October 23 audit reproduced: duplicate theme
// ids, edits made while a save is out, and merges that undid removals. A small
// in-memory stand-in for the user_data table follows PostgREST semantics (a
// conditional update that matches nothing returns no rows) and can hold any
// request so a test can interleave taps with it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const H = vi.hoisted(() => {
  const mem = new Map()
  globalThis.localStorage = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: k => mem.delete(k),
    clear: () => mem.clear(),
  }

  function createFakeServer() {
    const server = { rows: new Map(), log: [], holds: [], holdNext: null, failNext: null, clock: Date.parse('2026-10-23T12:00:00.000Z') }
    const tick = () => { server.clock += 1000; return new Date(server.clock).toISOString().replace('Z', '+00:00') }

    // Another device saving in between.
    server.externalWrite = (uid, mutate) => {
      const data = structuredClone(server.rows.get(uid).data)
      mutate(data)
      server.rows.set(uid, { data, updated_at: tick() })
    }
    server.releaseAll = () => { const h = server.holds.splice(0); h.forEach(x => x.release()); return h.length }

    async function gate(op, run) {
      server.log.push(op)
      const err = server.failNext && server.failNext(op)
      if (err) { server.failNext = null; return { data: null, error: err } }
      if (server.holdNext && server.holdNext(op)) {
        server.holdNext = null
        await new Promise(resolve => server.holds.push({ op, release: resolve }))
      }
      return run()
    }

    function builder(kind, payload, opts) {
      const filters = {}
      const b = {
        select() { return b },
        eq(k, v) { filters[k] = v; return b },
        maybeSingle() {
          return gate({ kind, single: true }, () => {
            const row = server.rows.get(filters.user_id)
            return { data: row ? structuredClone(row) : null, error: null }
          })
        },
        then(resolve, reject) {
          return gate({ kind }, () => {
            if (kind === 'update') {
              const row = server.rows.get(filters.user_id)
              if (!row) return { data: [], error: null }
              if ('updated_at' in filters && Date.parse(filters.updated_at) !== Date.parse(row.updated_at)) return { data: [], error: null }
              const stored = { data: structuredClone(payload.data), updated_at: tick() }
              server.rows.set(filters.user_id, stored)
              return { data: [{ updated_at: stored.updated_at }], error: null }
            }
            if (kind === 'upsert') {
              if (server.rows.has(payload.user_id) && opts?.ignoreDuplicates) return { data: null, error: null }
              server.rows.set(payload.user_id, { data: structuredClone(payload.data), updated_at: tick() })
              return { data: null, error: null }
            }
            return { data: [], error: null }
          }).then(resolve, reject)
        },
      }
      return b
    }

    server.client = {
      from() {
        return {
          select() { return builder('select') },
          update(body) { return builder('update', body) },
          upsert(body, opts) { return builder('upsert', body, opts) },
        }
      },
    }
    return server
  }

  return { mem, server: createFakeServer(), user: { id: 'u1', email: 'owner@harbored.test' }, current: null }
})

vi.mock('../lib/supabase', () => ({ supabase: H.server.client }))
vi.mock('./authStore', () => ({ useAuthStore: { getState: () => ({ user: H.user }) } }))

const wait = (ms) => new Promise(r => setTimeout(r, ms))
const DUP = 't1784519208243'
const KELLAN = 1784519208243001
const DAN = 1784519208243002

function legacyRow() {
  return {
    contacts: [
      { id: KELLAN, name: 'Kellan', email: '', phone: '', notes: 'server notes' },
      { id: DAN, name: 'Dan Real', email: '', phone: '+1 612 555 0101', notes: '' },
    ],
    themesByContact: {
      [KELLAN]: [
        { id: DUP, label: 'Villanova basketball', category: 'sports' },
        { id: DUP, label: 'Charleston South Carolina', category: 'sports' },
        { id: DUP, label: 'Fintech startup', category: 'sports' },
      ],
      [DAN]: [{ id: 't1', label: 'Minnesota Vikings', category: 'sports' }],
    },
    touches: [],
    meetings: [],
  }
}

// A fresh module instance is a relaunch: the same server and localStorage, no memory.
async function launch() {
  if (H.current) H.current.useDataStore.getState().reset()
  vi.resetModules()
  H.current = await import('./dataStore')
  return H.current
}

function seedServer(row = legacyRow()) {
  H.server.rows.set('u1', { data: structuredClone(row), updated_at: '2026-10-23T00:36:17.746+00:00' })
}

const serverRow = () => H.server.rows.get('u1').data
const names = list => list.map(c => c.name)
const kellanLabels = snap => (snap.themesByContact[KELLAN] || []).map(t => t.label)

beforeEach(() => {
  H.mem.clear()
  H.server.rows.clear()
  H.server.log.length = 0
  H.server.holdNext = null
  H.server.failNext = null
  H.server.releaseAll()
  H.user = { id: 'u1', email: 'owner@harbored.test' }
})
afterEach(async () => {
  H.current?.useDataStore.getState().reset()
  H.server.releaseAll()
  await wait(20)
})

describe('duplicate theme ids', () => {
  it('a launch repairs the ids and saves the repair', async () => {
    const { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    expect(kellanLabels(useDataStore.getState())).toEqual(['Villanova basketball', 'Charleston South Carolina', 'Fintech startup'])
    await wait(700)
    const saved = serverRow().themesByContact[KELLAN]
    expect(saved.map(t => t.id)).toEqual([`${DUP}~2`, `${DUP}~3`, DUP])
    expect(useDataStore.getState().dirty).toBe(false)
  })

  it('a dirty-cache merge at launch keeps all three themes', async () => {
    const { useDataStore } = await launch()
    seedServer()
    const local = legacyRow()
    local.touches = [{ id: 'touch-x', contactId: DAN, date: '2026-10-23T11:00:00.000Z', channel: 'sms', message: 'hi' }]
    H.mem.set('harbored_snapshot_u1', JSON.stringify({ snap: local, dirty: true }))
    await useDataStore.getState().hydrate()
    await wait(700)
    expect(kellanLabels(useDataStore.getState())).toHaveLength(3)
    expect(kellanLabels(serverRow())).toHaveLength(3)
    expect(serverRow().touches.map(t => t.id)).toEqual(['touch-x'])
  })

  it('removing one theme removes only that one, and Undo puts it back', async () => {
    const { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    const charleston = useDataStore.getState().themesByContact[KELLAN][1]
    useDataStore.getState().removeTheme(KELLAN, charleston.id)
    expect(kellanLabels(useDataStore.getState())).toEqual(['Villanova basketball', 'Fintech startup'])
    useDataStore.getState().restoreTheme(KELLAN, charleston, 1)
    expect(kellanLabels(useDataStore.getState())).toEqual(['Villanova basketball', 'Charleston South Carolina', 'Fintech startup'])
  })

  it('the background refine pass gives each theme its own refinement', async () => {
    const { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    const { refineMissingThemes } = await import('../services/themes')
    globalThis.fetch = vi.fn(async (_url, init) => {
      const { label } = JSON.parse(init.body)
      return { ok: true, json: async () => ({ engine: 'claude', query: `"${label}"`, entityType: 'topic', watchFor: ['x'], display: label }) }
    })
    const s = useDataStore.getState()
    await refineMissingThemes(s.contacts, s.themesByContact, s.updateTheme)
    expect(useDataStore.getState().themesByContact[KELLAN].map(t => t.query)).toEqual([
      '"Villanova basketball"', '"Charleston South Carolina"', '"Fintech startup"',
    ])
  })
})

describe('edits made while a save is out', () => {
  it('stay unsaved until written, are flushed on background, and survive a relaunch', async () => {
    let { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    await wait(700) // the id repair saves first
    H.server.holdNext = op => op.kind === 'update'
    useDataStore.getState().addContact({ name: 'Alice First' })
    await wait(700) // save #1 is out (held)
    useDataStore.getState().addContact({ name: 'Bob Second' })
    H.server.releaseAll()
    await wait(30) // save #1 returns
    expect(useDataStore.getState().dirty).toBe(true)
    const cache = JSON.parse(H.mem.get('harbored_snapshot_u1'))
    expect(cache.dirty).toBe(true)
    expect(names(cache.snap.contacts)).toContain('Bob Second')
    await useDataStore.getState().flushSync() // app goes to the background
    expect(names(serverRow().contacts)).toContain('Bob Second')
    ;({ useDataStore } = await launch())
    await useDataStore.getState().hydrate()
    expect(names(useDataStore.getState().contacts)).toEqual(expect.arrayContaining(['Alice First', 'Bob Second']))
  })

  it('are kept and saved when the save hits a conflict', async () => {
    const { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    await wait(700)
    H.server.externalWrite('u1', d => { d.contacts[1].notes = 'web edit' })
    useDataStore.getState().addContact({ name: 'Xavier Before' })
    H.server.holdNext = op => op.kind === 'select' && op.single // the refetch after the failed update
    await wait(700)
    useDataStore.getState().addContact({ name: 'Yolanda During' })
    H.server.releaseAll()
    await wait(1500)
    expect(names(useDataStore.getState().contacts)).toEqual(expect.arrayContaining(['Xavier Before', 'Yolanda During']))
    expect(names(serverRow().contacts)).toEqual(expect.arrayContaining(['Xavier Before', 'Yolanda During']))
    expect(serverRow().contacts.find(c => c.id === DAN).notes).toBe('web edit')
    expect(useDataStore.getState().dirty).toBe(false)
  })
})

describe('removals', () => {
  it('a person removed offline stays removed at the next launch', async () => {
    let { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    await wait(700)
    H.server.failNext = op => (op.kind === 'update' ? { message: 'network down' } : null)
    useDataStore.getState().removeContact(KELLAN)
    await wait(700)
    expect(useDataStore.getState().syncError).toBe('network down')
    ;({ useDataStore } = await launch())
    await useDataStore.getState().hydrate()
    await wait(700)
    expect(useDataStore.getState().contacts.map(c => c.id)).toEqual([DAN])
    expect(serverRow().contacts.map(c => c.id)).toEqual([DAN])
  })

  it('a removal that hits a conflict stays removed', async () => {
    const { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    await wait(700)
    H.server.externalWrite('u1', d => { d.contacts[1].notes = 'web edit' })
    useDataStore.getState().removeContact(KELLAN)
    await wait(900)
    expect(serverRow().contacts.map(c => c.id)).toEqual([DAN])
    expect(serverRow().contacts[0].notes).toBe('web edit')
  })

  it('a stale device does not undo a removal, a mute or a note made elsewhere', async () => {
    const { useDataStore } = await launch()
    seedServer()
    await useDataStore.getState().hydrate()
    await wait(700) // phone loads, saves the id repair, then sits suspended
    H.server.externalWrite('u1', d => { // web: remove Kellan, mute push, edit Dan's notes
      d.contacts = d.contacts.filter(c => c.id !== KELLAN)
      delete d.themesByContact[KELLAN]
      d.prefs = { push: false, digest: false }
      d.contacts[0].notes = 'new notes from the web'
    })
    useDataStore.getState().markReason('some-reason', 'dismissed') // phone: any edit
    await wait(900)
    const row = serverRow()
    expect(row.contacts.map(c => c.id)).toEqual([DAN])
    expect(row.prefs).toEqual({ push: false, digest: false })
    expect(row.contacts[0].notes).toBe('new notes from the web')
    expect(row.reasonState['some-reason'].state).toBe('dismissed')
  })
})

describe('repairs on load', () => {
  function rowWithSamples() {
    const row = legacyRow()
    row.contacts.push({ id: 8, name: 'Tyler Brooks', seed: true, email: 'tyler.brooks@example.com', phone: '+1 (555) 0107-1296', lastTouch: '2026-05-06T00:00:00.000Z' })
    row.contacts[0].email = 'kellan@example.com'
    row.themesByContact[8] = [{ id: 't3', label: 'Sales', category: 'industry' }]
    return row
  }

  it('removes sample people and made-up emails from a normal account, and saves that', async () => {
    const { useDataStore } = await launch()
    seedServer(rowWithSamples())
    await useDataStore.getState().hydrate()
    expect(names(useDataStore.getState().contacts)).toEqual(['Kellan', 'Dan Real'])
    await wait(700)
    expect(names(serverRow().contacts)).toEqual(['Kellan', 'Dan Real'])
    expect(serverRow().contacts[0].email).toBe('')
    expect(serverRow().themesByContact[8]).toBeUndefined()
  })

  it('keeps the sample people for the App Review account', async () => {
    H.user = { id: 'u1', email: 'Review@Harbored.app' }
    const { useDataStore } = await launch()
    seedServer(rowWithSamples())
    await useDataStore.getState().hydrate()
    await wait(700)
    expect(names(useDataStore.getState().contacts)).toContain('Tyler Brooks')
    expect(names(serverRow().contacts)).toContain('Tyler Brooks')
  })

  it('leaves an already-clean account alone', async () => {
    const row = legacyRow()
    row.themesByContact[KELLAN] = row.themesByContact[KELLAN].map((t, i) => ({ ...t, id: `${DUP}-${i}` }))
    const { useDataStore } = await launch()
    seedServer(row)
    await useDataStore.getState().hydrate()
    await wait(700)
    expect(H.server.log.filter(o => o.kind === 'update')).toHaveLength(0)
  })
})
