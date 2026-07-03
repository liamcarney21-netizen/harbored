// Vercel serverless function: GET /api/news?q=<theme>
import { handleNewsRequest } from '../server/newsHandler.js'
import { rateLimit, clientIp } from '../server/rateLimit.js'

export default async function handler(req, res) {
  if (!rateLimit(`news:${clientIp(req)}`, 120, 3600000)) {
    res.status(429).json({ error: 'Rate limit reached — try again in a bit.' })
    return
  }
  const { status, body } = await handleNewsRequest(req.query.q, Number(req.query.limit) || 5)
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
  res.status(status).json(body)
}
