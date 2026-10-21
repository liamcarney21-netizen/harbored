import { describe, it, expect, vi, beforeEach } from 'vitest'

// Node has no localStorage; the store only needs get/set/remove/clear.
const mem = new Map()
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
  clear: () => mem.clear(),
}

// A tiny Supabase double: one table, a scripted response per call.
const calls = []
let responses = []
function nextResponse() {
  return responses.length ? responses.shift() : { data: null, error: null }
}
function builder(op) {
  const b = {
    _op: op, _filters: [],
    select() { return b },
    eq(k, v) { b._filters.push([k, v]); return b },
    maybeSingle() { calls.push({ op: b._op, filters: b._filters, body: b._body }); return Promise.resolve(nextResponse()) },
    then(resolve, reject) {
      calls.push({ op: b._op, filters: b._filters, body: b._body })
      return Promise.resolve(nextResponse()).then(resolve, reject)
    },
  }
  return b
}
vi.mock('../lib/supabase', () => ({
  supabase: {
    from() {
      return {
        select() { return builder('select') },
        update(body) { const b = builder('update'); b._body = body; return b },
        upsert(body, opts) { const b = builder('upsert'); b._body = { body, opts }; return b },
        insert(body) { const b = builder('insert'); b._body = body; return b },
        delete() { return builder('delete') },
      }
    },
    auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => {}, signOut: () => Promise.resolve({ error: null }) },
  },
}))

vi.mock('./authStore', () => {
  let user = { id: 'u1', email: 'liam@example.com' }
  return {
    useAuthStore: {
      getState: () => ({ user }),
      __setUser: (u) => { user = u },
    },
  }
})

const { useDataStore, mergeSnapshots, normalizeSnapshot } = await import('./dataStore')

const wait = (ms) => new Promise(r => setTimeout(r, ms))

beforeEach(() => {
  calls.length = 0
  responses = []
  localStorage.clear()
  useDataStore.getState().reset()
})

describe('normalizeSnapshot', () => {
  it('drops records that would crash the app and fills defaults', () => {
    const s = normalizeSnapshot({ contacts: [{ id: 1, name: 'Kate' }, { id: 2, name: null }, null], themesByContact: { 1: [{ id: 't', label: 'Nova' }, { id: null }] }, touches: 'nope' })
    expect(s.contacts).toHaveLength(1)
    expect(s.contacts[0].initials).toBe('K')
    expect(s.themesByContact[1]).toHaveLength(1)
    expect(s.touches).toEqual([])
    expect(s.prefs).toEqual({ push: true, digest: true })
  })
})

describe('mergeSnapshots', () => {
  it('keeps people from both sides and lets local edits win per record', () => {
    const server = { contacts: [{ id: 1, name: 'Kate', notes: 'server' }, { id: 2, name: 'Dan' }], themesByContact: { 1: [{ id: 'a', label: 'Nova' }] }, touches: [], meetings: [] }
    const local = { contacts: [{ id: 1, name: 'Kate', notes: 'local' }, { id: 3, name: 'Anna' }], themesByContact: { 1: [{ id: 'b', label: 'Charleston' }] }, touches: [{ id: 'x', contactId: 1, date: '2026-10-21T00:00:00Z' }], meetings: [] }
    const m = mergeSnapshots(server, local)
    expect(m.contacts.map(c => c.id).sort()).toEqual([1, 2, 3])
    expect(m.contacts.find(c => c.id === 1).notes).toBe('local')
    expect(m.contacts.find(c => c.id === 1).lastTouch).toBe('2026-10-21T00:00:00Z')
    expect(m.themesByContact[1].map(t => t.id)).toEqual(['a', 'b'])
  })
})

describe('hydrate', () => {
  it('fails closed: a read error never schedules a write', async () => {
    responses = [{ data: null, error: { message: 'network down' } }]
    await useDataStore.getState().hydrate()
    const s = useDataStore.getState()
    expect(s.loadError).toBe('network down')
    expect(s.loading).toBe(false)
    s.addContact({ name: 'Should not sync' })
    await wait(800)
    expect(calls.filter(c => c.op !== 'select')).toHaveLength(0)
  })

  it('creates a missing row with an insert that cannot overwrite', async () => {
    responses = [
      { data: null, error: null },                       // select: no row
      { data: null, error: null },                       // upsert ignoreDuplicates
      { data: { updated_at: 'T1' }, error: null },       // re-select updated_at
    ]
    await useDataStore.getState().hydrate()
    const up = calls.find(c => c.op === 'upsert')
    expect(up.body.opts.ignoreDuplicates).toBe(true)
    expect(useDataStore.getState().loadedAt).toBe('T1')
    expect(useDataStore.getState().synced).toBe(true)
  })

  it('merges a dirty local copy over the server copy instead of dropping it', async () => {
    localStorage.setItem('harbored_snapshot_u1', JSON.stringify({ snap: { contacts: [{ id: 9, name: 'Offline Olga' }], themesByContact: {}, touches: [], meetings: [] }, dirty: true }))
    responses = [{ data: { data: { contacts: [{ id: 1, name: 'Kate' }], themesByContact: {}, touches: [], meetings: [] }, updated_at: 'T2' }, error: null }]
    await useDataStore.getState().hydrate()
    const names = useDataStore.getState().contacts.map(c => c.name).sort()
    expect(names).toEqual(['Kate', 'Offline Olga'])
    expect(useDataStore.getState().dirty).toBe(true)
  })
})

describe('writes', () => {
  it('writes conditionally on updated_at and merges on conflict', async () => {
    responses = [{ data: { data: { contacts: [], themesByContact: {}, touches: [], meetings: [] }, updated_at: 'T1' }, error: null }]
    await useDataStore.getState().hydrate()
    // Another device saved T2 with a new person in between.
    responses = [
      { data: [], error: null },                                                     // conditional update matched 0 rows
      { data: { data: { contacts: [{ id: 5, name: 'From phone' }], themesByContact: {}, touches: [], meetings: [] }, updated_at: 'T2' }, error: null }, // refetch
      { data: [{ updated_at: 'T3' }], error: null },                                 // retry succeeds
    ]
    useDataStore.getState().addContact({ name: 'From web' })
    await wait(900)
    const updates = calls.filter(c => c.op === 'update')
    expect(updates[0].filters).toEqual([['user_id', 'u1'], ['updated_at', 'T1']])
    expect(updates[1].filters).toEqual([['user_id', 'u1'], ['updated_at', 'T2']])
    const names = useDataStore.getState().contacts.map(c => c.name).sort()
    expect(names).toEqual(['From phone', 'From web'])
    expect(useDataStore.getState().loadedAt).toBe('T3')
    expect(useDataStore.getState().dirty).toBe(false)
  })

  it('never writes in demo mode', async () => {
    useDataStore.getState().loadDemo()
    useDataStore.getState().addContact({ name: 'Demo person' })
    await wait(800)
    expect(calls).toHaveLength(0)
  })
})
