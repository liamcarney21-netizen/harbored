// How the person knows someone, stored on the contact:
//   relation      one of RELATIONS (build 12's "How do you know Colin?")
//   relationNote  where or how, in a few words ("at High Point"; build 13)
//   closeness     one of CLOSENESS (build 13)
// Relation sets the tone of drafts and which of a theme's choices start
// checked; closeness sets when a quiet stretch becomes a drift card. Neither
// ever changes whether a story counts or how strong it is. Pure, shared by
// the client and the server like birthday.js.
export const RELATIONS = [
  { id: 'family', label: 'Family' },
  { id: 'friend', label: 'Friend' },
  { id: 'teammate', label: 'Teammate' },
  { id: 'classmate', label: 'Classmate' },
  { id: 'coworker', label: 'Coworker' },
  { id: 'work', label: 'Work contact' },
]

// driftDays: no message for this long and a drift card offers a check-in
// (45 was everyone's before build 13). quietDays: when the profile says
// "Quiet".
export const CLOSENESS = [
  { id: 'close', label: 'Close', driftDays: 30, quietDays: 14 },
  { id: 'regular', label: 'Now and then', driftDays: 45, quietDays: 21 },
  { id: 'loose', label: 'Loosely', driftDays: 90, quietDays: 45 },
]
export const RELATION_NOTE_MAX = 40

const BY_ID = new Map(RELATIONS.map(r => [r.id, r]))
const BY_LABEL = new Map(RELATIONS.map(r => [r.label.toLowerCase(), r]))
const CLOSENESS_BY_ID = new Map(CLOSENESS.map(c => [c.id, c]))

// A known relation id, or undefined. The snapshot and request bodies are
// user-writable, so anything else is dropped.
export function cleanRelation(v) {
  return typeof v === 'string' && BY_ID.has(v) ? v : undefined
}

// A relation id from a model's answer, which may give the label instead
// ("Work contact").
export function parseRelation(v) {
  if (typeof v !== 'string') return undefined
  const s = v.trim().toLowerCase()
  return cleanRelation(s) || BY_LABEL.get(s)?.id
}

// "Work contact" for 'work'; undefined for anything unknown.
export function relationLabel(v) {
  return BY_ID.get(cleanRelation(v))?.label
}

// One line of at most RELATION_NOTE_MAX characters, or undefined (a cut-off
// note would read wrong, so a longer one is dropped).
export function cleanRelationNote(v) {
  if (typeof v !== 'string') return undefined
  const s = v.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim()
  return s && s.length <= RELATION_NOTE_MAX ? s : undefined
}

export function cleanCloseness(v) {
  return typeof v === 'string' && CLOSENESS_BY_ID.has(v) ? v : undefined
}

export function closenessLabel(v) {
  return CLOSENESS_BY_ID.get(cleanCloseness(v))?.label
}

// The days without a message before a contact counts as drifting, and as
// quiet, by how close you are (unset is "now and then").
export function driftDaysFor(contact) {
  return CLOSENESS_BY_ID.get(cleanCloseness(contact?.closeness) || 'regular').driftDays
}
export function quietDaysFor(contact) {
  return CLOSENESS_BY_ID.get(cleanCloseness(contact?.closeness) || 'regular').quietDays
}

// The relationship in one line: "Teammate at High Point · Close". A note that
// reads as a place or origin ("at High Point", "from Deloitte") follows the
// relation; anything else gets its own segment.
export function relationshipLine(contact) {
  const label = relationLabel(contact?.relation)
  const note = cleanRelationNote(contact?.relationNote)
  const close = closenessLabel(contact?.closeness)
  const who = label && note && /^(?:at|from|in|through|via|since|on|of)\b/i.test(note) ? `${label} ${note}` : [label, note].filter(Boolean).join(' · ')
  return [who, close].filter(Boolean).join(' · ')
}
