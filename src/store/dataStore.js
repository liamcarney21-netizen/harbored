import { create } from 'zustand'
import { contacts as seedContacts } from '../data/appData'
import { sharedThemes as seedThemes } from '../data/commonGround'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { daysUntilBirthday } from '../lib/birthday'

// Re-exported so existing importers (Common Ground, tests) keep their path.
export { daysUntilBirthday }

const DAY = 86400000
const daysAgo = n => new Date(Date.now() - n * DAY).toISOString()
const daysFromNow = (n, hour = 9, min = 30) => {
  const d = new Date(Date.now() + n * DAY)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

// Days since last touch → relationship health. Kept for the plain-language
// statuses in Crew; the old percentage bar is gone from the UI.
export function healthFromLastTouch(lastTouch) {
  const days = lastTouch ? Math.floor((Date.now() - new Date(lastTouch).getTime()) / DAY) : 999
  if (days < 30) return { key: 'strong',  label: 'In touch',  days }
  if (days < 60) return { key: 'cooling', label: 'Quiet',     days }
  return { key: 'at-risk', label: 'Drifting', days }
}

export function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
}

// ── Seed data (demo mode and the App Review account only) ──────────────────

const SEED_LAST_TOUCH = { 1: 2, 2: 10, 3: 35, 4: 50, 5: 65, 6: 90, 7: 20, 8: 75, 9: 15, 10: 40, 11: 25, 12: 55, 13: 42 }

const mmddFromNow = n => {
  const d = new Date(Date.now() + n * DAY)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const SEED_BIRTHDAYS = { 7: mmddFromNow(3), 3: mmddFromNow(0), 11: mmddFromNow(9) }

function fakeEmail(name) {
  return name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '.') + '@example.com'
}

function buildSeedContacts() {
  return seedContacts.map((c, i) => ({
    ...c,
    seed: true,
    email: fakeEmail(c.name),
    phone: `+1 (555) 01${String(i).padStart(2, '0')}-${String(1000 + c.id * 37).slice(-4)}`,
    lastTouch: daysAgo(SEED_LAST_TOUCH[c.id] ?? 60),
    birthday: SEED_BIRTHDAYS[c.id] || '',
    notes: c.id === 13 ? 'Nova alum (class of \'12). Two kids. Looking at rental property in Minneapolis since last spring.' : '',
  }))
}

function buildSeedThemes() {
  const map = {}
  for (const entry of seedThemes) map[entry.contactId] = entry.themes
  return map
}

const SEED_TOUCHES = [
  { id: 'touch-1', contactId: 1, date: daysAgo(2),  channel: 'sms',   message: "Kellan! Just saw you got promoted to Senior PM at Stripe — that's huge, so well deserved. We need to catch up soon!", trigger: 'Promoted to Senior Product Manager at Stripe' },
  { id: 'touch-2', contactId: 2, date: daysAgo(10), channel: 'email', message: "Sarah! Congrats on the new VP role at Notion — that's an incredible move. Would love to hear how the transition is going when you're settled in!", trigger: 'New role as VP of Marketing at Notion' },
  { id: 'touch-3', contactId: 3, date: daysAgo(35), channel: 'sms',   message: "Marcus! Saw the news — congratulations! This is such exciting news. So happy for you both. We need to celebrate!", trigger: 'Got engaged' },
  { id: 'touch-4', contactId: 4, date: daysAgo(50), channel: 'sms',   message: "Priya! Welcome to NYC! That's such a big move — how are you settling in? We should grab coffee when you're ready.", trigger: 'Moved to New York City' },
  { id: 'touch-5', contactId: 5, date: daysAgo(65), channel: 'email', message: "Connor! 3 years at Goldman — that's a real milestone. Hope you're celebrating. What are you working on these days?", trigger: '3-year work anniversary at Goldman Sachs' },
]

const SEED_MEETINGS = [
  { id: 'mtg-1', contactId: 13, title: 'Coffee — Spyhouse on Hennepin', datetime: daysFromNow(2, 9, 30) },
]

function seedSnapshot() {
  return {
    contacts: buildSeedContacts(),
    themesByContact: buildSeedThemes(),
    touches: SEED_TOUCHES,
    meetings: SEED_MEETINGS,
    prefs: { ...DEFAULT_PREFS },
    reasonState: {},
  }
}

// ── Snapshot shape ──────────────────────────────────────────────────────────

const DEFAULT_PREFS = { push: true, digest: true }
const SNAPSHOT_KEYS = ['contacts', 'themesByContact', 'touches', 'meetings', 'prefs', 'reasonState']

function emptySnapshot() {
  return { contacts: [], themesByContact: {}, touches: [], meetings: [], prefs: { ...DEFAULT_PREFS }, reasonState: {} }
}

// Whatever comes back from the server or the local cache is treated as
// untrusted: one malformed record used to be enough to blank the whole app.
export function normalizeSnapshot(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const contacts = (Array.isArray(s.contacts) ? s.contacts : [])
    .filter(c => c && typeof c.name === 'string' && c.name.trim() && c.id != null)
    .map(c => ({
      ...c,
      name: c.name.trim(),
      initials: c.initials || initialsOf(c.name),
      email: typeof c.email === 'string' ? c.email : '',
      phone: typeof c.phone === 'string' ? c.phone : '',
      role: typeof c.role === 'string' ? c.role : '',
      company: typeof c.company === 'string' ? c.company : '',
      birthday: typeof c.birthday === 'string' ? c.birthday : '',
      notes: typeof c.notes === 'string' ? c.notes : '',
      lastTouch: c.lastTouch || null,
    }))
  const themesByContact = {}
  if (s.themesByContact && typeof s.themesByContact === 'object') {
    for (const [cid, list] of Object.entries(s.themesByContact)) {
      if (Array.isArray(list)) themesByContact[cid] = list.filter(t => t && typeof t.label === 'string' && t.id != null)
    }
  }
  return {
    contacts,
    themesByContact,
    touches: (Array.isArray(s.touches) ? s.touches : []).filter(t => t && t.id != null && t.date),
    meetings: Array.isArray(s.meetings) ? s.meetings : [],
    prefs: { ...DEFAULT_PREFS, ...(s.prefs && typeof s.prefs === 'object' ? s.prefs : {}) },
    reasonState: s.reasonState && typeof s.reasonState === 'object' ? s.reasonState : {},
  }
}

function initialsOf(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function snapshotOf(state) {
  const out = {}
  for (const k of SNAPSHOT_KEYS) out[k] = state[k]
  return out
}

// Two snapshots of the same account, merged by id. Used when another device
// saved in between (the server copy wins the race, local edits are layered on
// top) and when a dirty local copy is found at launch. Union everywhere: a
// contact present in either copy survives, and for a record present in both
// the local version wins.
export function mergeSnapshots(base, local) {
  const b = normalizeSnapshot(base)
  const l = normalizeSnapshot(local)
  const byId = (list) => new Map(list.map(x => [String(x.id), x]))

  const contacts = byId(b.contacts)
  for (const c of l.contacts) contacts.set(String(c.id), c)

  const themesByContact = {}
  const cids = new Set([...Object.keys(b.themesByContact), ...Object.keys(l.themesByContact)])
  for (const cid of cids) {
    const m = byId(b.themesByContact[cid] || [])
    for (const t of l.themesByContact[cid] || []) m.set(String(t.id), t)
    themesByContact[cid] = [...m.values()]
  }

  const touches = byId(b.touches)
  for (const t of l.touches) touches.set(String(t.id), t)
  const meetings = byId(b.meetings)
  for (const m of l.meetings) meetings.set(String(m.id), m)

  // lastTouch is derived from touches on both sides; keep the latest.
  const latestTouch = {}
  for (const t of touches.values()) {
    const k = String(t.contactId)
    if (!latestTouch[k] || t.date > latestTouch[k]) latestTouch[k] = t.date
  }
  const mergedContacts = [...contacts.values()].map(c => {
    const lt = latestTouch[String(c.id)]
    return lt && (!c.lastTouch || lt > c.lastTouch) ? { ...c, lastTouch: lt } : c
  })

  return {
    contacts: mergedContacts,
    themesByContact,
    touches: [...touches.values()].sort((a, c) => (a.date < c.date ? 1 : -1)),
    meetings: [...meetings.values()],
    prefs: { ...b.prefs, ...l.prefs },
    reasonState: { ...b.reasonState, ...l.reasonState },
  }
}

// ── Local cache / outbox ────────────────────────────────────────────────────
// The last known snapshot per account lives in localStorage so the app can
// render instantly on launch and so edits made offline survive a relaunch.
// `dirty` means the local copy has changes the server hasn't confirmed.

const cacheKey = uid => `harbored_snapshot_${uid}`

function readCache(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { snap: normalizeSnapshot(parsed.snap), dirty: !!parsed.dirty, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

function writeCache(uid, snap, dirty) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify({ snap, dirty, savedAt: Date.now() }))
  } catch { /* quota or private mode — the server copy is still the source of truth */ }
}

function clearCache(uid) {
  try { localStorage.removeItem(cacheKey(uid)) } catch { /* ignore */ }
}

// ── Ids ─────────────────────────────────────────────────────────────────────

// Date.now() alone can collide when adding several contacts in a tight loop
// (bulk import) — duplicate ids silently clobber each other's themes.
let contactIdCounter = 0
function nextContactId() {
  contactIdCounter = (contactIdCounter + 1) % 1000
  return Date.now() * 1000 + contactIdCounter
}

let themeIdCounter = 0
function nextThemeId() {
  themeIdCounter = (themeIdCounter + 1) % 1000
  return `t${Date.now()}-${themeIdCounter}`
}

function randomId(prefix) {
  const r = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now()}-${r}`
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useDataStore = create((set, get) => {
  let syncTimer = null
  let inFlight = null
  let writeAgain = false
  let lastLoadAt = 0

  function currentUserId() {
    return useAuthStore.getState().user?.id ?? null
  }

  // Writes are allowed only for the account whose data is in memory, never
  // while loading, never after a failed load, and never in demo mode.
  function canWrite() {
    const s = get()
    const uid = currentUserId()
    return !!uid && s.ownerId === uid && s.synced && !s.loading && !s.loadError && !s.demo
  }

  // One write at a time; if more changes land while one is in flight, exactly
  // one more write follows. Each write is conditional on the server row still
  // carrying the updated_at we last saw. If another device saved in between,
  // the server copy is fetched, merged under the local edits, and the write
  // is retried once.
  async function writeNow() {
    if (inFlight) { writeAgain = true; return inFlight }
    inFlight = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (!canWrite()) return
        const s = get()
        const uid = s.ownerId
        const snap = snapshotOf(s)
        const now = new Date().toISOString()
        let q = supabase.from('user_data').update({ data: snap, updated_at: now }).eq('user_id', uid)
        if (s.loadedAt) q = q.eq('updated_at', s.loadedAt)
        const { data, error } = await q.select('updated_at')
        if (error) {
          console.error('Save failed:', error.message)
          set({ syncError: error.message })
          return // the local cache stays dirty; retried on the next change, resume, or launch
        }
        if (data && data.length > 0) {
          set({ loadedAt: data[0].updated_at, syncError: null, dirty: false })
          writeCache(uid, snap, false)
          return
        }
        // No row matched: someone else saved first, or the row is missing.
        const { data: row, error: e2 } = await supabase
          .from('user_data').select('data, updated_at').eq('user_id', uid).maybeSingle()
        if (e2) { console.error('Save conflict check failed:', e2.message); set({ syncError: e2.message }); return }
        if (!row) {
          const { error: e3 } = await supabase
            .from('user_data')
            .upsert({ user_id: uid, data: snap, updated_at: now }, { onConflict: 'user_id', ignoreDuplicates: true })
          if (e3) { console.error('Save (create) failed:', e3.message); set({ syncError: e3.message }); return }
          set({ loadedAt: null }) // next attempt writes unconditionally
          continue
        }
        if (currentUserId() !== uid) return
        const merged = mergeSnapshots(row.data, snap)
        set({ ...merged, loadedAt: row.updated_at })
        // loop: retry the conditional write with the server's updated_at
      }
    })().finally(() => {
      inFlight = null
      if (writeAgain) { writeAgain = false; writeNow() }
    })
    return inFlight
  }

  function scheduleSync() {
    const s = get()
    const uid = s.ownerId
    if (uid && !s.demo) {
      // Local first, always: this is what survives a relaunch.
      writeCache(uid, snapshotOf(s), true)
      if (!s.dirty) set({ dirty: true })
    }
    if (!canWrite()) return
    clearTimeout(syncTimer)
    syncTimer = setTimeout(() => { syncTimer = null; writeNow() }, 600)
  }

  function cancelSync() {
    clearTimeout(syncTimer)
    syncTimer = null
    writeAgain = false
  }

  const syncedSet = (partial) => {
    set(partial)
    scheduleSync()
  }

  async function createRow(uid, snap) {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('user_data')
      .upsert({ user_id: uid, data: snap, updated_at: now }, { onConflict: 'user_id', ignoreDuplicates: true })
    if (error) { console.error('Could not create account data:', error.message); return null }
    const { data } = await supabase.from('user_data').select('updated_at').eq('user_id', uid).maybeSingle()
    return data?.updated_at ?? null
  }

  return {
    ...emptySnapshot(),
    ownerId: null,     // which account the data in memory belongs to
    loading: true,
    loadError: null,   // a failed load: the app shows a retry state and never writes
    syncError: null,
    dirty: false,      // local changes the server hasn't confirmed
    fromCache: false,  // currently showing the cached copy while the server load runs
    synced: false,     // the server copy has been reconciled since this account was loaded
    demo: false,

    // Load this account's data. Renders the cached copy immediately when one
    // exists, then reconciles with the server. A failed load keeps whatever is
    // on screen, sets loadError, and schedules nothing — a failed read must
    // never turn into a write.
    hydrate: async () => {
      const user = useAuthStore.getState().user
      if (!user) { set({ loading: false }); return }
      const uid = user.id
      cancelSync()
      const cached = readCache(uid)
      set({
        ...(cached ? cached.snap : emptySnapshot()),
        ownerId: uid, loading: !cached, loadError: null, fromCache: !!cached,
        dirty: !!cached?.dirty, synced: false, demo: false,
      })

      const { data, error } = await supabase
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', uid)
        .maybeSingle()
      if (currentUserId() !== uid || get().ownerId !== uid) return // signed out or switched meanwhile

      if (error) {
        console.error('Failed to load data from Supabase:', error.message)
        set({ loading: false, loadError: error.message, fromCache: !!cached })
        return
      }
      lastLoadAt = Date.now()

      // Anything edited locally (a dirty cache, or taps made while this load
      // ran) is layered over the server copy, never thrown away.
      const localDirty = get().dirty ? snapshotOf(get()) : null

      if (data?.data) {
        let snap = normalizeSnapshot(data.data)
        if (localDirty) snap = mergeSnapshots(snap, localDirty)
        set({ ...snap, loading: false, loadError: null, fromCache: false, loadedAt: data.updated_at, synced: true, dirty: !!localDirty })
        writeCache(uid, snap, !!localDirty)
        if (localDirty) scheduleSync()
        return
      }

      // No row: a genuinely new account (the read succeeded and found nothing).
      const isReview = (user.email || '').toLowerCase() === 'review@harbored.app'
      const snap = localDirty || (isReview ? seedSnapshot() : emptySnapshot())
      const loadedAt = await createRow(uid, snap)
      if (currentUserId() !== uid || get().ownerId !== uid) return
      set({ ...snap, loading: false, loadError: null, fromCache: false, loadedAt, synced: true, dirty: false })
      writeCache(uid, snap, false)
    },

    // Called when the app comes back to the foreground: pick up anything
    // another device saved, unless local edits are still waiting to go out.
    refreshIfStale: async () => {
      const s = get()
      if (!s.ownerId || s.demo || s.loading) return
      if (s.dirty) { writeNow(); return }
      if (Date.now() - lastLoadAt < 60_000) return
      await get().hydrate()
    },

    // Write anything still debounced right now (app going to the background,
    // sign-out). Returns when the attempt is done.
    flushSync: async () => {
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null }
      if (get().dirty && canWrite()) await writeNow()
      else if (inFlight) await inFlight
    },

    retryLoad: () => get().hydrate(),

    // Sign-out / account switch: drop the in-memory data. Pending writes are
    // cancelled (callers flush first when they want them kept).
    reset: () => {
      cancelSync()
      set({ ...emptySnapshot(), ownerId: null, loading: true, loadError: null, syncError: null, dirty: false, fromCache: false, synced: false, demo: false })
    },

    forgetLocal: (uid) => { if (uid) clearCache(uid) },

    // No-auth "See it live" demo: the sample network, never written anywhere.
    loadDemo: () => {
      cancelSync()
      set({ ...seedSnapshot(), ownerId: null, loading: false, loadError: null, dirty: false, fromCache: false, synced: false, demo: true })
    },
    setDemo: (active) => set({ demo: !!active }),

    addContact: ({ name, role = '', company = '', email = '', phone = '', birthday = '', themes = [] }) => {
      const id = nextContactId()
      const colors = ['#1e3a5f', '#1a2e4a', '#1c3554', '#172b45']
      const contact = {
        id, name: name.trim(), initials: initialsOf(name), role, company,
        color: colors[id % colors.length],
        email: email || '',
        phone: phone || '',
        birthday: birthday || '',
        lastTouch: null,
        createdAt: new Date().toISOString(),
        notes: '',
      }
      syncedSet(s => ({
        contacts: [...s.contacts, contact],
        themesByContact: {
          ...s.themesByContact,
          [id]: themes.map(t => ({ id: nextThemeId(), label: t.label, category: t.category || 'topic', query: t.query || null, entityType: t.entityType || null, watchFor: t.watchFor || null })),
        },
      }))
      return contact
    },

    updateContact: (contactId, patch) => syncedSet(s => ({
      contacts: s.contacts.map(c => (String(c.id) === String(contactId) ? { ...c, ...patch } : c)),
    })),

    removeContact: (contactId) => syncedSet(s => {
      const key = String(contactId)
      const themesByContact = { ...s.themesByContact }
      delete themesByContact[key]
      return {
        contacts: s.contacts.filter(c => String(c.id) !== key),
        themesByContact,
        touches: s.touches.filter(t => String(t.contactId) !== key),
      }
    }),

    // refinement (optional): { query, entityType, watchFor } from /api/refine-theme.
    addTheme: (contactId, label, category = 'topic', refinement = {}) => {
      const theme = {
        id: nextThemeId(), label: label.trim(), category,
        query: refinement.query || null,
        entityType: refinement.entityType || null,
        watchFor: refinement.watchFor || null,
        display: refinement.display || null,
      }
      syncedSet(s => ({
        themesByContact: {
          ...s.themesByContact,
          [contactId]: [...(s.themesByContact[contactId] || []), theme],
        },
      }))
      return theme
    },

    // A refinement that finished after the theme was already saved lands here.
    updateTheme: (contactId, themeId, refinement = {}) => syncedSet(s => ({
      themesByContact: {
        ...s.themesByContact,
        [contactId]: (s.themesByContact[contactId] || []).map(t => t.id === themeId ? {
          ...t,
          query: refinement.query || t.query,
          entityType: refinement.entityType || t.entityType,
          watchFor: refinement.watchFor || t.watchFor,
          display: refinement.display || t.display,
        } : t),
      },
    })),

    removeTheme: (contactId, themeId) => syncedSet(s => ({
      themesByContact: {
        ...s.themesByContact,
        [contactId]: (s.themesByContact[contactId] || []).filter(t => t.id !== themeId),
      },
    })),

    // Put a removed theme back exactly where it was (undo).
    restoreTheme: (contactId, theme, index) => syncedSet(s => {
      const list = [...(s.themesByContact[contactId] || [])]
      if (list.some(t => t.id === theme.id)) return {}
      list.splice(Math.min(index ?? list.length, list.length), 0, theme)
      return { themesByContact: { ...s.themesByContact, [contactId]: list } }
    }),

    // A touch is the user handing a message to Mail or Messages. Only recorded
    // when there was a real recipient; the caller checks the channel.
    recordTouch: (contactId, { channel, message, trigger }) => {
      const date = new Date().toISOString()
      if (!get().contacts.some(c => String(c.id) === String(contactId))) return
      syncedSet(s => ({
        touches: [{ id: randomId('touch'), contactId, date, channel, message, trigger }, ...s.touches],
        contacts: s.contacts.map(c => (String(c.id) === String(contactId) ? { ...c, lastTouch: date } : c)),
      }))
    },

    saveNote: (contactId, notes) => syncedSet(s => ({
      contacts: s.contacts.map(c => (String(c.id) === String(contactId) ? { ...c, notes } : c)),
    })),

    setPref: (key, value) => syncedSet(s => ({ prefs: { ...s.prefs, [key]: value } })),

    // 'sent' | 'dismissed' per reason, keyed by the server's content key so it
    // survives tab switches, relaunches and re-scans.
    markReason: (key, state) => {
      if (!key) return
      syncedSet(s => ({ reasonState: { ...s.reasonState, [key]: { state, at: new Date().toISOString() } } }))
    },
  }
})

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const s = useDataStore.getState()
    if (document.visibilityState === 'hidden') s.flushSync()
    else s.refreshIfStale()
  })
  window.addEventListener('pagehide', () => useDataStore.getState().flushSync())
  window.addEventListener('online', () => useDataStore.getState().flushSync())
}

// ── Selectors (derive in render; these return fresh objects) ────────────────

export function selectUpcomingBirthdays(state, withinDays = 10) {
  return state.contacts
    .map(c => ({ contact: c, days: daysUntilBirthday(c.birthday) }))
    .filter(({ days }) => days !== null && days <= withinDays)
    .sort((a, b) => a.days - b.days)
    .map(({ contact, days }) => {
      const first = contact.name.split(' ')[0]
      const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
      const opener = days === 0
        ? `Happy birthday, ${first}! 🎉 Hope you have a great one.`
        : `Happy birthday, ${first}! 🎉 Hope it's a great one — thinking of you.`
      return { contact, days, when, opener }
    })
}

// Contacts quietly drifting: no touch in 45+ days (brand-new contacts have no
// history yet and aren't "drifting"). Each gets a low-stakes opener.
export function selectNudges(state) {
  return state.contacts
    .filter(c => c.lastTouch)
    .map(c => ({ contact: c, health: healthFromLastTouch(c.lastTouch) }))
    .filter(({ health }) => health.days >= 45)
    .sort((a, b) => b.health.days - a.health.days)
    .map(({ contact, health }) => {
      const first = contact.name.split(' ')[0]
      const tail = contact.company ? `How's everything at ${contact.company}?` : "How's everything going?"
      return {
        contact,
        health,
        opener: `${first} — it's been a while! No agenda, just thinking about you. ${tail}`,
        reason: `${health.days} days since your last touchpoint`,
      }
    })
}
