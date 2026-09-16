// Vercel serverless function: POST /api/delete-account (Authorization: Bearer <supabase access token>)
import { handleDeleteAccount } from '../server/deleteAccountHandler.js'
import { rateLimit, clientIp } from '../server/rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  if (!rateLimit(`delete-account:${clientIp(req)}`, 5, 3600000)) {
    res.status(429).json({ error: 'Rate limit reached — try again in a bit.' })
    return
  }
  const { status, body } = await handleDeleteAccount(req.headers.authorization)
  res.status(status).json(body)
}
