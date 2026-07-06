// Theme monitoring: fetches live headlines per shared theme (via /api/news),
// scores each for significance, and drafts an outreach message.
//
// Scoring and drafting are heuristic/template-based for now. To upgrade to AI
// scoring + voice-matched drafting, replace scoreHeadline() and draftMessage()
// with a single Claude API call (claude-fable-5 or claude-haiku-4-5 for cost):
// pass the headline, the theme, and the contact's touch history; ask for
// { score, reasoning, draft } as JSON.

import { SIGNIFICANCE_THRESHOLD } from '../data/commonGround'

const HOT_WORDS = [
  ['announc', 14], ['confirm', 12], ['lands', 14], ['signs', 12], ['wins', 12],
  ['launch', 12], ['approv', 14], ['trade', 12], ['hire', 10], ['raises', 12],
  ['record', 12], ['first', 10], ['major', 10], ['breaking', 16], ['historic', 14],
  ['biggest', 12], ['blockbuster', 14], ['reform', 10], ['acquir', 14], ['merger', 12],
  ['ipo', 12], ['champion', 12], ['upset', 10], ['surge', 10], ['soar', 10], ['crash', 12],
]
const COLD_WORDS = [
  ['weekly', -10], ['rates tick', -12], ['schedule', -8], ['preview', -8],
  ['rumor', -10], ['prediction', -8], ['how to', -12], ['best of', -10],
  ['roundup', -10], ['recap', -6], ['odds', -8], ['forecast', -6],
]

// "Give first" signals: resourceful, forwardable content — the kind of thing
// you send as a favor ("thought you'd want to see this") rather than as
// breaking news. These headlines usually score below the reach-out bar but
// are still worth passing along on a shared theme.
const GIVE_WORDS = [
  'guide', 'how to', 'tips', 'ranking', 'ranked', 'best ', 'top ', 'list of',
  'report', 'study', 'analysis', 'breakdown', 'deep dive', 'primer', 'explained',
  'review', 'roundup', 'schedule', 'dates', 'calendar', 'forecast', 'opens', 'registration',
]

export function isGiveable(title) {
  const t = title.toLowerCase()
  return GIVE_WORDS.some(w => t.includes(w))
}

export function scoreHeadline(title, pubDate) {
  const t = title.toLowerCase()
  let score = 42
  for (const [w, pts] of HOT_WORDS) if (t.includes(w)) score += pts
  for (const [w, pts] of COLD_WORDS) if (t.includes(w)) score += pts
  if (/\$[\d,.]+|\d+%|№|\bno\. ?\d/i.test(title)) score += 6
  if (pubDate) {
    const ageH = (Date.now() - new Date(pubDate).getTime()) / 3600000
    if (ageH < 24) score += 12
    else if (ageH < 72) score += 6
  }
  return Math.max(8, Math.min(97, Math.round(score)))
}

const DRAFTS = [
  (first, theme, headline) => `${first} — did you see this? "${headline}" Immediately thought of you. What's your read?`,
  (first, theme, headline) => `${first}! Big ${theme} news: "${headline}" — we need to talk about this one.`,
  (first, theme, headline) => `Hey ${first} — just saw "${headline}" and figured you'd have thoughts. Coffee soon?`,
]

export function draftMessage(firstName, themeLabel, headline) {
  const i = Math.abs(hash(headline)) % DRAFTS.length
  return DRAFTS[i](firstName, themeLabel, headline)
}

// Generosity framing: forward it as a favor, no ask attached.
const GIVE_DRAFTS = [
  (first, theme, headline) => `${first} — saw this and thought of you: "${headline}". No agenda, just figured you'd want it.`,
  (first, theme, headline) => `Hey ${first}, this looked right up your alley — "${headline}". Sharing in case it's useful.`,
  (first, theme, headline) => `${first} — filing this under things you'd appreciate: "${headline}". Enjoy.`,
]

export function draftGiveMessage(firstName, themeLabel, headline) {
  const i = Math.abs(hash(headline + 'give')) % GIVE_DRAFTS.length
  return GIVE_DRAFTS[i](firstName, themeLabel, headline)
}

export function holdReasonFor(score) {
  if (score >= 55) return 'Close to the bar, but not a clear reason to interrupt. Logged for your next natural touchpoint.'
  if (score >= 40) return 'Routine coverage with a low engagement signal. Not worth a ping.'
  return 'Minor update — no meaningful development detected.'
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
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

// Fetch the freshest headline for each (contact, theme) pair and shape it into
// the same update objects the Common Ground feed renders. Fails soft: any
// network error returns [] so the curated feed still stands alone.
export async function fetchLiveUpdates(contacts, themesByContact, { maxThemes = 6 } = {}) {
  const pairs = []
  for (const contact of contacts) {
    for (const theme of themesByContact[contact.id] || []) {
      pairs.push({ contact, theme })
    }
  }
  const sample = pairs.slice(0, maxThemes)

  const results = await Promise.allSettled(
    sample.map(async ({ contact, theme }) => {
      const resp = await fetch(`/api/news?q=${encodeURIComponent(theme.label)}&limit=3`)
      if (!resp.ok) throw new Error('news fetch failed')
      const { items } = await resp.json()
      if (!items?.length) return null
      const item = items[0]
      const score = scoreHeadline(item.title, item.pubDate)
      const first = contact.name.split(' ')[0]
      const above = score >= SIGNIFICANCE_THRESHOLD
      // Below the bar but resourceful → a "give first" candidate.
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
        factors: above
          ? [
              'Fresh coverage detected across news sources',
              `Directly on your shared theme with ${first}: ${theme.label}`,
              score >= 85 ? 'High-signal language — major development' : 'Clears the reach-out bar',
            ]
          : undefined,
        draftMessage: above ? draftMessage(first, theme.label, item.title) : undefined,
        giveable,
        giveMessage: giveable ? draftGiveMessage(first, theme.label, item.title) : undefined,
        holdReason: above ? undefined : holdReasonFor(score),
      }
    })
  )

  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
}
