// Theme refinement — one shared call so a theme added from the quiz, the
// profile or the themes manager gets the same precise news query. Never
// throws: a failed, rate-limited or keyword-only refine resolves to null and
// the theme keeps watching its raw label until `refineMissingThemes` gets it
// a real one later.
import { apiUrl } from '../lib/apiBase'

export async function refineTheme(label, contact) {
  try {
    const resp = await fetch(apiUrl('/api/refine-theme'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        label,
        contactName: contact?.name,
        contactCompany: contact?.company,
        contactRole: contact?.role,
      }),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    // A keyword fallback is not a refinement; don't store it as one.
    if (!data?.query || (data.engine && data.engine !== 'claude')) return null
    return {
      display: data.display || null,
      refinement: { query: data.query, entityType: data.entityType, watchFor: data.watchFor, display: data.display || null },
    }
  } catch {
    return null
  }
}

// Themes saved without a query (the service was down, or they predate
// refinement) get one quietly, a few per session so a big crew doesn't burst
// the rate limit.
let refinePassDone = false
export async function refineMissingThemes(contacts, themesByContact, updateTheme, { max = 8 } = {}) {
  if (refinePassDone) return
  refinePassDone = true
  const todo = []
  for (const c of contacts) {
    for (const t of themesByContact[c.id] || []) {
      if (!t.query) todo.push({ contact: c, theme: t })
    }
  }
  for (const { contact, theme } of todo.slice(0, max)) {
    const r = await refineTheme(theme.label, contact)
    if (r) updateTheme(contact.id, theme.id, r.refinement)
  }
}
