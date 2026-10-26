// Funnel events (supabase/migrations/0008_events.sql): a few in-app moments
// per account, so we can see where people stop. Names and small counts only;
// never names, contact details, headlines or message text. Signed-in accounts
// only (the demo is never counted), fire-and-forget: a failed or missing
// table never affects the app.
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useDemoStore } from '../store/demoStore'
import { isNative } from '../lib/platform'

const PROP_KEYS = /^[a-z_]{1,24}$/

// Only short strings, numbers and booleans travel; anything else is dropped,
// so a careless call can't ship a name or a headline.
export function cleanProps(props = {}) {
  const out = {}
  for (const [k, v] of Object.entries(props || {})) {
    if (!PROP_KEYS.test(k)) continue
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    else if (typeof v === 'boolean') out[k] = v
    else if (typeof v === 'string' && v.length <= 24 && /^[a-z0-9_-]*$/i.test(v)) out[k] = v
  }
  return out
}

export function track(name, props) {
  const user = useAuthStore.getState().user
  if (!user || useDemoStore.getState().active) return
  supabase.from('events')
    .insert({ user_id: user.id, name, props: cleanProps(props), platform: isNative() ? 'ios' : 'web' })
    .then(({ error }) => { if (error) console.warn('[events]', name, error.message) }, () => {})
}

// Moments that matter once per account ("first reason seen"). Remembered per
// device, so another phone may count one again; good enough for a funnel.
export function trackOnce(name, props) {
  const user = useAuthStore.getState().user
  if (!user || useDemoStore.getState().active) return
  const key = `harbored_event_${name}_${user.id}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch { /* private mode: count it anyway */ }
  track(name, props)
}
