// Client for /api/discover — Common Ground discovery from pasted conversation.

import { apiUrl } from '../lib/apiBase'

// mode: 'conversation' (pasted two-way text, the default) or 'description'
// (one-sided spoken/typed description of the contact — the voice quiz).
export async function discoverThemes(text, contactName, mode = 'conversation') {
  const resp = await fetch(apiUrl('/api/discover'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, contactName, mode }),
  })
  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Discovery failed')
  return body // { engine: 'claude' | 'heuristic', themes: [{ label, category, confidence, evidence }] }
}
