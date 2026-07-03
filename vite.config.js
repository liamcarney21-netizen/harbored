import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleNewsRequest } from './server/newsHandler.js'
import { handleDiscoverRequest } from './server/discoverHandler.js'
import { handleWaitlistRequest } from './server/waitlistHandler.js'

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
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), harboredApi()],
})
