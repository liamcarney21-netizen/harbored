import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleNewsRequest } from './server/newsHandler.js'
import { handleDiscoverRequest } from './server/discoverHandler.js'
import { handleWaitlistRequest } from './server/waitlistHandler.js'
import { handleScoreRequest } from './server/scoreHandler.js'

// Mirrors the api/ functions so /api/* works under `npm run dev` without Vercel.
function harboredApi() {
  return {
    name: 'harbored-api',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const { status, body } = await handleNewsRequest(
          url.searchParams.get('q'),
          Number(url.searchParams.get('limit')) || 5
        )
        res.statusCode = status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(body))
      })
      server.middlewares.use('/api/waitlist', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        let payload = {}
        try { payload = JSON.parse(raw || '{}') } catch { /* handled below as empty */ }
        const { status, body } = await handleWaitlistRequest(payload)
        res.statusCode = status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(body))
      })
      server.middlewares.use('/api/discover', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        let payload = {}
        try { payload = JSON.parse(raw || '{}') } catch { /* handled below as empty */ }
        const { status, body } = await handleDiscoverRequest(payload)
        res.statusCode = status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(body))
      })
      server.middlewares.use('/api/score', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        let payload = {}
        try { payload = JSON.parse(raw || '{}') } catch { /* handled below as empty */ }
        const { status, body } = await handleScoreRequest(payload)
        res.statusCode = status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(body))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load ALL .env vars (empty prefix), not just VITE_-prefixed ones, and put
  // them on process.env so server-only handlers (ANTHROPIC_API_KEY,
  // RESEND_API_KEY) can read them in dev the same way Vercel injects them in
  // prod. Vite would otherwise only expose VITE_ vars, and only to the
  // client bundle via import.meta.env — never to this Node process.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) process.env[key] = value
  }

  return {
    plugins: [react(), tailwindcss(), harboredApi()],
  }
})
