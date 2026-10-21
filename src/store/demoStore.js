import { create } from 'zustand'
import { useDataStore } from './dataStore'
import { useAuthStore } from './authStore'

// A no-auth "See it live" mode: the full app over a seeded sample network.
// Backed by sessionStorage so it survives a refresh on /dashboard but doesn't
// linger across browser sessions. It never applies to a signed-in account:
// the sample people must never be written over someone's real crew.
const KEY = 'harbored_demo'

function readFlag() {
  try {
    return sessionStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

function writeFlag(on) {
  try {
    if (on) sessionStorage.setItem(KEY, 'true')
    else sessionStorage.removeItem(KEY)
  } catch { /* private mode */ }
}

export const useDemoStore = create((set) => ({
  // A stale flag from a previous session never outranks a real session.
  active: readFlag() && !useAuthStore.getState().user,

  // Returns true when the demo was entered, false when the caller should just
  // open the real app instead (a user is signed in).
  enter: () => {
    if (useAuthStore.getState().user) {
      writeFlag(false)
      set({ active: false })
      useDataStore.getState().setDemo(false)
      return false
    }
    writeFlag(true)
    set({ active: true })
    useDataStore.getState().loadDemo()
    return true
  },

  // Leave the demo. Signed-in users get their own data back; everyone else
  // gets an empty store on the way to the login screen.
  exit: () => {
    writeFlag(false)
    set({ active: false })
    const data = useDataStore.getState()
    data.setDemo(false)
    if (useAuthStore.getState().user) data.hydrate()
    else data.reset()
  },

  // Drop the flag without touching the data store (used when a real sign-in
  // happens while the flag is set).
  clear: () => {
    writeFlag(false)
    set({ active: false })
    useDataStore.getState().setDemo(false)
  },
}))
