// Vercel serverless function: POST /api/discover { text, contactName }
import { handleDiscoverRequest } from '../server/discoverHandler.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  const { status, body } = await handleDiscoverRequest(req.body || {})
  res.status(status).json(body)
}
