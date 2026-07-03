// Vercel serverless function: POST /api/waitlist { firstName, email }
import { handleWaitlistRequest } from '../server/waitlistHandler.js'
import { rateLimit, clientIp } from '../server/rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  if (!rateLimit(`waitlist:${clientIp(req)}`, 5, 3600000)) {
    res.status(429).json({ error: 'Too many signups from this address — try again later.' })
    return
  }
  const { status, body } = await handleWaitlistRequest(req.body || {})
  res.status(status).json(body)
}
