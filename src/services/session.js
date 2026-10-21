// Sign-out that leaves nothing behind: pending edits are written first, the
// device's push token is detached, the home-screen widget is cleared, and
// only then is the Supabase session dropped (locally — other devices keep
// theirs).
import { useAuthStore } from '../store/authStore'
import { useDataStore } from '../store/dataStore'
import { useDemoStore } from '../store/demoStore'
import { unregisterPushToken } from './push'
import { clearWidget } from './widget'

export async function signOutEverywhereLocal() {
  const data = useDataStore.getState()
  try { await data.flushSync() } catch { /* best effort */ }
  await unregisterPushToken()
  await clearWidget()
  useDemoStore.getState().clear()
  await useAuthStore.getState().logout()
  data.reset()
}

// After the server has deleted the account: wipe every local trace.
export async function forgetThisDevice(userId) {
  await unregisterPushToken().catch(() => {})
  await clearWidget()
  useDataStore.getState().forgetLocal(userId)
  try { localStorage.removeItem(`harbored_onboarded_${userId}`) } catch { /* ignore */ }
  useDemoStore.getState().clear()
}
