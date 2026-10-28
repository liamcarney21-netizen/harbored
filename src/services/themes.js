// Theme refinement — one shared call so a theme added from the quiz, the
// profile or the themes manager gets the same precise news query, and the
// same "What would you text them about?" choices. Never throws: a failed,
// rate-limited or keyword-only refine resolves to null and the theme keeps
// watching its raw label until `refineMissingThemes` gets it a real one later.
import { apiUrl } from '../lib/apiBase'
import { isFallbackRefinement } from '../lib/status'

// `said`: what the person said about it while describing them ("we text
// during playoff games"), which decides the choices that start checked.
export async function refineTheme(label, contact, { said } = {}) {
  try {
    const resp = await fetch(apiUrl('/api/refine-theme'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        label,
        contactName: contact?.name,
        contactCompany: contact?.company,
        contactRole: contact?.role,
        relation: contact?.relation,
        ...(said ? { said } : {}),
      }),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    // A keyword fallback is not a refinement; don't store it as one.
    if (!data?.query || (data.engine && data.engine !== 'claude')) return null
    return {
      display: data.display || null,
      refinement: {
        query: data.query,
        entityType: data.entityType,
        watchFor: data.watchFor,
        display: data.display || null,
        ...(Array.isArray(data.textAbout) ? { textAbout: data.textAbout } : {}),
        ...(data.bare ? { bare: true, narrower: Array.isArray(data.narrower) ? data.narrower : [] } : {}),
      },
    }
  } catch {
    return null
  }
}

// Themes saved without a real refinement (the service was down, they predate
// refinement, or an old build stored the keyword fallback as one) get one
// quietly, a few per session so a big crew doesn't burst the rate limit.
// After those, themes refined before build 12 get their choices the same way.
// They keep their search, except a place, which takes the whole new
// refinement: older places were searched and described as business news.
// A choice the person already confirmed is never replaced. Sample people are
// skipped: they're never scanned.
let refinePassDone = false
export async function refineMissingThemes(contacts, themesByContact, updateTheme, { max = 8 } = {}) {
  if (refinePassDone) return
  refinePassDone = true
  const unrefined = []
  const noChoices = []
  for (const c of contacts) {
    if (c.seed) continue
    for (const t of themesByContact[c.id] || []) {
      if (!t.query || isFallbackRefinement(t)) unrefined.push({ contact: c, theme: t })
      else if (!t.textAbout && !t.bare && !t.textAboutConfirmed) noChoices.push({ contact: c, theme: t })
    }
  }
  for (const { contact, theme } of [...unrefined, ...noChoices].slice(0, max)) {
    const r = await refineTheme(theme.label, contact)
    if (!r) continue
    const whole = !theme.query || isFallbackRefinement(theme) || theme.entityType === 'place'
    if (whole) { updateTheme(contact.id, theme.id, r.refinement); continue }
    const { textAbout, bare, narrower } = r.refinement
    // Only a topic can turn out to be a bare category.
    if (theme.entityType === 'topic' && bare) updateTheme(contact.id, theme.id, { bare, narrower })
    else if (textAbout) updateTheme(contact.id, theme.id, { textAbout })
  }
}
