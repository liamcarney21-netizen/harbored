import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { contacts as seedContacts } from '../data/appData'
import { sharedThemes as seedThemes } from '../data/commonGround'

const DAY = 86400000
const daysAgo = n => new Date(Date.now() - n * DAY).toISOString()

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

function fakeEmail(name) {
  return name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '.') + '@example.com'
}

function buildSeedContacts() {
  return seedContacts.map((c, i) => ({
    ...c,
    email: fakeEmail(c.name),
    phone: `+1 (555) 01${String(i).padStart(2, '0')}-${String(1000 + c.id * 37).slice(-4)}`,
    lastTouch: daysAgo(SEED_LAST_TOUCH[c.id] ?? 60),
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

export const useDataStore = create(
  persist(
    (set, get) => ({
      contacts: buildSeedContacts(),
      themesByContact: buildSeedThemes(),
      touches: SEED_TOUCHES,

      addContact: ({ name, role, company, email, phone, themes = [] }) => {
        const id = Date.now()
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        const colors = ['#1e3a5f', '#1a2e4a', '#1c3554', '#172b45']
        const contact = {
          id, name, initials, role, company,
          platforms: ['linkedin'],
          color: colors[id % colors.length],
          email: email || fakeEmail(name),
          phone: phone || '',
          lastTouch: null,
          lastEvent: null,
          notes: '',
        }
        set(s => ({
          contacts: [...s.contacts, contact],
          themesByContact: {
            ...s.themesByContact,
            [id]: themes.map((t, i) => ({ id: `t${id}-${i}`, label: t.label, category: t.category, updatesThisMonth: 0 })),
          },
        }))
        return contact
      },

      addTheme: (contactId, label, category) => set(s => ({
        themesByContact: {
          ...s.themesByContact,
          [contactId]: [
            ...(s.themesByContact[contactId] || []),
            { id: `t${Date.now()}`, label, category, updatesThisMonth: 0 },
          ],
        },
      })),

      removeTheme: (contactId, themeId) => set(s => ({
        themesByContact: {
          ...s.themesByContact,
          [contactId]: (s.themesByContact[contactId] || []).filter(t => t.id !== themeId),
        },
      })),

      recordTouch: (contactId, { channel, message, trigger }) => {
        const date = new Date().toISOString()
        set(s => ({
          touches: [{ id: `touch-${Date.now()}`, contactId, date, channel, message, trigger }, ...s.touches],
          contacts: s.contacts.map(c => (c.id === contactId ? { ...c, lastTouch: date } : c)),
        }))
      },

      saveNote: (contactId, notes) => set(s => ({
        contacts: s.contacts.map(c => (c.id === contactId ? { ...c, notes } : c)),
      })),

      getContact: id => get().contacts.find(c => c.id === Number(id) || c.id === id),
    }),
    {
      name: 'harbored-data',
      version: 1,
    }
  )
)

// Contacts quietly drifting: no touch in 45+ days. Each gets a low-stakes
// opener so there's always a next step, even with no news.
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
