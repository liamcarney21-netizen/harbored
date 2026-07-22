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

// Days since last touch → relationship health. This is the single source of
// truth for health everywhere in the app.
export function healthFromLastTouch(lastTouch) {
  const days = lastTouch ? Math.floor((Date.now() - new Date(lastTouch).getTime()) / DAY) : 999
  if (days < 30) return { key: 'strong',  label: 'Strong',  color: '#057642', bg: 'rgba(5,118,66,0.1)',   pct: Math.max(70, 100 - days), days }
  if (days < 60) return { key: 'cooling', label: 'Cooling', color: '#915907', bg: 'rgba(145,89,7,0.1)',   pct: Math.max(35, 70 - days),  days }
  return { key: 'at-risk', label: 'At Risk', color: '#CC1016', bg: 'rgba(204,16,22,0.08)', pct: Math.max(8, 40 - Math.min(days, 35)), days }
}

export function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
}

// Seed last-touch recency so health has meaningful spread out of the box.
const SEED_LAST_TOUCH = { 1: 2, 2: 10, 3: 35, 4: 50, 5: 65, 6: 90, 7: 20, 8: 75, 9: 15, 10: 40, 11: 25, 12: 55, 13: 42 }

// A couple of demo birthdays anchored a few days out from "now" so the
// Birthdays section is always populated in demo mode and screenshots. Real
// birthdays come from vCard/native import.
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
  { id: 'mtg-2', contactId: 2,  title: 'Catch-up call',                datetime: daysFromNow(5, 15, 0) },
]

function seedSnapshot() {
  return {
    contacts: buildSeedContacts(),
    themesByContact: buildSeedThemes(),
    touches: SEED_TOUCHES,
    meetings: SEED_MEETINGS,
  }
}

// Date.now() alone can collide when adding several contacts in a tight loop
// (e.g. bulk import) — duplicate ids silently clobber each other's themes.
let contactIdCounter = 0
function nextContactId() {
  contactIdCounter = (contactIdCounter + 1) % 1000
  return Date.now() * 1000 + contactIdCounter
}

// Every mutation writes the full snapshot back to Supabase, debounced so
// rapid successive actions (e.g. typing a note) don't spam the network.
let syncTimer = null
function scheduleSync(get) {
  if (get().loading) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const user = useAuthStore.getState().user
    if (!user) return
    const { contacts, themesByContact, touches, meetings } = get()
    supabase.from('user_data').upsert({
      user_id: user.id,
      data: { contacts, themesByContact, touches, meetings },
      updated_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('Failed to sync data to Supabase:', error.message)
    })
  }, 600)
}

export const useDataStore = create((set, get) => {
  const syncedSet = (partial) => {
    set(partial)
    scheduleSync(get)
  }

  return {
    contacts: [],
    themesByContact: {},
    touches: [],
    meetings: [],
    loading: true,

    // Called once a Supabase session is known (see App.jsx). Pulls this
    // user's saved data, or seeds a fresh account on first login.
    hydrate: async () => {
      const user = useAuthStore.getState().user
      if (!user) { set({ loading: false }); return }
      set({ loading: true })
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) console.error('Failed to load data from Supabase:', error.message)
      if (data?.data) {
        set({ ...data.data, loading: false })
      } else {
        set({ ...seedSnapshot(), loading: false })
        scheduleSync(get)
      }
    },

    // Called on logout so the next login on a shared device doesn't see
    // the previous user's data before hydrate() completes.
    reset: () => set({ contacts: [], themesByContact: {}, touches: [], meetings: [], loading: true }),

    // No-auth "See it live" demo: drop the sample network straight in, no
    // Supabase round-trip. Mutations still run (add/import/send all work) but
    // scheduleSync() no-ops without an auth user, so nothing persists.
    loadDemo: () => set({ ...seedSnapshot(), loading: false }),

    addMeeting: (contactId, { title, datetime }) => {
      const meeting = { id: `mtg-${Date.now()}`, contactId, title, datetime }
      syncedSet(s => ({ meetings: [...s.meetings, meeting] }))
      return meeting
    },

    removeMeeting: id => syncedSet(s => ({ meetings: s.meetings.filter(m => m.id !== id) })),

    // Sample-data controls: seeds are tagged so a real user can start clean
    // without losing anything they added themselves.
    clearSampleData: () => syncedSet(s => {
      const seedIds = new Set(s.contacts.filter(c => c.seed).map(c => c.id))
      const themesByContact = { ...s.themesByContact }
      for (const id of seedIds) delete themesByContact[id]
      return {
        contacts: s.contacts.filter(c => !c.seed),
        themesByContact,
        touches: s.touches.filter(t => !seedIds.has(t.contactId)),
        meetings: s.meetings.filter(m => !seedIds.has(m.contactId)),
      }
    }),

    restoreSampleData: () => syncedSet(s => {
      const existing = new Set(s.contacts.map(c => c.id))
      return {
        contacts: [...s.contacts, ...buildSeedContacts().filter(c => !existing.has(c.id))],
        themesByContact: { ...buildSeedThemes(), ...s.themesByContact },
        touches: [...s.touches.filter(t => !SEED_TOUCHES.some(st => st.id === t.id)), ...SEED_TOUCHES],
        meetings: [...s.meetings.filter(m => !SEED_MEETINGS.some(sm => sm.id === m.id)), ...SEED_MEETINGS],
      }
    }),

    addContact: ({ name, role, company, email, phone, birthday, themes = [] }) => {
      const id = nextContactId()
      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      const colors = ['#1e3a5f', '#1a2e4a', '#1c3554', '#172b45']
      const contact = {
        id, name, initials, role, company,
        color: colors[id % colors.length],
        email: email || fakeEmail(name),
        phone: phone || '',
        birthday: birthday || '',
        lastTouch: null,
        lastEvent: null,
        notes: '',
      }
      syncedSet(s => ({
        contacts: [...s.contacts, contact],
        themesByContact: {
          ...s.themesByContact,
          [id]: themes.map((t, i) => ({ id: `t${id}-${i}`, label: t.label, category: t.category, updatesThisMonth: 0, query: t.query || null, entityType: t.entityType || null, watchFor: t.watchFor || null })),
        },
      }))
      return contact
    },

    // refinement (optional): { query, entityType, watchFor } from /api/refine-theme.
    // The scan searches news with `query` when present, falling back to `label`.
    addTheme: (contactId, label, category, refinement = {}) => syncedSet(s => ({
      themesByContact: {
        ...s.themesByContact,
        [contactId]: [
          ...(s.themesByContact[contactId] || []),
          {
            id: `t${Date.now()}`, label, category, updatesThisMonth: 0,
            query: refinement.query || null,
            entityType: refinement.entityType || null,
            watchFor: refinement.watchFor || null,
          },
        ],
      },
    })),

    removeTheme: (contactId, themeId) => syncedSet(s => ({
      themesByContact: {
        ...s.themesByContact,
        [contactId]: (s.themesByContact[contactId] || []).filter(t => t.id !== themeId),
      },
    })),

    recordTouch: (contactId, { channel, message, trigger }) => {
      const date = new Date().toISOString()
      syncedSet(s => ({
        touches: [{ id: `touch-${Date.now()}`, contactId, date, channel, message, trigger }, ...s.touches],
        contacts: s.contacts.map(c => (c.id === contactId ? { ...c, lastTouch: date } : c)),
      }))
    },

    saveNote: (contactId, notes) => syncedSet(s => ({
      contacts: s.contacts.map(c => (c.id === contactId ? { ...c, notes } : c)),
    })),

    getContact: id => get().contacts.find(c => c.id === Number(id) || c.id === id),
  }
})

// Contacts quietly drifting: no touch in 45+ days. Each gets a low-stakes
// opener so there's always a next step, even with no news.
// Contacts whose birthday falls within the next `withinDays` days — a non-news
// reach-out signal computed entirely from local contact data (no API). Sorted
// soonest-first, each with a warm, ready-to-send opener.
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

export function selectNudges(state) {
  return state.contacts
    .filter(c => c.lastTouch) // brand-new contacts aren't "drifting" — they have no history yet
    .map(c => ({ contact: c, health: healthFromLastTouch(c.lastTouch) }))
    .filter(({ health }) => health.days >= 45)
    .sort((a, b) => b.health.days - a.health.days)
    .map(({ contact, health }) => {
      const first = contact.name.split(' ')[0]
      const themes = []
      return {
        contact,
        health,
        opener: `${first} — it's been a while! No agenda, just thinking about you. How's everything at ${contact.company}?`,
        reason: `${health.days} days since your last touchpoint${themes.length ? '' : ''}`,
      }
    })
}
