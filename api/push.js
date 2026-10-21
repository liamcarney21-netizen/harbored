// Vercel serverless function: /api/push
//
// Sends push notifications for push-worthy stories from the last 24 hours of
// scans (the daily cron pushes inline, right after its scan — see api/scan.js;
// this endpoint is for manual runs). Gated by CRON_SECRET like /api/scan and
// /api/digest. Runs in preview mode (sends nothing) until the APNS_* env vars
// are set.
import { runPush } from '../server/pushHandler.js'
import { createServiceClient } from '../server/db.js'

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
    const summary = await runPush(supabase, { deadline: Date.now() + 50000 })
    res.status(200).json({ ok: true, ...summary })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) })
  }
}
