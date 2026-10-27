// A theme's "What would you text them about?" choices (build 12), and what
// the person told Harbored from a card. Stored on the theme as
//   textAbout           [{ label, on }]: what Harbored proposed, with the checks
//   textAboutConfirmed  true once the person saved, toggled or chose them
//   bare, narrower      a bare category, and the narrower subjects offered for it
//   bar                 raised by "Too small to text about" (71-85; absent = 70)
//   favors              false after "Not worth passing along"
//   notAbout            [{ headline, at }]: "It's not about {theme}" examples
// The checked labels are the scorer's definition of what counts for the theme.
// Pure, shared by the client and the server like birthday.js; the snapshot is
// user-writable, so everything read from it goes through these clamps.

export const CHOICES_MAX = 6
export const CHOICE_LABEL_MAX = 40
export const NARROWER_MAX = 4
export const NOT_ABOUT_MAX = 5
export const NOT_ABOUT_DAYS = 60
// The bar a theme's stories must clear to become reasons. "Too small to text
// about" raises it a step at a time, up to MAX_THEME_BAR; the server holds a
// theme's stories under it and asks 10 more to push.
export const BASE_BAR = 70
export const BAR_STEP = 5
export const MAX_THEME_BAR = 85
const DAY = 86400000

// One line, no control characters, at most CHOICE_LABEL_MAX characters ('' if
// longer: a cut-off label would read as a different choice).
export function cleanChoiceLabel(v) {
  if (typeof v !== 'string') return ''
  const s = v.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim()
  return s.length <= CHOICE_LABEL_MAX ? s : ''
}

// What makes two labels the same choice: case, spacing, punctuation and "&"
// versus "and" don't count ("Wildfires & storms" = "wildfires and storms").
export function choiceKey(label) {
  return String(label || '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, '')
}

// The checked labels, cleaned and without duplicates. A stored choice counts
// only when `on` is true; a plain string counts as checked (the scorer's own
// item format, which carries checked labels only).
export function checkedChoices(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const entry of list) {
    const label = cleanChoiceLabel(typeof entry === 'string' ? entry : (entry?.on === true ? entry.label : ''))
    const key = choiceKey(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length === CHOICES_MAX) break
  }
  return out
}

// The labels offered but left unchecked (none that duplicate a checked one).
// The scorer is shown them as kinds that don't count, so it picks a story's
// kind from every choice instead of stretching a checked one to fit.
export function uncheckedChoices(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set(checkedChoices(list).map(choiceKey))
  const out = []
  for (const entry of list) {
    const label = entry && typeof entry === 'object' && entry.on !== true ? cleanChoiceLabel(entry.label) : ''
    const key = choiceKey(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length === CHOICES_MAX) break
  }
  return out
}

// The stored choices, cleaned: real labels, once each, at most CHOICES_MAX,
// `on` only when true. Undefined when nothing usable is left.
export function cleanChoices(list) {
  if (!Array.isArray(list)) return undefined
  const seen = new Set()
  const out = []
  for (const entry of list) {
    const label = cleanChoiceLabel(entry?.label)
    const key = choiceKey(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ label, on: entry.on === true })
    if (out.length === CHOICES_MAX) break
  }
  return out.length ? out : undefined
}

// Narrower subjects offered for a bare category: plain labels, once each.
export function cleanNarrower(list) {
  if (!Array.isArray(list)) return undefined
  const seen = new Set()
  const out = []
  for (const entry of list) {
    const label = cleanChoiceLabel(entry)
    const key = choiceKey(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length === NARROWER_MAX) break
  }
  return out.length ? out : undefined
}

// A theme's stored bar, clamped to BASE_BAR..MAX_THEME_BAR; undefined when
// it's the default (or not a number), so it never needs storing.
export function cleanBar(v) {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  const bar = Math.max(BASE_BAR, Math.min(MAX_THEME_BAR, Math.round(n)))
  return bar > BASE_BAR ? bar : undefined
}

// The bar after one more "Too small to text about".
export function raisedBar(theme) {
  return Math.min(MAX_THEME_BAR, (cleanBar(theme?.bar) ?? BASE_BAR) + BAR_STEP)
}

// Every choice turned off: the person isn't watching anything on this theme,
// so the scan skips it. A theme with no choices (older themes) is never paused.
export function isPausedTheme(theme) {
  const list = theme?.textAbout
  return Array.isArray(list) && list.some(c => cleanChoiceLabel(c?.label)) && checkedChoices(list).length === 0
}

// The stored "not about" headlines worth keeping: the newest NOT_ABOUT_MAX
// from the last NOT_ABOUT_DAYS. Undated entries are dropped: they can't age
// out. Undefined when none are left.
export function cleanNotAbout(list, nowMs = Date.now()) {
  if (!Array.isArray(list)) return undefined
  const cutoff = nowMs - NOT_ABOUT_DAYS * DAY
  const out = list
    .map(e => ({ headline: typeof e?.headline === 'string' ? e.headline.replace(/\s+/g, ' ').trim().slice(0, 200) : '', t: Date.parse(e?.at) }))
    .filter(e => e.headline && Number.isFinite(e.t) && e.t >= cutoff && e.t <= nowMs + DAY)
    .sort((a, b) => b.t - a.t)
    .slice(0, NOT_ABOUT_MAX)
    .map(e => ({ headline: e.headline, at: new Date(e.t).toISOString() }))
  return out.length ? out : undefined
}

// Just the headlines, for the scorer.
export function recentNotAbout(list, nowMs = Date.now()) {
  return (cleanNotAbout(list, nowMs) || []).map(e => e.headline)
}
