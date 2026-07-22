// Theme refinement — turns a user's raw theme label into a precise news query
// at theme-creation time. This is the single biggest lever on signal quality:
// garbage-in ("Fintech startup") is where most irrelevant alerts are born, so
// we fix it at the source, grounded with the contact's company/role.
//
// Two engines, same shape as discoverHandler/scoreHandler:
//  - "claude"    — used when ANTHROPIC_API_KEY is set. Resolves the entity and
//                  builds a quoted, event-aware Google News query.
//  - "heuristic" — keyless fallback: quote the label so at least multi-word
//                  entities match tighter than a bare string.

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

const ENTITY_TYPES = ['person', 'company', 'team', 'place', 'topic']

function clampWatchFor(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(s => String(s).trim()).filter(Boolean).slice(0, 4)
}

// Keyless fallback: quote a multi-word label so Google News matches the phrase
// rather than loose tokens. Better than the raw string, no model needed.
function heuristicRefine(label) {
  const clean = String(label || '').trim()
  const query = /\s/.test(clean) ? `"${clean}"` : clean
  return {
    engine: 'heuristic',
    entityType: 'topic',
    query,
    watchFor: ['significant news'],
    display: `Watching ${clean} for significant news.`,
  }
}

async function claudeRefine({ label, contactName, contactCompany, contactRole }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system:
        `You turn a user's shared-interest "theme" into a precise news-search query for a relationship app called Harbored. ` +
        `The theme is what the user follows in common with a specific contact. Your job is to resolve exactly what should be monitored and build a tight query.\n\n` +
        `Return JSON only: {"entityType": one of ${JSON.stringify(ENTITY_TYPES)}, "query": "...", "watchFor": ["...", ...], "display": "..."}\n\n` +
        `Rules:\n` +
        `- Identify the SPECIFIC subject. Use the contact's company/role as grounding when the theme is vague — e.g. theme "fintech startup" for a contact at "Sunny Benefits" resolves to the company Sunny Benefits, not the fintech category.\n` +
        `- query: a Google News search string. Put specific entity names in double quotes. Add a small parenthesized OR-group of the event types that would matter for this entity type (company → funding OR hiring OR launch OR partnership OR acquisition; team → game OR signs OR trade OR championship; person → appointed OR joins OR named OR wins; place/topic → keep broad). Keep it to one line, no site: filters.\n` +
        `- watchFor: 2-4 short plain phrases naming what we'll watch (e.g. "funding", "new hires", "product launches").\n` +
        `- display: one friendly sentence for a confirmation card, naming the resolved subject and, if used, the contact — e.g. "Watching Sunny Benefits (Kellan's company) for funding, hires, and launches."\n` +
        `- If the theme is a bare category with no resolvable specific subject, set entityType "topic" and keep the query broad, and say so plainly in display.`,
      messages: [
        {
          role: 'user',
          content: `Theme: ${JSON.stringify(label)}\nContact: ${JSON.stringify(contactName || '')}\nContact company: ${JSON.stringify(contactCompany || '')}\nContact role: ${JSON.stringify(contactRole || '')}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) throw new Error(`Claude API ${resp.status}`)
  const data = await resp.json()
  const raw = data.content?.[0]?.text || '{}'
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
  const entityType = ENTITY_TYPES.includes(parsed.entityType) ? parsed.entityType : 'topic'
  const query = String(parsed.query || '').trim()
  if (!query) throw new Error('empty query')
  return {
    engine: 'claude',
    entityType,
    query,
    watchFor: clampWatchFor(parsed.watchFor),
    display: String(parsed.display || '').trim() || `Watching ${label}.`,
  }
}

export async function handleRefineRequest({ label, contactName, contactCompany, contactRole } = {}) {
  if (!label || !String(label).trim()) {
    return { status: 400, body: { error: 'label required' } }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return { status: 200, body: await claudeRefine({ label, contactName, contactCompany, contactRole }) }
    } catch {
      // fall through — never hard-fail theme creation
    }
  }
  return { status: 200, body: heuristicRefine(label) }
}
