// Vercel serverless function: POST /api/refine-theme { label, contactName, contactCompany, contactRole, relation }
import { handleRefineRequest } from '../server/refineHandler.js'
import { rateLimit, clientIp } from '../server/rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  // Guards Anthropic spend, but sized for a real first run: importing a dozen
  // people and giving each a few themes is ~40 refines in one sitting. At 30/hr
  // the tail of an import silently fell back to unrefined themes.
  if (!rateLimit(`refine:${clientIp(req)}`, 150, 3600000)) {
    res.status(429).json({ error: 'Rate limit reached — try again in a bit.' })
    return
  }
  const { status, body } = await handleRefineRequest(req.body || {})
  res.status(status).json(body)
}
