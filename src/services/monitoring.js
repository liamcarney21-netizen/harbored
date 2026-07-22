// Theme monitoring: fetches live headlines per shared theme (via /api/news),
// then asks /api/score (Claude, with a keyword-heuristic fallback baked into
// the endpoint) to judge which ones actually clear the reach-out bar and
// draft a message for the ones that do.

import { SIGNIFICANCE_THRESHOLD } from '../data/commonGround'
import { apiUrl } from '../lib/apiBase'

const GIVE_WORDS = [
  'guide', 'how to', 'tips', 'ranking', 'ranked', 'best ', 'top ', 'list of',
  'report', 'study', 'analysis', 'breakdown', 'deep dive', 'primer', 'explained',
  'review', 'roundup', 'schedule', 'dates', 'calendar', 'forecast', 'opens', 'registration',
]

export function isGiveable(title) {
  const t = title.toLowerCase()
  return GIVE_WORDS.some(w => t.includes(w))
}

// Kept as a fallback for when /api/score itself is unreachable (network
// error) — the endpoint already falls back to the same heuristic server-side
// when no ANTHROPIC_API_KEY is set, so this only matters if the request
// can't complete at all.
function fallbackScore(title, pubDate) {
  const HOT = [['announc', 14], ['confirm', 12], ['lands', 14], ['signs', 12], ['wins', 12], ['launch', 12], ['approv', 14], ['trade', 12], ['hire', 10], ['raises', 12], ['record', 12], ['first', 10], ['major', 10], ['breaking', 16], ['historic', 14], ['biggest', 12], ['blockbuster', 14], ['reform', 10], ['acquir', 14], ['merger', 12], ['ipo', 12], ['champion', 12], ['upset', 10], ['surge', 10], ['soar', 10], ['crash', 12]]
  const COLD = [['weekly', -10], ['rates tick', -12], ['schedule', -8], ['preview', -8], ['rumor', -10], ['prediction', -8], ['how to', -12], ['best of', -10], ['roundup', -10], ['recap', -6], ['odds', -8], ['forecast', -6]]
  const t = title.toLowerCase()
  let score = 42
  for (const [w, pts] of HOT) if (t.includes(w)) score += pts
  for (const [w, pts] of COLD) if (t.includes(w)) score += pts
  if (pubDate) {
    const ageH = (Date.now() - new Date(pubDate).getTime()) / 3600000
    if (ageH < 24) score += 12
    else if (ageH < 72) score += 6
  }
  return Math.max(8, Math.min(97, Math.round(score)))
}

function relativeTime(pubDate) {
  if (!pubDate) return 'recently'
  const mins = Math.floor((Date.now() - new Date(pubDate).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return `${Math.floor(days / 7)} wk ago`
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function holdReasonFor(score) {
  if (score >= 55) return 'Close to the bar, but not a clear reason to interrupt. Logged for your next natural touchpoint.'
  if (score >= 40) return 'Routine coverage with a low engagement signal. Not worth a ping.'
  return 'Minor update — no meaningful development detected.'
}

// Fetch the freshest headline for each (contact, theme) pair, then score the
// whole batch in one call. Fails soft: any error just yields fewer/duller
// cards, never a crash.
export async function fetchLiveUpdates(contacts, themesByContact, { maxThemes = 6 } = {}) {
  const pairs = []
  for (const contact of contacts) {
    for (const theme of themesByContact[contact.id] || []) {
      pairs.push({ contact, theme })
    }
  }
  const sample = pairs.slice(0, maxThemes)

  const newsResults = await Promise.allSettled(
    sample.map(async ({ contact, theme }) => {
      const resp = await fetch(apiUrl(`/api/news?q=${encodeURIComponent(theme.query || theme.label)}&limit=3`))
      if (!resp.ok) throw new Error('news fetch failed')
      const { items } = await resp.json()
      if (!items?.length) return null
      return { contact, theme, item: items[0] }
    })
  )
  const found = newsResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
  if (found.length === 0) return []

  const scorePayload = found.map((f, i) => ({
    id: i,
    headline: f.item.title,
    source: f.item.source,
    pubDate: f.item.pubDate,
    themeLabel: f.theme.label,
    contactName: f.contact.name,
    contactCompany: f.contact.company,
    contactRole: f.contact.role,
  }))

  let scoreById = new Map()
  try {
    const resp = await fetch(apiUrl('/api/score'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: scorePayload }),
    })
    if (resp.ok) {
      const { results } = await resp.json()
      scoreById = new Map(results.map(r => [r.id, r]))
    }
  } catch {
    // fall through to per-item fallback below
  }

  return found.map(({ contact, theme, item }, i) => {
    const scored = scoreById.get(i)
    const score = scored?.score ?? fallbackScore(item.title, item.pubDate)
    const above = score >= SIGNIFICANCE_THRESHOLD
    const first = contact.name.split(' ')[0]
    const giveable = !above && isGiveable(item.title)
    return {
      id: `live-${contact.id}-${theme.id}-${hash(item.title)}`,
      live: true,
      link: item.link,
      themeLabel: theme.label,
      category: theme.category,
      contactId: contact.id,
      contactName: contact.name,
      contactInitials: contact.initials,
      contactColor: contact.color,
      headline: item.title,
      source: item.source,
      time: relativeTime(item.pubDate),
      score,
      // Claude's own one-sentence judgment of why this scored the way it did
      // (falls back to a heuristic rationale server-side when no API key).
      rationale: scored?.rationale,
      factors: above
        ? [
            'Fresh coverage detected across news sources',
            `Directly on your shared theme with ${first}: ${theme.label}`,
            score >= 85 ? 'High-signal language — major development' : 'Clears the reach-out bar',
          ]
        : undefined,
      draftMessage: above ? (scored?.draftMessage || `${first} — did you see this? "${item.title}" Immediately thought of you.`) : undefined,
      giveable,
      giveMessage: giveable ? `${first} — saw this and thought of you: "${item.title}". No agenda, just figured you'd want it.` : undefined,
      holdReason: above ? undefined : (scored?.holdReason || holdReasonFor(score)),
    }
  })
}
