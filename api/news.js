// Vercel serverless function: GET /api/news?q=<theme>
import { handleNewsRequest } from '../server/newsHandler.js'

export default async function handler(req, res) {
  const { status, body } = await handleNewsRequest(req.query.q, Number(req.query.limit) || 5)
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
  res.status(status).json(body)
}
