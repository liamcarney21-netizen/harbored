// Vercel serverless function: POST /api/refine-theme { label, contactName, contactCompany, contactRole }
import { handleRefineRequest } from '../server/refineHandler.js'
import { rateLimit, clientIp } from '../server/rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  // Strict: this endpoint can spend Anthropic credits.
  if (!rateLimit(`refine:${clientIp(req)}`, 30, 3600000)) {
    res.status(429).json({ error: 'Rate limit reached — try again in a bit.' })
    return
  }
  const { status, body } = await handleRefineRequest(req.body || {})
  res.status(status).json(body)
}
