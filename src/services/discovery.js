// Client for /api/discover — Common Ground discovery from pasted conversation.

import { apiUrl } from '../lib/apiBase'

export async function discoverThemes(text, contactName) {
  const resp = await fetch(apiUrl('/api/discover'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, contactName }),
  })
  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Discovery failed')
  return body // { engine: 'claude' | 'heuristic', themes: [{ label, category, confidence, evidence }] }
}
