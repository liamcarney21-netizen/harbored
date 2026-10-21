// The native launch screen stays up until the first real screen has rendered
// (login or the app shell). Idempotent; a no-op on the web.
import { isNative } from './platform'

let hidden = false

export async function hideSplash() {
  if (hidden) return
  hidden = true
  if (!isNative()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 180 })
  } catch { /* plugin missing in an old build — nothing to hide */ }
}
