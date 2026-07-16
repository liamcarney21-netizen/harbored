import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.jsx'

// Vercel Analytics — no-ops in dev, reports page views in production once
// Analytics is enabled on the Vercel project.
inject()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the PWA service worker in production only — in dev it would sit in
// front of Vite's HMR and serve stale modules. Also skip it inside the Capacitor
// native app: there the assets are bundled and served from capacitor://, where a
// service worker just risks caching stale files with no offline benefit.
// window.Capacitor is injected by the native runtime; on the web it's undefined,
// so this stays a no-op for the PWA build.
const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
if (import.meta.env.PROD && !isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
