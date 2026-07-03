// Per-IP sliding-window rate limiter. In-memory, so each serverless instance
// counts separately — imperfect, but enough to stop casual abuse of the
// public endpoints. Swap for Upstash/Redis when there are real users.

const buckets = new Map()

export function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  // Opportunistic cleanup so the map doesn't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every(t => now - t > windowMs)) buckets.delete(k)
    }
  }
  return true
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  return (Array.isArray(fwd) ? fwd[0] : (fwd || '').split(',')[0].trim()) || req.socket?.remoteAddress || 'unknown'
}
