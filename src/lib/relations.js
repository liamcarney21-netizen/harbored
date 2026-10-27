// How the person knows someone (build 12's "How do you know Colin?"), stored on
// the contact as `relation`. It sets the tone of drafts and which of a theme's
// choices start checked. It never changes whether a story counts or how strong
// it is. Pure, shared by the client and the server like birthday.js.
export const RELATIONS = [
  { id: 'family', label: 'Family' },
  { id: 'friend', label: 'Friend' },
  { id: 'teammate', label: 'Teammate' },
  { id: 'classmate', label: 'Classmate' },
  { id: 'coworker', label: 'Coworker' },
  { id: 'work', label: 'Work contact' },
]

const BY_ID = new Map(RELATIONS.map(r => [r.id, r]))

// A known relation id, or undefined. The snapshot and request bodies are
// user-writable, so anything else is dropped.
export function cleanRelation(v) {
  return typeof v === 'string' && BY_ID.has(v) ? v : undefined
}

// "Work contact" for 'work'; undefined for anything unknown.
export function relationLabel(v) {
  return BY_ID.get(cleanRelation(v))?.label
}
