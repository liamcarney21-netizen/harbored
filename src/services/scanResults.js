// Reads the stored output of the scheduled server-side scan (scan_results table,
// written by /api/scan) for the signed-in user, and maps each row into the same
// shape Common Ground renders — so stored results can stand in for a live scan.
//
// Demo mode never calls this (it has no auth user); this is the signed-in path.
// Fails soft everywhere: any error yields an empty list, and the caller falls
// back to a live scan, so a real user is never left staring at a broken page.

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { isGiveable, holdReasonFor } from './monitoring'

const FALLBACK_COLORS = ['#1e3a5f', '#1a2e4a', '#1c3554', '#172b45']

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
      return []
    }
    data = res.data
  } catch (err) {
    console.error('fetchStoredUpdates:', err)
    return []
  }

  // Enrich with the contact's avatar (initials/color) from the live store when
  // the contact still exists; otherwise derive sensible fallbacks from the name.
  const byId = new Map(contacts.map(c => [String(c.id), c]))

  return (data || []).map(row => {
    const contact = byId.get(String(row.contact_id))
    const name = row.contact_name || contact?.name || 'Someone'
    const first = name.split(' ')[0]
    const above = row.above_bar
    const giveable = !above && isGiveable(row.headline || '')
    // Match the live store's numeric ids so navigation/send handlers resolve
    // the contact; fall back to the raw value if it isn't numeric.
    const numeric = Number(row.contact_id)
    const contactId = contact ? contact.id : (Number.isFinite(numeric) ? numeric : row.contact_id)

    return {
      id: `stored-${row.id}`,
      live: false,
      link: row.link,
      themeLabel: row.theme_label,
      category: row.theme_category,
      contactId,
      contactName: name,
      contactInitials: contact?.initials || initialsFrom(name),
      contactColor: contact?.color || FALLBACK_COLORS[name.length % FALLBACK_COLORS.length],
      headline: row.headline,
      source: row.source,
      time: relativeTime(row.scanned_at),
      score: row.score,
      rationale: row.rationale || undefined,
      draftMessage: above
        ? (row.draft_message || `${first} — did you see this? "${row.headline}" Immediately thought of you.`)
        : undefined,
      giveable,
      giveMessage: giveable
        ? `${first} — saw this and thought of you: "${row.headline}". No agenda, just figured you'd want it.`
        : undefined,
      holdReason: above ? undefined : holdReasonFor(row.score),
    }
  })
}
