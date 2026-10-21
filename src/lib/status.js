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
