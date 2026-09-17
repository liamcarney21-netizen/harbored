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

// iOS pans the whole WKWebView up when the keyboard would cover a focused
// input — and with our fixed 100vh/overflow-hidden layouts it sometimes never
// pans back, leaving the app shifted under the status bar. Nothing in the page
// can scroll it back, so snap the pan home whenever focus leaves an input.
if (isNativeApp) {
  window.addEventListener('focusout', () => {
    setTimeout(() => {
      const ae = document.activeElement
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }, 250) // let the keyboard start dismissing first
  })
}

if (import.meta.env.PROD && !isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
