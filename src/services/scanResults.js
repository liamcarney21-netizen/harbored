// Reads the stored output of the scheduled server-side scan (scan_results table,
// written by /api/scan) for the signed-in user, and maps each row into the same
// shape Common Ground renders — so stored results can stand in for a live scan.
//
// Demo mode never calls this (it has no auth user); this is the signed-in path.
// Fails soft everywhere: any error yields an empty list, and the caller falls
// back to a live scan, so a real user is never left staring at a broken page.

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { daysUntilBirthday } from '../lib/birthday'
import { holdReasonFor } from './monitoring'

const FALLBACK_COLORS = ['#1e3a5f', '#1a2e4a', '#1c3554', '#172b45']
// The scan only keeps news published in the last 72 hours (FRESH_HOURS on the
// server); anything older is past news even if a row for it is still stored.
const FRESH_MS = 72 * 3600000

// Fired when the stored reasons are known to have changed (a push was
// tapped), so Today re-reads them instead of showing the deck it last loaded.
export const REASONS_STALE_EVENT = 'harbored:reasons-stale'
export function markReasonsStale() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REASONS_STALE_EVENT))
}

// Asks Today to scan this account right now (the end of onboarding). Held
// until Today picks it up, in case it isn't mounted when the request is made.
export const SCAN_NOW_EVENT = 'harbored:scan-now'
let pendingScan = false
export function requestScanNow() {
  pendingScan = true
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SCAN_NOW_EVENT))
}
export function takeScanRequest() {
  const was = pendingScan
  pendingScan = false
  return was
}

// A birthday row says "today", so it shows only on the day itself (the
// contact's birthday in this device's calendar). News rows show while fresh.
function isCurrent(row, contact, now = Date.now()) {
  if (row.theme_category === 'birthday') return daysUntilBirthday(contact?.birthday, new Date(now)) === 0
  const t = Date.parse(row.published_at || row.scanned_at || '')
  return Number.isFinite(t) && now - t < FRESH_MS
}

function initialsFrom(name) {
  return (name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function relativeTime(iso) {
  if (!iso) return 'recently'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return `${Math.floor(days / 7)} wk ago`
}

export async function fetchStoredUpdates(contacts = []) {
  const user = useAuthStore.getState().user
  if (!user) return []

  let data
  try {
    // RLS restricts this to the signed-in user's own rows.
    const res = await supabase
      .from('scan_results')
      .select('*')
      .order('score', { ascending: false })
    if (res.error) {
      console.error('fetchStoredUpdates:', res.error.message)
      return null // null = couldn't check; [] = checked, nothing there
    }
    data = res.data
  } catch (err) {
    console.error('fetchStoredUpdates:', err)
    return null
  }

  // Enrich with the contact's avatar (initials/color) from the live store when
  // the contact still exists; otherwise derive sensible fallbacks from the name.
  const byId = new Map(contacts.map(c => [String(c.id), c]))

  // Rows for people who have since been removed from the crew don't become
  // reasons; the next scan drops them server-side.
  return (data || []).filter(row => byId.has(String(row.contact_id)) && isCurrent(row, byId.get(String(row.contact_id)))).map(row => {
    const contact = byId.get(String(row.contact_id))
    const name = row.contact_name || contact?.name || 'Someone'
    const first = name.split(' ')[0]
    const above = row.above_bar
    // A heads-up (significant upcoming event) rides as a structured prefix on
    // the rationale — no dedicated column. Parse it back out for the kicker.
    const headsUpMatch = (row.rationale || '').match(/^\[Heads-up · (.{1,30}?)\]\s*/)
    const headsUp = headsUpMatch ? headsUpMatch[1] : undefined
    const rationale = headsUpMatch ? (row.rationale || '').slice(headsUpMatch[0].length) : row.rationale
    // Below the bar, a row is a favor only when the scorer judged it relevant
    // and worth forwarding, in which case it wrote the note to send with it.
    const giveable = !above && row.relevant !== false && !!row.draft_message
    // Match the live store's numeric ids so navigation/send handlers resolve
    // the contact; fall back to the raw value if it isn't numeric.
    const numeric = Number(row.contact_id)
    const contactId = contact ? contact.id : (Number.isFinite(numeric) ? numeric : row.contact_id)

    return {
      id: `stored-${row.id}`,
      // Stable across re-scans, so "sent" and "skipped" stick.
      key: row.content_key || `stored-${row.id}`,
      live: false,
      publishedAt: row.published_at || null,
      engine: row.engine || null,
      link: row.link,
      themeLabel: row.theme_label,
      category: row.theme_category,
      contactId,
      contactName: name,
      contactInitials: contact?.initials || initialsFrom(name),
      contactColor: contact?.color || FALLBACK_COLORS[name.length % FALLBACK_COLORS.length],
      headline: row.headline,
      source: row.source,
      time: relativeTime(row.published_at || row.scanned_at),
      score: row.score,
      headsUp,
      rationale: rationale || undefined,
      // The scorer always writes a draft for a reason; if one is ever missing,
      // the stand-in is a plain check-in that reads right whatever the news
      // was (bad news included) and never quotes the headline.
      draftMessage: above ? (row.draft_message || `Hey ${first}, this made me think of you. How are you doing?`) : undefined,
      giveable,
      giveMessage: giveable ? row.draft_message : undefined,
      holdReason: above ? undefined : holdReasonFor(row.score),
    }
  })
}
