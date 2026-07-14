// Common Ground significance scoring: given a batch of candidate headlines
// (one per contact/theme pair), judges which actually clear the reach-out
// bar and drafts a message for the ones that do.
//
// Two engines, same shape as discoverHandler.js:
//  - "claude"    — used when ANTHROPIC_API_KEY is set. Reads each headline in
//                  the context of the shared theme and contact, and returns a
//                  genuine judgment call instead of a keyword score.
//  - "heuristic" — keyless fallback: the original keyword-weighted scorer, so
//                  the feature never hard-fails without an API key.

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
export const SIGNIFICANCE_THRESHOLD = 70

// Truncates at a word boundary instead of mid-word, so an over-length model
// response never ends on a fragment like "...know they're dee".
function truncate(str, max) {
  if (str.length <= max) return str
  const cut = str.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

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

function heuristicScore(title, pubDate) {
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
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h }
function heuristicDraft(first, theme, headline) {
  return DRAFTS[Math.abs(hash(headline)) % DRAFTS.length](first, theme, headline)
}
function heuristicHoldReason(score) {
  if (score >= 55) return 'Close to the bar, but not a clear reason to interrupt. Logged for your next natural touchpoint.'
  if (score >= 40) return 'Routine coverage with a low engagement signal. Not worth a ping.'
  return 'Minor update — no meaningful development detected.'
}

// One-sentence "why this score" used when Claude is unavailable, so the
// reasoning surface is never empty in the keyless fallback path.
function heuristicRationale(score, themeLabel) {
  const theme = themeLabel || 'this shared interest'
  if (score >= 85) return `Strong, high-signal development on ${theme} — a clear, timely reason to reach out.`
  if (score >= SIGNIFICANCE_THRESHOLD) return `A real update on ${theme} that clears the bar for a natural reach-out.`
  if (score >= 55) return `Some signal on ${theme}, but not decisive enough to interrupt for.`
  if (score >= 40) return `Routine ${theme} coverage — low engagement signal, logged quietly.`
  return `Minor ${theme} update with no meaningful development to act on.`
}

function heuristicBatch(items) {
  return items.map(item => {
    const score = heuristicScore(item.headline, item.pubDate)
    const above = score >= SIGNIFICANCE_THRESHOLD
    const first = (item.contactName || '').split(' ')[0] || 'Hey'
    return {
      id: item.id,
      score,
      rationale: heuristicRationale(score, item.themeLabel),
      draftMessage: above ? heuristicDraft(first, item.themeLabel, item.headline) : undefined,
      holdReason: above ? undefined : heuristicHoldReason(score),
    }
  })
}

async function claudeBatch(items) {
  const payload = items.map(item => ({
    id: item.id,
    headline: item.headline,
    source: item.source,
    pubDate: item.pubDate,
    themeLabel: item.themeLabel,
    contactName: item.contactName,
  }))

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system:
        `You judge whether a news headline is a genuine reason to reach out to someone, on behalf of a relationship-intelligence app called Harbored. ` +
        `The user only wants to be interrupted for things that actually matter to their contact — a promotion, a big win, real news on a shared interest — ` +
        `not routine coverage, schedules, rumors, or "best of" listicles. Score each headline 0-100 for how strong a reach-out trigger it is. ` +
        `Always include a "rationale": one plain-English sentence (under 140 characters) explaining the judgment behind the score — what about this specific ` +
        `headline, on this shared theme, makes it worth (or not worth) interrupting for. Be specific to the headline, not generic. ` +
        `A score of ${SIGNIFICANCE_THRESHOLD} or above means: draft a short, warm, specific text message the user could send as-is — first name, ` +
        `reference the actual headline, sound like a real friend texting, not a corporate greeting card. Below the bar: explain in one short sentence ` +
        `(under 100 characters) why it's not worth an interruption. Respond with JSON only, no prose.`,
      messages: [
        {
          role: 'user',
          content: `Score each of these ${payload.length} items:\n\n${JSON.stringify(payload, null, 2)}\n\n` +
            `Respond with exactly this JSON shape:\n{"results":[{"id":"...","score":0-100,"rationale":"...","draftMessage":"..." (only if score >= ${SIGNIFICANCE_THRESHOLD}),"holdReason":"..." (only if score < ${SIGNIFICANCE_THRESHOLD})}]}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  })
  if (!resp.ok) throw new Error(`Claude API ${resp.status}`)
  const data = await resp.json()
  const raw = data.content?.[0]?.text || '{}'
  const jsonStart = raw.indexOf('{')
  const jsonEnd = raw.lastIndexOf('}')
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
  const byId = new Map((parsed.results || []).map(r => [String(r.id), r]))

  return items.map(item => {
    const r = byId.get(String(item.id))
    if (!r) {
      // Claude skipped this one for some reason — fail soft to heuristic for just this item.
      return heuristicBatch([item])[0]
    }
    const score = Math.max(0, Math.min(100, Number(r.score) || 0))
    const above = score >= SIGNIFICANCE_THRESHOLD
    return {
      id: item.id,
      score,
      rationale: truncate(String(r.rationale || ''), 200) || heuristicRationale(score, item.themeLabel),
      draftMessage: above ? truncate(String(r.draftMessage || ''), 400) || undefined : undefined,
      holdReason: !above ? truncate(String(r.holdReason || ''), 200) || heuristicHoldReason(score) : undefined,
    }
  })
}

export async function handleScoreRequest({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { status: 400, body: { error: 'items array required' } }
  }
  const trimmed = items.slice(0, 20)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const results = await claudeBatch(trimmed)
      return { status: 200, body: { engine: 'claude', results } }
    } catch {
      // fall through so the feature never hard-fails
    }
  }
  return { status: 200, body: { engine: 'heuristic', results: heuristicBatch(trimmed) } }
}
