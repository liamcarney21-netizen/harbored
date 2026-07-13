// Common Ground discovery: extract shared themes from a pasted conversation.
//
// Two engines:
//  - "claude"    — used when ANTHROPIC_API_KEY is set (in the shell for dev,
//                  or in Vercel project env for prod). Reads the conversation
//                  and returns genuinely shared interests with evidence.
//  - "heuristic" — keyless fallback: a keyword taxonomy of common interest
//                  domains. Good enough to demo the flow end to end.

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

const TAXONOMY = [
  { re: /\b(basketball|hoops|march madness|final four|nba)\b/gi, label: 'Basketball', category: 'sports', qualify: /\b([A-Z][a-z]{2,})\s+(?:basketball|hoops)\b/ },
  { re: /\b(nfl|super bowl|draft night|touchdown)\b/gi, label: 'Football', category: 'sports', qualify: /\b((?:[A-Z][a-z]+\s)?[A-Z][a-z]+s)\b(?=[^.]*\b(?:game|draft|season)\b)/ },
  { re: /\b(golf|tee time|pga|the masters|back nine)\b/gi, label: 'Golf', category: 'sports' },
  { re: /\b(pickleball)\b/gi, label: 'Pickleball', category: 'hobby', qualify: /pickleball\s+(?:in|at|down in)\s+([A-Z][\w]+(?:,?\s[A-Z][\w]+)?)/ },
  { re: /\b(tennis)\b/gi, label: 'Tennis', category: 'hobby' },
  { re: /\b(formula 1|formula one|f1|grand prix)\b/gi, label: 'Formula 1', category: 'sports' },
  { re: /\b(premier league|champions league|soccer)\b/gi, label: 'Soccer', category: 'sports' },
  { re: /\b(hockey|nhl)\b/gi, label: 'Hockey', category: 'sports' },
  { re: /\b(baseball|mlb)\b/gi, label: 'Baseball', category: 'sports' },
  { re: /\b(real estate|housing market|zoning|rental propert|duplex|mortgage rate|cap rate)\b/gi, label: 'Real Estate', category: 'market', qualify: /(?:real estate|housing|market|propert\w+|rentals?)\s+(?:in|around|out in)\s+([A-Z][\w]+(?:,?\s[A-Z][\w]+)?)/ },
  { re: /\b(stock market|investing|portfolio|s&p|earnings season|index fund)\b/gi, label: 'Markets & Investing', category: 'market' },
  { re: /\b(crypto|bitcoin|ethereum)\b/gi, label: 'Crypto', category: 'market' },
  { re: /\b(startup|founders?|fundraising|venture capital|seed round)\b/gi, label: 'Startups & Venture', category: 'industry' },
  { re: /\b(artificial intelligence|machine learning|llms?)\b/gi, label: 'AI & Tech', category: 'industry' },
  { re: /\b(fintech|payments)\b/gi, label: 'Fintech', category: 'industry' },
  { re: /\b(marathon|half marathon|10k|5k|long run|race day)\b/gi, label: 'Running', category: 'hobby' },
  { re: /\b(skiing|snowboard|ski trip|powder day)\b/gi, label: 'Skiing', category: 'hobby' },
  { re: /\b(surfing|surf|swell)\b/gi, label: 'Surfing', category: 'hobby', qualify: /(?:surf\w*|swell)\s+(?:at|in|down at)\s+([A-Z][\w]+(?:\s[A-Z][\w]+)?)/ },
  { re: /\b(sailing|regatta|sailboat)\b/gi, label: 'Sailing', category: 'hobby' },
  { re: /\b(fly fishing|fishing)\b/gi, label: 'Fishing', category: 'hobby' },
  { re: /\b(restaurants?|foodie|new spot|tasting menu|chef)\b/gi, label: 'Food & Restaurants', category: 'hobby', qualify: /restaurants?\s+(?:in|scene in)\s+([A-Z][\w]+(?:\s[A-Z][\w]+)?)/ },
  { re: /\b(wine|vineyard|sommelier|napa)\b/gi, label: 'Wine', category: 'hobby' },
  { re: /\b(hiking|camping|national park|trailhead)\b/gi, label: 'Hiking & Outdoors', category: 'hobby' },
  { re: /\b(photography|camera|shooting film)\b/gi, label: 'Photography', category: 'hobby' },
  { re: /\b(concerts?|live music|festival lineup)\b/gi, label: 'Live Music', category: 'hobby' },
  { re: /\b(golden retriever|dog park|puppy|rescue dog)\b/gi, label: 'Dogs', category: 'hobby' },
  { re: /\b(chess)\b/gi, label: 'Chess', category: 'hobby' },
  { re: /\b(poker)\b/gi, label: 'Poker', category: 'hobby' },
]

function sentenceAround(text, index) {
  const start = Math.max(text.lastIndexOf('.', index), text.lastIndexOf('\n', index)) + 1
  let end = text.indexOf('.', index)
  if (end === -1) end = Math.min(text.length, index + 120)
  return text.slice(start, end + 1).trim().slice(0, 160)
}

export function heuristicDiscover(text) {
  const themes = []
  for (const entry of TAXONOMY) {
    const matches = [...text.matchAll(entry.re)]
    if (matches.length === 0) continue
    let label = entry.label
    let qualified = false
    if (entry.qualify) {
      const q = text.match(entry.qualify)
      if (q && q[1]) {
        qualified = true
        label = entry.label === 'Pickleball' || entry.label === 'Real Estate' || entry.label === 'Surfing' || entry.label === 'Food & Restaurants'
          ? `${entry.label} in ${q[1]}`
          : `${q[1]} ${entry.label}`
      }
    }
    // A single mention isn't enough unless it's a strong, qualified signal
    // like "Villanova basketball" (proper noun + domain).
    if (matches.length < 2 && !qualified) continue
    themes.push({
      label,
      category: entry.category,
      confidence: Math.min(92, 40 + matches.length * 14 + (qualified ? 18 : 0)),
      evidence: sentenceAround(text, matches[0].index),
    })
  }
  return themes.sort((a, b) => b.confidence - a.confidence).slice(0, 6)
}

async function claudeDiscover(text, contactName) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system:
        'You analyze a conversation between the user and one of their contacts to find genuinely SHARED interests — topics both people actively engage with, not things only one person mentions. Be specific where the text supports it ("Villanova Basketball", not "Sports"). Respond with JSON only, no prose.',
      messages: [
        {
          role: 'user',
          content: `Conversation between me and ${contactName || 'my contact'}:\n\n${text.slice(0, 12000)}\n\nExtract 2-6 shared themes. Respond with exactly this JSON shape:\n{"themes":[{"label":"...","category":"sports|place|market|hobby|industry","confidence":0-100,"evidence":"short quote from the conversation showing both people engage with this"}]}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!resp.ok) throw new Error(`Claude API ${resp.status}`)
  const data = await resp.json()
  const raw = data.content?.[0]?.text || '{}'
  const jsonStart = raw.indexOf('{')
  const jsonEnd = raw.lastIndexOf('}')
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
  const valid = ['sports', 'place', 'market', 'hobby', 'industry']
  return (parsed.themes || [])
    .filter(t => t.label)
    .map(t => ({
      label: String(t.label).slice(0, 60),
      category: valid.includes(t.category) ? t.category : 'hobby',
      confidence: Math.max(0, Math.min(100, Number(t.confidence) || 60)),
      evidence: String(t.evidence || '').slice(0, 200),
    }))
    .slice(0, 6)
}

export async function handleDiscoverRequest({ text, contactName }) {
  if (!text || text.trim().length < 40) {
    return { status: 400, body: { error: 'Paste at least a few sentences of conversation.' } }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const themes = await claudeDiscover(text, contactName)
      return { status: 200, body: { engine: 'claude', themes } }
    } catch {
      // fall through to heuristic so the feature never hard-fails
    }
  }
  return { status: 200, body: { engine: 'heuristic', themes: heuristicDiscover(text) } }
}
