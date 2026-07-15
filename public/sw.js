// Minimal service worker for installability + a basic offline shell.
// Deliberately conservative: network-first for page navigations (so a new
// deploy is never stuck behind a stale cache), cache-first for same-origin
// static assets, and completely hands-off for /api/ and cross-origin requests
// (the news/discover/waitlist endpoints and Supabase must always hit network).
const CACHE = 'harbored-v1'
const PRECACHE = ['/', '/index.html', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return   // never touch Supabase, RSS, etc.
  if (url.pathname.startsWith('/api/')) return       // never cache API responses

  // Navigations: network-first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // Static same-origin assets (hashed JS/CSS, icons): cache-first.
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        return res
      })
    )
  )
})
