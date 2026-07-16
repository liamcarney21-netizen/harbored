// Push notification registration — native (iOS) only. Requests permission,
// registers with APNs, and stores the resulting device token in Supabase so the
// server can push to this device. On the web (PWA) this is a no-op: the plugin is
// only dynamically imported inside the native guard, so it never touches the web
// bundle's behavior.
//
// End-to-end delivery still needs (Liam, in Apple Developer): the Push
// Notifications capability on the App ID + an APNs auth key. Plus the server-side
// send service (built next). This half captures + stores the token.

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

let started = false

export async function registerPushNotifications() {
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
  if (!isNative || started) return
  started = true

  // Dynamic import keeps @capacitor/push-notifications out of the web bundle.
  const { PushNotifications } = await import('@capacitor/push-notifications')

  // APNs hands us the device token here — store it against the current user.
  await PushNotifications.addListener('registration', async (token) => {
    const user = useAuthStore.getState().user
    if (!user || !token?.value) return
    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: user.id,
        token: token.value,
        platform: 'ios',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    )
    if (error) console.error('[push] device token upsert failed:', error.message)
  })

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registration error:', err?.error)
  })

  // Ask for permission (if not already decided), then register with APNs.
  let perm = await PushNotifications.checkPermissions()
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions()
  }
  if (perm.receive === 'granted') {
    await PushNotifications.register()
  }
}
