// Shared Google News RSS fetcher — used by the vite dev middleware and the
// Vercel serverless function (api/news.js). Keyless: Google News RSS needs no
// API key, which makes theme monitoring work out of the box.

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()) : ''
}

export async function fetchThemeNews(query, limit = 5) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
  const resp = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; HarboredBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`)
  const xml = await resp.text()

  const items = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) && items.length < limit) {
    const block = m[1]
    // Google News titles end with " - Source Name"
    let title = tag(block, 'title')
    let source = tag(block, 'source')
    if (!source) {
      const dash = title.lastIndexOf(' - ')
      if (dash > 0) { source = title.slice(dash + 3); title = title.slice(0, dash) }
    } else {
      const dash = title.lastIndexOf(' - ')
      if (dash > 0) title = title.slice(0, dash)
    }
    items.push({
      title,
      link: tag(block, 'link'),
      pubDate: tag(block, 'pubDate'),
      source: source || 'Google News',
    })
  }
  return items
}

export async function handleNewsRequest(query, limit) {
  if (!query || !query.trim()) return { status: 400, body: { error: 'missing q parameter' } }
  try {
    const items = await fetchThemeNews(query, limit)
    return { status: 200, body: { query, items } }
  } catch (err) {
    return { status: 502, body: { error: String(err.message || err) } }
  }
}
