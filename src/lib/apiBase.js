// On the web (PWA/browser) the app is served from the same origin as its API
// functions, so relative paths like `/api/news` just work. Inside the Capacitor
// native app, the web assets are served from capacitor://localhost — which has
// no /api — so API calls must target the deployed origin instead.
//
// window.Capacitor is injected only by the native runtime; on the web this
// returns the path unchanged, so the PWA/web build is completely unaffected.
const NATIVE_API_ORIGIN = 'https://harbored-three.vercel.app'

export function apiUrl(path) {
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
  return isNative ? `${NATIVE_API_ORIGIN}${path}` : path
}
