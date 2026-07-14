import { create } from 'zustand'
import { useDataStore } from './dataStore'

// A no-auth "See it live" mode. Judges (and anyone evaluating the product)
// can experience the full app with a seeded sample network instead of hitting
// the login wall or an empty account. Backed by sessionStorage so it survives
// a refresh on /dashboard but doesn't linger across browser sessions.
const KEY = 'harbored_demo'

function readFlag() {
  try {
    return sessionStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export const useDemoStore = create((set) => ({
  active: readFlag(),

  // Enter demo mode and populate the data store with sample data. Safe to call
  // even when a real user is signed out — dataStore's sync self-disables with
  // no auth user, so nothing is written to Supabase.
  enter: () => {
    try { sessionStorage.setItem(KEY, 'true') } catch { /* private mode */ }
    set({ active: true })
    useDataStore.getState().loadDemo()
  },

  exit: () => {
    try { sessionStorage.removeItem(KEY) } catch { /* private mode */ }
    set({ active: false })
    useDataStore.getState().reset()
  },
}))
