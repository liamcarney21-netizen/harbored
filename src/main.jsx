import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
// Fonts ship with the app. A render-blocking import from Google Fonts used to
// be line one of the stylesheet, which on a fresh install meant nothing
// painted until a cross-origin fetch finished.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/600.css'
import '@fontsource/lora/400-italic.css'
import '@fontsource-variable/fraunces/index.css'
import '@fontsource-variable/fraunces/wght-italic.css'
import './index.css'
import App from './App.jsx'
import { isNative } from './lib/platform'

// Vercel Analytics — web only. Inside the native app there is no analytics
// script to load, so it just logged an error on every launch.
if (!isNative()) inject()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the PWA service worker in production only — in dev it would sit in
// front of Vite's HMR and serve stale modules. Also skip it inside the native
// app, where the assets are bundled and served from capacitor://.
if (import.meta.env.PROD && !isNative() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// iOS pans the whole WKWebView when the keyboard covers a focused input. The
// Keyboard plugin's native resize handles most of it; this snaps the pan home
// whenever focus leaves an input, for the cases it doesn't.
if (isNative()) {
  window.addEventListener('focusout', () => {
    setTimeout(() => {
      const ae = document.activeElement
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }, 250)
  })
}
