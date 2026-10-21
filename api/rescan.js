// Vercel serverless function: POST /api/rescan (Authorization: Bearer <supabase access token>)
// Scans the caller's own themes now. See server/rescanHandler.js.
import { handleRescanRequest } from '../server/rescanHandler.js'
import { rateLimit, clientIp } from '../server/rateLimit.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  // Coarse per-IP guard in front of the token check; the real limit
  // (3/hour per user) is inside the handler.
  if (!rateLimit(`rescan-ip:${clientIp(req)}`, 30, 3600000)) {
    res.status(429).json({ ok: false, status: 'rate_limited', error: 'Rate limit reached — try again in a bit.' })
    return
  }
  const { status, body } = await handleRescanRequest(req.headers.authorization)
  res.status(status).json(body)
}
