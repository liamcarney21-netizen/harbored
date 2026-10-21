// Weekly digest: Monday recap of the past 7 days' above-bar opportunities per
// user. Daily push (chained onto the scan cron) owns immediate "this just
// happened" alerts and the notified bookkeeping; this email deliberately
// re-shows the week regardless of notified state. No Resend key → preview mode
// (builds the email but never sends), so this is safe to run in dev.
//
// Users who turned the recap off (prefs.digest === false in their saved data)
// are skipped. Rows that weren't scored by Claude (engine 'unscored', or any
// keyword-scored row) are never above the bar, so they never reach the email.
// Logs carry counts only — never addresses or names.

import { SIGNIFICANCE_THRESHOLD } from './scoreHandler.js'
import { sendEmail } from './email.js'

const APP_URL = 'https://harbored-three.vercel.app'
const MAX_ITEMS = 5

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// A heads-up (significant upcoming event) is stored as a "[Heads-up · when]"
// prefix on the rationale; show it as a label instead of raw brackets.
function splitHeadsUp(rationale) {
  const m = String(rationale || '').match(/^\[Heads-up · ([^\]]{1,40})\]\s*/)
  return m ? { headsUp: m[1], rationale: String(rationale).slice(m[0].length) } : { headsUp: null, rationale: rationale || '' }
}

// Inline styles only (email clients strip <style>).
export function buildEmailHtml(firstName, items) {
  const rows = items.map(it => {
    const { headsUp, rationale } = splitHeadsUp(it.rationale)
    return `
    <tr><td style="padding:18px 0;border-bottom:1px solid #E6E2D8;">
      <div style="font-family:Georgia,serif;font-size:17px;color:#1C2B33;font-weight:bold;">${esc(it.contact_name)}</div>
      <div style="font-size:11px;color:#A97E2F;text-transform:uppercase;letter-spacing:0.08em;margin:3px 0 8px;">${esc(it.theme_label)}${headsUp ? ` · Heads-up: ${esc(headsUp)}` : ''}</div>
      <div style="font-size:14px;color:#1C2B33;line-height:1.5;margin-bottom:6px;">${esc(it.headline)}</div>
      ${rationale ? `<div style="font-size:13px;color:#5C6B73;line-height:1.5;">${esc(rationale)}</div>` : ''}
    </td></tr>`
  }).join('')

  const count = items.length
  return `<!doctype html><html><body style="margin:0;background:#F6F4EF;padding:24px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E6E2D8;border-radius:14px;padding:28px;">
      <div style="font-family:Georgia,serif;font-size:22px;color:#1C2B33;font-weight:bold;">Harbored</div>
      <p style="font-size:14px;color:#5C6B73;line-height:1.6;margin:12px 0 22px;">
        ${firstName ? `Hi ${esc(firstName)} — ` : ''}${count} ${count === 1 ? 'person is' : 'people are'} worth reaching out to this week. Here's what Harbored found on the themes you share.
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:24px;background:#0D5C63;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 26px;border-radius:8px;">Open Harbored</a>
      <p style="font-size:11px;color:#9AA69F;margin-top:22px;line-height:1.5;">You're getting this because you're monitoring shared themes in Harbored. Reach-out threshold: significance ${SIGNIFICANCE_THRESHOLD}+. You can turn this recap off in the app's settings.</p>
    </div>
  </body></html>`
}

function digestWorthy(row) {
  if (row.above_bar !== true) return false
  // Rows written since migration 0005 say how they were scored; only Claude
  // and birthday rows belong in the recap. Legacy rows (no engine) pass.
  if (row.engine && row.engine !== 'claude' && row.engine !== 'birthday') return false
  if (row.relevant === false) return false
  return true
}

// send=false forces preview mode regardless of key — used in dev so a real key
// can never fire a live email against real accounts while testing.
export async function runDigest(supabase, { send = true, now = Date.now } = {}) {
  // Weekly RECAP: every above-bar result from the past 7 days, whether or not
  // push already alerted it. It neither filters on nor touches notified_at.
  const weekAgo = new Date(now() - 7 * 24 * 3600 * 1000).toISOString()
  const { data: rows, error } = await supabase
    .from('scan_results')
    .select('*')
    .eq('above_bar', true)
    .gte('scanned_at', weekAgo)
    .order('score', { ascending: false })
  if (error) throw new Error(`read scan_results: ${error.message}`)

  // Group above-bar results per user, capped.
  const byUser = new Map()
  for (const r of rows || []) {
    if (!digestWorthy(r)) continue
    const arr = byUser.get(r.user_id) || []
    if (arr.length < MAX_ITEMS) arr.push(r)
    byUser.set(r.user_id, arr)
  }

  const summary = { usersWithOpportunities: byUser.size, usersEmailed: 0, skippedNoEmail: 0, skippedOptOut: 0, sendFailures: 0, previews: [] }
  if (byUser.size === 0) return summary

  // Honour the recap toggle. If preferences can't be read, fail closed: no
  // email is better than one the user switched off.
  const { data: prefRows, error: prefErr } = await supabase
    .from('user_data')
    .select('user_id, data')
    .in('user_id', [...byUser.keys()])
  if (prefErr) throw new Error(`read user_data: ${prefErr.message}`)
  for (const r of prefRows || []) {
    if (r?.data?.prefs?.digest === false && byUser.delete(r.user_id)) summary.skippedOptOut++
  }
  summary.usersWithOpportunities = byUser.size
  if (byUser.size === 0) return summary

  // Resolve user emails/names via the admin API (needs the service-role key).
  // NOTE: single page — fine for current scale; paginate before real growth.
  const { data: admin, error: adminErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (adminErr) throw new Error(`listUsers: ${adminErr.message}`)
  const emailById = new Map()
  const firstNameById = new Map()
  for (const u of admin?.users || []) {
    if (u.email) emailById.set(u.id, u.email)
    const nm = u.user_metadata?.name || u.user_metadata?.full_name
    if (nm) firstNameById.set(u.id, String(nm).split(' ')[0])
  }

  const hasKey = !!process.env.RESEND_API_KEY

  for (const [userId, items] of byUser) {
    const email = emailById.get(userId)
    if (!email) { summary.skippedNoEmail++; continue }
    const subject = `Your week: ${items.length} ${items.length === 1 ? 'reason' : 'reasons'} to reach out`
    const html = buildEmailHtml(firstNameById.get(userId), items)

    if (send && hasKey) {
      try {
        await sendEmail({ to: email, subject, html })
        summary.usersEmailed++
      } catch (err) {
        summary.sendFailures++
        console.error(`[digest] send failed (${summary.sendFailures} so far): ${err.message}`)
      }
    } else {
      // Preview: never sends and never marks. Records enough to verify without
      // exposing addresses.
      summary.previews.push({ to: email.replace(/(.).+(@.+)/, '$1***$2'), subject, items: items.length })
    }
  }
  return summary
}
