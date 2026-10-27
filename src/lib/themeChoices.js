// A theme's "What would you text them about?" choices (build 12), and the
// headlines the person marked "It's not about {theme}". Stored on the theme as
//   textAbout  [{ label, on }]: what Harbored proposed, with the person's checks
//   notAbout   [{ headline, at }]: kept as examples of what doesn't count
// The checked labels are the scorer's definition of what counts for the theme.
// Pure, shared by the client and the server like birthday.js; the snapshot is
// user-writable, so everything read from it goes through these clamps.

export const CHOICES_MAX = 6
export const CHOICE_LABEL_MAX = 40
export const NOT_ABOUT_MAX = 5
export const NOT_ABOUT_DAYS = 60
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

// Every choice turned off: the person isn't watching anything on this theme,
// so the scan skips it. A theme with no choices (older themes) is never paused.
export function isPausedTheme(theme) {
  const list = theme?.textAbout
  return Array.isArray(list) && list.some(c => cleanChoiceLabel(c?.label)) && checkedChoices(list).length === 0
}

// The newest NOT_ABOUT_MAX "not about" headlines from the last NOT_ABOUT_DAYS.
// Undated entries are dropped: they can't age out.
export function recentNotAbout(list, nowMs = Date.now()) {
  if (!Array.isArray(list)) return []
  const cutoff = nowMs - NOT_ABOUT_DAYS * DAY
  return list
    .map(e => ({ headline: typeof e?.headline === 'string' ? e.headline.replace(/\s+/g, ' ').trim().slice(0, 200) : '', t: Date.parse(e?.at) }))
    .filter(e => e.headline && Number.isFinite(e.t) && e.t >= cutoff && e.t <= nowMs + DAY)
    .sort((a, b) => b.t - a.t)
    .slice(0, NOT_ABOUT_MAX)
    .map(e => e.headline)
}
