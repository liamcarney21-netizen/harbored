import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseRss, decodeEntities, filterFresh, fetchThemeNews, handleNewsRequest, withRecency, sortByPublished } from './newsHandler.js'
import { installGuards, removeGuards } from './testing/guards.js'

const NOW = Date.parse('2026-10-21T13:00:00Z')
const hoursAgo = (h) => new Date(NOW - h * 3600000).toUTCString()

function rss(items) {
  return `<?xml version="1.0"?><rss><channel><title>x</title>${items.map(i => `
    <item>
      <title>${i.title}</title>
      <link>${i.link}</link>
      <guid isPermaLink="false">${i.guid}</guid>
      <pubDate>${i.pubDate}</pubDate>
      <source url="https://example.com">${i.source}</source>
    </item>`).join('')}</channel></rss>`
}

// Google ranks by relevance, not date: the fresh item is third here.
const FEED = rss([
  { title: 'Vikings win opener &amp; more - ESPN', link: 'https://news.google.com/rss/articles/A?oc=5', guid: 'A', pubDate: hoursAgo(29), source: 'ESPN' },
  { title: 'Vikings&#8217; QB &#x2014; &quot;ready&quot; - Star Tribune', link: 'https://news.google.com/rss/articles/B?oc=5', guid: 'B', pubDate: hoursAgo(100), source: 'Star Tribune' },
  { title: '<![CDATA[Vikings sign star receiver - NFL.com]]>', link: 'https://news.google.com/rss/articles/C?oc=5', guid: 'C', pubDate: hoursAgo(2), source: 'NFL.com' },
  { title: 'Vikings preview &amp;lt;not a tag&amp;gt; - Blog', link: 'https://news.google.com/rss/articles/D?oc=5', guid: 'D', pubDate: 'not a date', source: 'Blog' },
])

beforeEach(() => { installGuards() })
afterEach(() => removeGuards())

describe('parseRss / decodeEntities', () => {
  it('parses title, source, link, guid and publish time, stripping " - Source"', () => {
    const items = parseRss(FEED)
    expect(items).toHaveLength(4)
    expect(items[0]).toMatchObject({ title: 'Vikings win opener & more', source: 'ESPN', guid: 'A', link: 'https://news.google.com/rss/articles/A?oc=5' })
    expect(items[0].publishedAt).toBe(new Date(NOW - 29 * 3600000).toISOString())
    expect(items[2].title).toBe('Vikings sign star receiver')
    expect(items[3].publishedAt).toBe(null)
  })

  it('decodes numeric entities and decodes &amp; only once', () => {
    expect(parseRss(FEED)[1].title).toBe('Vikings’ QB — "ready"')
    expect(parseRss(FEED)[3].title).toBe('Vikings preview &lt;not a tag&gt;')
    expect(decodeEntities('A &amp;amp; B &#39;x&#39; &nbsp;&bogus;')).toBe("A &amp; B 'x'  &bogus;")
  })
})

describe('ordering and freshness (test e)', () => {
  it('sorts newest first with undated items last', () => {
    expect(sortByPublished(parseRss(FEED)).map(i => i.guid)).toEqual(['C', 'A', 'B', 'D'])
  })

  it('keeps only items published in the last 72 hours, newest first', () => {
    const fresh = filterFresh(parseRss(FEED), { now: NOW })
    expect(fresh.map(i => i.guid)).toEqual(['C', 'A'])
    expect(filterFresh(parseRss(FEED), { now: NOW + 48 * 3600000 }).map(i => i.guid)).toEqual(['C'])
  })

  it('fetchThemeNews adds when:3d, sorts by date and returns at most 8', async () => {
    const many = rss(Array.from({ length: 12 }, (_, i) => ({ title: `Story ${i} - Src`, link: `https://n.example/${i}`, guid: String(i), pubDate: hoursAgo(12 - i), source: 'Src' })))
    const fetchImpl = vi.fn(async () => new Response(many, { status: 200 }))
    const items = await fetchThemeNews('"Minnesota Vikings"', 50, { fetchImpl })
    const url = new URL(fetchImpl.mock.calls[0][0])
    expect(url.hostname).toBe('news.google.com')
    expect(url.searchParams.get('q')).toBe('"Minnesota Vikings" when:3d')
    expect(items).toHaveLength(8)
    expect(items[0].title).toBe('Story 11')
    expect(items.map(i => i.title)).toEqual(['Story 11', 'Story 10', 'Story 9', 'Story 8', 'Story 7', 'Story 6', 'Story 5', 'Story 4'])
  })

  it('does not add a second when: operator', () => {
    expect(withRecency('Vikings when:1d')).toBe('Vikings when:1d')
    expect(withRecency('Vikings')).toBe('Vikings when:3d')
  })
})

describe('handleNewsRequest', () => {
  it('validates q', async () => {
    expect((await handleNewsRequest('')).status).toBe(400)
    expect((await handleNewsRequest('x'.repeat(501))).status).toBe(400)
  })
})
