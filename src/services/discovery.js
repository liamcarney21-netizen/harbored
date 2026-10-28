// Client for /api/discover — Common Ground discovery from pasted conversation.

import { apiUrl } from '../lib/apiBase'

// "Tell Harbored about them" (build 13): a description of the relationship,
// mapped by /api/discover into { relation, relationNote, closeness, company,
// themes: [{ label, category, said }], goodToKnow, skipped }. Throws with a
// message the screen can show.
export async function mapRelationship(text, contact) {
  const resp = await fetch(apiUrl('/api/discover'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'relationship', text, contactName: contact?.name, contactCompany: contact?.company, contactRole: contact?.role }),
  })
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(body.error || "Couldn't map that just now.")
  return body
}

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
