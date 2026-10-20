// Theme refinement — one shared call so a theme added from the quiz and a
// theme added on a contact's profile get the same precise news query. Never
// throws: a failed or rate-limited refine resolves to null and the theme
// keeps watching its raw label.
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
    if (!data?.query) return null
    return {
      display: data.display || null,
      refinement: { query: data.query, entityType: data.entityType, watchFor: data.watchFor },
    }
  } catch {
    return null
  }
}
