import { create } from 'zustand'

// One quiet toast at a time, with an optional undo. Used for anything that
// used to disappear silently (a removed theme, a failed save).
export const useToast = create((set, get) => ({
  toast: null,
  show: (message, { action, onAction, ms = 4500 } = {}) => {
    const id = Date.now()
    set({ toast: { id, message, action, onAction } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, ms)
  },
  hide: () => set({ toast: null }),
}))
