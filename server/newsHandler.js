// Shared Google News RSS fetcher — used by the scan, the vite dev middleware
// and the Vercel serverless function (api/news.js). Keyless: Google News RSS
// needs no API key, which makes theme monitoring work out of the box.
//
// Google's feed is ranked by relevance, not date (a "Minnesota Vikings" feed
// had a 1.2-day-old item first and a fresh one third; a pickleball feed mixed
// in items 847 days old). So every query gets the `when:3d` operator, items
// are parsed in full and sorted newest-first by pubDate, and the scan keeps
// only items published within the last 72 hours (filterFresh).

export const MAX_ITEMS = 8
export const FRESH_HOURS = 72

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

// Single pass, so "&amp;lt;" correctly becomes "&lt;" (not "<"), and numeric
// entities (&#8217; &#x2019;) decode instead of reaching a push notification.
export function decodeEntities(s) {
  return String(s).replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match
      try { return String.fromCodePoint(code) } catch { return match }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()]
    return named === undefined ? match : named
  })
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))
  if (!m) return ''
  return decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim())
}

function toIso(pubDate) {
  if (!pubDate) return null
  const t = new Date(pubDate).getTime()
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

// Parse every <item> in an RSS document. Pure (exported for tests).
export function parseRss(xml) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(String(xml || '')))) {
    const block = m[1]
    // Google News titles end with " - Source Name"
    let title = tag(block, 'title')
    let source = tag(block, 'source')
    const dash = title.lastIndexOf(' - ')
    if (!source) {
      if (dash > 0) { source = title.slice(dash + 3); title = title.slice(0, dash) }
    } else if (dash > 0) {
      title = title.slice(0, dash)
    }
    if (!title) continue
    const pubDate = tag(block, 'pubDate')
    items.push({
      title,
      link: tag(block, 'link'),
      guid: tag(block, 'guid') || null,
      pubDate,
      publishedAt: toIso(pubDate),
      source: source || 'Google News',
    })
  }
  return items
}

// Newest first; items with no parseable date sort last.
export function sortByPublished(items) {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : -Infinity
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : -Infinity
    return tb - ta
  })
}

// Items published within `maxAgeHours` of `now`, newest first. Undated items
// are dropped: freshness can't be verified, and stale news pushed as new was
// one of the audit's top findings. A small future skew is tolerated.
export function filterFresh(items, { now = Date.now(), maxAgeHours = FRESH_HOURS } = {}) {
  const nowMs = typeof now === 'function' ? now() : Number(now)
  return sortByPublished(items).filter(it => {
    if (!it?.publishedAt) return false
    const age = nowMs - Date.parse(it.publishedAt)
    return age <= maxAgeHours * 3600000 && age >= -6 * 3600000
  })
}

export function withRecency(query, when = '3d') {
  const q = String(query || '').trim()
  if (!when || /(^|\s)when:\d+[hdmy]\b/i.test(q)) return q
  return `${q} when:${when}`
}

export async function fetchThemeNews(query, limit = MAX_ITEMS, { when = '3d', fetchImpl = globalThis.fetch } = {}) {
  const q = withRecency(query, when)
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
  const resp = await fetchImpl(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; HarboredBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`)
  const xml = await resp.text()
  const max = Math.max(1, Math.min(Number(limit) || MAX_ITEMS, MAX_ITEMS))
  return sortByPublished(parseRss(xml)).slice(0, max)
}

export async function handleNewsRequest(query, limit) {
  if (!query || !String(query).trim()) return { status: 400, body: { error: 'missing q parameter' } }
  if (String(query).length > 500) return { status: 400, body: { error: 'q is too long (max 500 characters)' } }
  try {
    const items = await fetchThemeNews(query, limit)
    return { status: 200, body: { query, items } }
  } catch (err) {
    return { status: 502, body: { error: String(err.message || err) } }
  }
}
