// Draft regeneration — "try another angle" on a reason's drafted message.
// The first draft comes from the scorer; this endpoint rewrites it in a
// different register so the person can find the version that sounds like
// them. Same two-engine shape as the other handlers:
//  - "claude"    — used when ANTHROPIC_API_KEY is set.
//  - "heuristic" — keyless fallback: honest template variants, never a 500.

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

// The rotation the client walks through. Each angle is a complete voice
// direction, not just an adjective — Claude needs the texture.
export const ANGLES = {
  warmer: 'Warmer and more personal — lead with the relationship, not the news. It should feel like they crossed your mind first and the headline second.',
  shorter: 'Half the length. One punchy line, maybe two. The kind of text you send with one thumb while walking.',
  curious: "More curious — end on a genuine question that's easy to answer. Pull their take out of them instead of delivering yours.",
}

function heuristicRedraft({ contactName, headline, themeLabel, kind, angle }) {
  const first = (contactName || 'Hey').split(' ')[0]
  const h = headline ? `"${headline}"` : (themeLabel ? `the ${themeLabel} news` : 'this')
  if (kind === 'drift') {
    if (angle === 'shorter') return `${first} — been a minute. How are you?`
    if (angle === 'curious') return `${first} — it's been too long. What's the latest with you these days?`
    return `${first} — you crossed my mind today and I realized it's been a while. How've you been?`
  }
  if (angle === 'shorter') return `${first} — saw ${h}. Thought of you.`
  if (angle === 'curious') return `${first} — did you catch ${h}? Curious what you make of it.`
  return `${first} — ${h} came up and you were the first person I thought of. Hope things are good on your end.`
}

async function claudeRedraft({ contactName, headline, themeLabel, kind, current, angle }) {
  const direction = ANGLES[angle] || ANGLES.warmer
  const context = kind === 'drift'
    ? `This is a no-news check-in: it has been a while since the user talked to ${contactName}.`
    : `The reason for reaching out: the news headline "${headline}"${themeLabel ? ` on ${themeLabel}, a theme the user shares with ${contactName}` : ''}.`
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      system:
        'You rewrite short person-to-person messages. The user is texting or emailing one of their own contacts — a real relationship, not a lead. Keep it 1-3 sentences, conversational, specific, and free of greetings-card filler. No emojis unless the current draft has them, no sign-offs, no subject lines, no quotation marks around the whole message. Respond with JSON only: {"message":"..."}',
      messages: [
        {
          role: 'user',
          content: `${context}\n\nCurrent draft:\n${current}\n\nRewrite it. Direction: ${direction}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) throw new Error(`Claude API ${resp.status}`)
  const data = await resp.json()
  const raw = data.content?.[0]?.text || '{}'
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
  const message = String(parsed.message || '').trim()
  if (!message || message.length > 600) throw new Error('bad redraft shape')
  return message
}

export async function handleRedraftRequest({ contactName, headline, themeLabel, kind, current, angle }) {
  if (!current || !String(current).trim()) {
    return { status: 400, body: { error: 'Nothing to redraft.' } }
  }
  const input = {
    contactName: String(contactName || '').slice(0, 80),
    headline: String(headline || '').slice(0, 300),
    themeLabel: String(themeLabel || '').slice(0, 80),
    kind: ['news', 'favor', 'drift'].includes(kind) ? kind : 'news',
    current: String(current).slice(0, 1000),
    angle: Object.prototype.hasOwnProperty.call(ANGLES, angle) ? angle : 'warmer',
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const message = await claudeRedraft(input)
      return { status: 200, body: { engine: 'claude', message } }
    } catch (err) {
      console.error('redraft: claude engine failed, using heuristic:', err?.message || err)
    }
  }
  return { status: 200, body: { engine: 'heuristic', message: heuristicRedraft(input) } }
}
