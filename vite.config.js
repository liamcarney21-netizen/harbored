import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleNewsRequest } from './server/newsHandler.js'
import { handleDiscoverRequest } from './server/discoverHandler.js'
import { handleRefineRequest } from './server/refineHandler.js'
import { handleWaitlistRequest } from './server/waitlistHandler.js'
import { handleScoreRequest } from './server/scoreHandler.js'
import { handleRedraftRequest } from './server/redraftHandler.js'
import { createServiceClient } from './server/db.js'
import { runScheduledScan } from './server/scanRun.js'
import { runDigest } from './server/digestHandler.js'
import { runPush } from './server/pushHandler.js'
import { handleRescanRequest } from './server/rescanHandler.js'

// The cron-style routes (scan, digest, push) run against whatever Supabase the
// env points at — with .env.local that is PRODUCTION, via the service-role key.
// So in dev they require CRON_SECRET to be set AND sent as a Bearer header:
// no secret → nothing runs, and no ?secret= in the URL (it ends up in browser
// history and logs, and makes a stray click enough to rewrite real data).
function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET
  return !!secret && (req.headers.authorization || '') === `Bearer ${secret}`
}

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
      server.middlewares.use('/api/refine-theme', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        let payload = {}
        try { payload = JSON.parse(raw || '{}') } catch { /* handled below as empty */ }
        const { status, body } = await handleRefineRequest(payload)
        res.statusCode = status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(body))
      })
      server.middlewares.use('/api/redraft', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        let payload = {}
        try { payload = JSON.parse(raw || '{}') } catch { /* handled below as empty */ }
        const { status, body } = await handleRedraftRequest(payload)
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
      // Server-side scan (the cron target). Requires CRON_SECRET as a Bearer
      // header (see cronAuthorized). It writes scan_results for real; push runs
      // in preview, and dev runs are neither recorded in scan_runs nor alerted.
      server.middlewares.use('/api/scan', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        if (!cronAuthorized(req)) {
          res.statusCode = 401
          res.end(JSON.stringify({ error: 'unauthorized' }))
          return
        }
        const supabase = createServiceClient()
        if (!supabase) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Supabase service role not configured (SUPABASE_SERVICE_ROLE_KEY / URL)' }))
          return
        }
        try {
          const { ok, scan, push, run } = await runScheduledScan(supabase, { push: { send: false }, record: false, notify: false })
          res.statusCode = ok ? 200 : 500
          res.end(JSON.stringify({ ok, preview: true, ...(scan || {}), push, run }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
        }
      })
      // Weekly digest. Dev always runs in preview mode (send: false) so testing
      // can never fire a real email at real accounts, even if a Resend key is set.
      server.middlewares.use('/api/digest', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        if (!cronAuthorized(req)) {
          res.statusCode = 401
          res.end(JSON.stringify({ error: 'unauthorized' }))
          return
        }
        const supabase = createServiceClient()
        if (!supabase) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Supabase service role not configured (SUPABASE_SERVICE_ROLE_KEY / URL)' }))
          return
        }
        try {
          const summary = await runDigest(supabase, { send: false })
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true, preview: true, ...summary }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
        }
      })
      // On-demand rescan of the caller's own account ("Check again"). Same
      // handler as api/rescan.js: the caller's Supabase access token as a
      // Bearer header, 3 per hour per user.
      server.middlewares.use('/api/rescan', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'POST only' }))
          return
        }
        const { status, body } = await handleRescanRequest(req.headers.authorization)
        res.statusCode = status
        res.end(JSON.stringify(body))
      })
      // Push send (APNs). Dev always runs in preview mode (send: false) so it
      // never attempts a real APNs call while testing.
      server.middlewares.use('/api/push', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        if (!cronAuthorized(req)) {
          res.statusCode = 401
          res.end(JSON.stringify({ error: 'unauthorized' }))
          return
        }
        const supabase = createServiceClient()
        if (!supabase) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Supabase service role not configured (SUPABASE_SERVICE_ROLE_KEY / URL)' }))
          return
        }
        try {
          const summary = await runPush(supabase, { send: false })
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true, preview: true, ...summary }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
        }
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
