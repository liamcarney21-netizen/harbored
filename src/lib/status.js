import { healthFromLastTouch, daysUntilBirthday } from '../store/dataStore'
import { isPausedTheme } from './themeChoices'
import { driftDaysFor, quietDaysFor } from './relations'

// Plain-language status — one line, gold only when it needs attention.
export function statusFor(contact) {
  const bdays = daysUntilBirthday(contact.birthday)
  if (bdays === 0) return { text: 'Birthday today', hot: true }
  if (bdays === 1) return { text: 'Birthday tomorrow', hot: true }
  if (!contact.lastTouch) return { text: 'No messages yet', hot: false }
  const health = healthFromLastTouch(contact.lastTouch)
  if (health.days >= driftDaysFor(contact)) return { text: `Drifting · ${health.days} days quiet`, hot: true }
  if (health.days >= quietDaysFor(contact)) return { text: `Quiet · ${health.days} days`, hot: false }
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

// What a theme actually watches, in plain words. A bare category ("Health and
// wellness") says so: it isn't watched, and the narrower subjects offered for
// it are the way out. A theme with every choice turned off is paused. A topic
// narrow enough to name is watched like anything else (before build 12 every
// topic was flagged as too broad).
export function themeWatch(t) {
  if (!t) return { text: '', broad: false, refining: false }
  if (themeRefining(t)) return { text: '', broad: false, refining: true }
  if (t.bare) {
    const text = t.narrower?.length ? 'Too broad to watch. Pick one to watch instead:' : 'Too broad to watch. Name something more specific instead.'
    return { text, broad: true, refining: false }
  }
  if (isPausedTheme(t)) return { text: 'Not watching anything here.', broad: false, refining: false, paused: true }
  const refined = !!t.query && !isFallbackRefinement(t)
  if (refined && t.display) return { text: t.display, broad: false, refining: false }
  return { text: `Watching the news for ${t.label}.`, broad: false, refining: false }
}
