// Vercel serverless function + Cron target: /api/digest
//
// Fired weekly by Vercel Cron (see vercel.json). Emails each user the reach-out
// opportunities the scan found for them. Gated by CRON_SECRET like /api/scan —
// it reads all users and (with a Resend key) sends real email, so it must never
// be publicly callable.
import { runDigest } from '../server/digestHandler.js'
import { createServiceClient } from '../server/scanHandler.js'

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
    const summary = await runDigest(supabase)
    res.status(200).json({ ok: true, ...summary })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) })
  }
}
