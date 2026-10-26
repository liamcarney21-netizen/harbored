import { healthFromLastTouch, daysUntilBirthday } from '../store/dataStore'

// Plain-language status — one line, gold only when it needs attention.
export function statusFor(contact) {
  const bdays = daysUntilBirthday(contact.birthday)
  if (bdays === 0) return { text: 'Birthday today', hot: true }
  if (bdays === 1) return { text: 'Birthday tomorrow', hot: true }
  if (!contact.lastTouch) return { text: 'No messages yet', hot: false }
  const health = healthFromLastTouch(contact.lastTouch)
  if (health.days >= 45) return { text: `Drifting · ${health.days} days quiet`, hot: true }
  if (health.days >= 21) return { text: `Quiet · ${health.days} days`, hot: false }
  return { text: `In touch · ${health.days === 0 ? 'today' : `${health.days}d ago`}`, hot: false }
}


// True while a just-added theme is still being refined (a minute at most);
// older themes without a query are simply watched by their label.
export function themeRefining(t) {
  if (!t || t.query) return false
  if (!t.createdAt) return false
  return Date.now() - new Date(t.createdAt).getTime() < 60_000
}

// Builds before 1.0.1 saved the keyword fallback as if it were a refinement
// (the label in quotes, watching "significant news", entityType topic). It
// isn't one: the refine pass redoes these, and they aren't flagged as broad.
export function isFallbackRefinement(t) {
  return !!t?.query && Array.isArray(t.watchFor) && t.watchFor.length === 1 && t.watchFor[0] === 'significant news'
}

// What a theme actually watches, in plain words. A theme that resolved to a
// broad topic says so, with the fix: it can only ever show on Today, never
// push, and mostly finds noise.
export function themeWatch(t) {
  if (!t) return { text: '', broad: false, refining: false }
  if (themeRefining(t)) return { text: '', broad: false, refining: true }
  const refined = !!t.query && !isFallbackRefinement(t)
  if (refined && t.entityType === 'topic') {
    return { text: 'Too broad to watch well. Name the specific company, team or place instead.', broad: true, refining: false }
  }
  if (refined && t.display) return { text: t.display, broad: false, refining: false }
  return { text: `Watching the news for ${t.label}.`, broad: false, refining: false }
}
