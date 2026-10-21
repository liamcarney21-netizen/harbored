// The home-screen widget reads one JSON value from the shared app group.
// Native only; no-ops on the web.
import { isNative } from '../lib/platform'

const KEY = 'widget_today'

export async function publishWidget(payload) {
  if (!isNative()) return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    if (!payload) { await Preferences.remove({ key: KEY }); return }
    await Preferences.set({ key: KEY, value: JSON.stringify({ ...payload, updatedAt: Date.now() }) })
  } catch { /* widget is best effort */ }
}

export async function clearWidget() {
  return publishWidget(null)
}
