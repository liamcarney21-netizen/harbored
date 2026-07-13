// Vercel serverless function: POST /api/score { items: [...] }
import { handleScoreRequest } from '../server/scoreHandler.js'
import { rateLimit, clientIp } from '../server/rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  // Strict: this endpoint can spend Anthropic credits.
  if (!rateLimit(`score:${clientIp(req)}`, 20, 3600000)) {
    res.status(429).json({ error: 'Rate limit reached — try again in a bit.' })
    return
  }
  const { status, body } = await handleScoreRequest(req.body || {})
  res.status(status).json(body)
}
