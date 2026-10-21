// Push notification registration — native (iOS) only. On the web every call
// is a no-op: the plugin is only dynamically imported inside the native guard.
//
// Registration is split in two: `registerPushNotifications()` registers
// silently whenever permission is already granted (every sign-in, every
// launch), and `registerPushNotifications({ prompt: true })` is the one place
// the iOS permission prompt is shown — after the person has brought in their
// first people, when a push means something.

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { isNative } from '../lib/platform'

let listening = false
let lastToken = null

async function plugin() {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  return PushNotifications
}

async function storeToken(token) {
  const user = useAuthStore.getState().user
  if (!user || !token) return
  const { error } = await supabase.from('device_tokens').upsert(
    { user_id: user.id, token, platform: 'ios', updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' },
  )
  if (error) console.error('[push] device token upsert failed:', error.message)
}

export async function registerPushNotifications({ prompt = false } = {}) {
  if (!isNative()) return 'web'
  if (!useAuthStore.getState().user) return 'no-user'
  const PushNotifications = await plugin()

  if (!listening) {
    listening = true
    await PushNotifications.addListener('registration', (token) => {
      lastToken = token?.value || null
      storeToken(lastToken)
    })
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration error:', err?.error)
    })
  }

  let perm = await PushNotifications.checkPermissions()
  if ((perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') && prompt) {
    perm = await PushNotifications.requestPermissions()
  }
  if (perm.receive === 'granted') {
    // Re-registering is cheap and re-delivers the token, which re-attaches it
    // to whoever is signed in now.
    await PushNotifications.register()
  }
  return perm.receive
}

export async function pushPermissionState() {
  if (!isNative()) return 'web'
  const PushNotifications = await plugin()
  const perm = await PushNotifications.checkPermissions()
  return perm.receive
}

// Detach this device from the signed-in account (sign-out, account deletion)
// so the next account on this phone doesn't receive the previous one's pushes.
export async function unregisterPushToken() {
  if (!isNative()) return
  const user = useAuthStore.getState().user
  if (!user) return
  try {
    let q = supabase.from('device_tokens').delete().eq('user_id', user.id)
    if (lastToken) q = q.eq('token', lastToken)
    const { error } = await q
    if (error) console.error('[push] token removal failed:', error.message)
  } catch (e) {
    console.error('[push] token removal failed:', e?.message || e)
  }
}
