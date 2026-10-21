// Vercel serverless function + Cron target: POST/GET /api/scan
//
// Fired by Vercel Cron (see vercel.json). Vercel automatically attaches
// `Authorization: Bearer $CRON_SECRET` to cron invocations when CRON_SECRET is
// set, so we require it here — this endpoint reads all users and spends Anthropic
// credits, so it must never be publicly callable.
//
// One run = scan every user, then push (even if some users errored), then a
// scan_runs row, a one-line summary log, and an alert email when unhealthy /
// heartbeat ping when healthy. See server/scanRun.js.
import { runScheduledScan } from '../server/scanRun.js'
import { createServiceClient } from '../server/db.js'

// Scanning many themes involves several outbound fetches + a Claude call per
// user; give the function room beyond the default. (Capped at the plan's max.)
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || (req.headers.authorization || '') !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const supabase = createServiceClient()
  if (!supabase) {
    res.status(500).json({ error: 'Supabase service role not configured (SUPABASE_SERVICE_ROLE_KEY / URL)' })
    return
  }

  try {
    const { ok, scan, push, run } = await runScheduledScan(supabase)
    res.status(ok ? 200 : 500).json({ ok, ...(scan || {}), push, run, ...(ok ? {} : { error: run.error }) })
  } catch (err) {
    console.error(`[scan] unexpected failure: ${err?.message || err}`)
    res.status(500).json({ ok: false, error: String(err?.message || err) })
  }
}
