// Single source of truth for "are we running inside the installed native app?"
// (Capacitor injects window.Capacitor with isNativePlatform()). On the web this
// is always false, so marketing/waitlist UI shows only on the website.
export function isNative() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
}
