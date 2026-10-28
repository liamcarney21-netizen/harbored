// The account snapshot: its shape, the repairs that data from older builds
// needs, and the three-way merge the sync runs when two copies disagree. Pure
// functions with no browser or Supabase dependency, so tests and one-off
// maintenance scripts can import them directly. dataStore.js owns the sync.

import { cleanRelation, cleanRelationNote, cleanCloseness } from '../lib/relations'
import { cleanChoices, cleanNarrower, cleanBar, cleanNotAbout } from '../lib/themeChoices'

export const DEFAULT_PREFS = { push: true, digest: true }
export const SNAPSHOT_KEYS = ['contacts', 'themesByContact', 'touches', 'meetings', 'prefs', 'reasonState']

export function emptySnapshot() {
  return { contacts: [], themesByContact: {}, touches: [], meetings: [], prefs: { ...DEFAULT_PREFS }, reasonState: {} }
}

export function initialsOf(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

// Theme ids must be unique within a person: updateTheme, removeTheme and the
// merge all find a theme by its id. Quiz builds from July gave every theme from
// one answer the same Date.now() id, so a refinement meant for one of them
// overwrote all of them. Earlier copies get a suffix in list order (id~2,
// id~3), which every device derives the same way. The last copy keeps the
// original id because the merge in builds before this fix lets the last local
// copy win that id; the earlier copies then survive under their new ids.
// Copies that ended up with one search under different labels lose it: it
// belongs to at most one of them, and the refine pass redoes each from its own
// label once its id is its own.
function withUniqueIds(list) {
  const groups = new Map()
  list.forEach((t, i) => groups.set(String(t.id), [...(groups.get(String(t.id)) || []), i]))
  const taken = new Set(groups.keys())
  const out = [...list]
  for (const [id, idx] of groups) {
    if (idx.length < 2) continue
    const bled = new Set(idx.filter(i => list[i].query && idx.some(j => list[j].query === list[i].query && list[j].label !== list[i].label)))
    let n = 2
    idx.forEach((i, k) => {
      let t = list[i]
      if (bled.has(i)) t = { ...t, query: null, entityType: null, watchFor: null, display: null }
      if (k < idx.length - 1) {
        while (taken.has(`${id}~${n}`)) n++
        taken.add(`${id}~${n}`)
        t = { ...t, id: `${id}~${n}` }
      }
      out[i] = t
    })
  }
  return out
}

// Build 12's theme fields, validated like the rest (see lib/themeChoices.js):
// a malformed one is dropped, never trusted, and old "not about" headlines
// age out.
const THEME_FIELDS = ['textAbout', 'textAboutConfirmed', 'bare', 'narrower', 'bar', 'favors', 'notAbout']

function cleanTheme(t, nowMs) {
  if (!THEME_FIELDS.some(k => k in t)) return t
  const out = { ...t }
  for (const k of THEME_FIELDS) delete out[k]
  const textAbout = cleanChoices(t.textAbout)
  if (textAbout) out.textAbout = textAbout
  if (textAbout && t.textAboutConfirmed === true) out.textAboutConfirmed = true
  if (t.bare === true) out.bare = true
  const narrower = t.bare === true ? cleanNarrower(t.narrower) : undefined
  if (narrower) out.narrower = narrower
  const bar = cleanBar(t.bar)
  if (bar) out.bar = bar
  if (t.favors === false) out.favors = false
  const notAbout = cleanNotAbout(t.notAbout, nowMs)
  if (notAbout) out.notAbout = notAbout
  return out
}

function normalize(raw, nowMs = Date.now()) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const contacts = (Array.isArray(s.contacts) ? s.contacts : [])
    .filter(c => c && typeof c.name === 'string' && c.name.trim() && c.id != null)
    .map(({ relation, relationNote, closeness, ...c }) => ({
      ...c,
      ...(cleanRelation(relation) ? { relation } : {}),
      ...(cleanRelationNote(relationNote) ? { relationNote: cleanRelationNote(relationNote) } : {}),
      ...(cleanCloseness(closeness) ? { closeness } : {}),
      name: c.name.trim(),
      initials: c.initials || initialsOf(c.name),
      email: typeof c.email === 'string' ? c.email : '',
      phone: typeof c.phone === 'string' ? c.phone : '',
      role: typeof c.role === 'string' ? c.role : '',
      company: typeof c.company === 'string' ? c.company : '',
      birthday: typeof c.birthday === 'string' ? c.birthday : '',
      notes: typeof c.notes === 'string' ? c.notes : '',
      lastTouch: c.lastTouch || null,
    }))
  const themesByContact = {}
  let renamed = false
  if (s.themesByContact && typeof s.themesByContact === 'object') {
    for (const [cid, list] of Object.entries(s.themesByContact)) {
      if (!Array.isArray(list)) continue
      const valid = list.filter(t => t && typeof t.label === 'string' && t.id != null).map(t => cleanTheme(t, nowMs))
      const unique = withUniqueIds(valid)
      if (unique.some((t, i) => t !== valid[i])) renamed = true
      themesByContact[cid] = unique
    }
  }
  const snap = {
    contacts,
    themesByContact,
    touches: (Array.isArray(s.touches) ? s.touches : []).filter(t => t && t.id != null && t.date),
    meetings: Array.isArray(s.meetings) ? s.meetings : [],
    prefs: { ...DEFAULT_PREFS, ...(s.prefs && typeof s.prefs === 'object' ? s.prefs : {}) },
    reasonState: s.reasonState && typeof s.reasonState === 'object' ? s.reasonState : {},
  }
  return { snap, renamed }
}

// Whatever comes back from the server or the local cache is treated as
// untrusted: one malformed record used to be enough to blank the whole app.
export function normalizeSnapshot(raw) {
  return normalize(raw).snap
}

// example.com is reserved: no real person has an address there.
const MADE_UP_EMAIL = /@example\.com$/i

// Fixes for data that older builds wrote. Runs on every load and does nothing
// once applied; `changed` says whether the result needs saving.
// - Theme ids repeated within a person (see withUniqueIds).
// - Sample people (seed: true) belong in demo mode and the App Review account
//   only. July builds put them in every new account, where they showed up as
//   friends drifting away, with 555 numbers.
// - July builds filled a missing email with name@example.com, which the app
//   then offered as a real address.
export function repairSnapshot(raw, { keepSamples = false } = {}) {
  const { snap, renamed } = normalize(raw)
  let { contacts, themesByContact, touches, meetings } = snap
  let changed = renamed

  if (!keepSamples && contacts.some(c => c.seed)) {
    // A sample's themes and touches go with it, unless a real person shares its id.
    const realIds = new Set(contacts.filter(c => !c.seed).map(c => String(c.id)))
    const samples = new Set(contacts.filter(c => c.seed && !realIds.has(String(c.id))).map(c => String(c.id)))
    contacts = contacts.filter(c => !c.seed)
    themesByContact = Object.fromEntries(Object.entries(themesByContact).filter(([cid]) => !samples.has(cid)))
    touches = touches.filter(t => !samples.has(String(t.contactId)))
    meetings = meetings.filter(m => !samples.has(String(m?.contactId)))
    changed = true
  }

  contacts = contacts.map(c => {
    if (c.seed || !MADE_UP_EMAIL.test(c.email)) return c
    changed = true
    return { ...c, email: '' }
  })

  return { snap: { ...snap, contacts, themesByContact, touches, meetings }, changed }
}

// ── Three-way merge ─────────────────────────────────────────────────────────
// `base` is the copy this device and the server last agreed on. A change is
// whatever differs from base, so a removal on one side is a removal, not a
// record the other side "still has". Without a base every record looks new
// and the merge falls back to a union in which this device wins.

// Postgres jsonb reorders object keys, so two equal records can serialize
// differently; compare a canonical form.
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  }
  return v === undefined ? 'null' : JSON.stringify(v)
}
const same = (a, b) => a === b || canon(a) === canon(b)

// Field by field: a field this device changed since base keeps this device's
// value; every other field takes the server's.
function mergeFields(base = {}, server = {}, local = {}) {
  const out = {}
  for (const k of new Set([...Object.keys(server), ...Object.keys(local)])) {
    const v = same(local[k], base[k]) ? server[k] : local[k]
    if (v !== undefined) out[k] = v
  }
  return out
}

// Records with ids, in the server's order with this device's additions after.
// Additions on either side are kept. A removal on one side wins unless the
// other side edited that record since base: an edit is never thrown away
// silently.
function mergeList(base, server, local) {
  const byId = list => new Map(list.map(x => [String(x?.id), x]))
  const B = byId(base), S = byId(server), L = byId(local)
  const pick = (id) => {
    const b = B.get(id), s = S.get(id), l = L.get(id)
    if (l && s) {
      if (same(l, s)) return s
      if (!b) return l
      if (same(l, b)) return s
      if (same(s, b)) return l
      return mergeFields(b, s, l)
    }
    if (l) return !b || !same(l, b) ? l : null
    if (s) return !b || !same(s, b) ? s : null
    return null
  }
  const out = []
  for (const id of S.keys()) { const r = pick(id); if (r) out.push(r) }
  for (const id of L.keys()) if (!S.has(id)) { const r = pick(id); if (r) out.push(r) }
  return out
}

const NO_BASE = { contacts: [], themesByContact: {}, touches: [], meetings: [], prefs: {}, reasonState: {} }

export function mergeSnapshots(base, server, local) {
  const b = base ? normalizeSnapshot(base) : NO_BASE
  const s = normalizeSnapshot(server)
  const l = normalizeSnapshot(local)

  const contacts = mergeList(b.contacts, s.contacts, l.contacts)
  const inServer = new Set(s.contacts.map(c => String(c.id)))
  const inLocal = new Set(l.contacts.map(c => String(c.id)))

  // A person both sides still have merges their themes; a person only one
  // side has brings that side's themes along.
  const themesByContact = {}
  for (const c of contacts) {
    const id = String(c.id)
    const list = inServer.has(id) && inLocal.has(id)
      ? mergeList(b.themesByContact[id] || [], s.themesByContact[id] || [], l.themesByContact[id] || [])
      : (inLocal.has(id) ? l.themesByContact[id] : s.themesByContact[id]) || []
    if (list.length || id in s.themesByContact || id in l.themesByContact) themesByContact[id] = list
  }

  const alive = new Set(contacts.map(c => String(c.id)))
  const touches = mergeList(b.touches, s.touches, l.touches).filter(t => alive.has(String(t.contactId)))
  const meetings = mergeList(b.meetings, s.meetings, l.meetings)

  // lastTouch is derived from touches on both sides; keep the latest.
  const latestTouch = {}
  for (const t of touches) {
    const k = String(t.contactId)
    if (!latestTouch[k] || t.date > latestTouch[k]) latestTouch[k] = t.date
  }
  const mergedContacts = contacts.map(c => {
    const lt = latestTouch[String(c.id)]
    return lt && (!c.lastTouch || lt > c.lastTouch) ? { ...c, lastTouch: lt } : c
  })

  return {
    contacts: mergedContacts,
    themesByContact,
    touches: touches.sort((a, c) => (a.date < c.date ? 1 : -1)),
    meetings,
    prefs: { ...DEFAULT_PREFS, ...mergeFields(b.prefs, s.prefs, l.prefs) },
    reasonState: mergeFields(b.reasonState, s.reasonState, l.reasonState),
  }
}
