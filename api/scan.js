// Vercel serverless function + Cron target: POST/GET /api/scan
//
// Fired by Vercel Cron (see vercel.json). Vercel automatically attaches
// `Authorization: Bearer $CRON_SECRET` to cron invocations when CRON_SECRET is
// set, so we require it here — this endpoint reads all users and spends Anthropic
// credits, so it must never be publicly callable.
import { runScan, createServiceClient } from '../server/scanHandler.js'

// Scanning many themes involves several outbound fetches + a Claude call; give
// the function room beyond the default. (Capped at the plan's max on Hobby.)
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
    const summary = await runScan(supabase)
    res.status(200).json({ ok: true, ...summary })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) })
  }
}
