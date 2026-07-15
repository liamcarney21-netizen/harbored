// Weekly digest: emails each user the reach-out opportunities the scheduled scan
// found for them (above-bar rows in scan_results), so Harbored delivers value
// without the user opening the app. Reuses the same Resend delivery pattern as
// waitlistHandler — no key → preview mode (builds the email but never sends), so
// this is safe to run in dev against real accounts.
//
// This is also the logic push notifications will reuse in Phase 3: "for each
// user, here are the new above-bar results worth telling them about."

import { SIGNIFICANCE_THRESHOLD } from './scoreHandler.js'

const APP_URL = 'https://harbored-three.vercel.app'
const FROM = 'Harbored <onboarding@resend.dev>' // Resend test sender; swap for a verified domain later
const MAX_ITEMS = 5

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Editorial Harbor palette, inline (email clients strip <style>).
export function buildEmailHtml(firstName, items) {
  const rows = items.map(it => `
    <tr><td style="padding:18px 0;border-bottom:1px solid #E6E2D8;">
      <div style="font-family:Georgia,serif;font-size:17px;color:#1C2B33;font-weight:bold;">${esc(it.contact_name)}</div>
      <div style="font-size:11px;color:#A97E2F;text-transform:uppercase;letter-spacing:0.08em;margin:3px 0 8px;">${esc(it.theme_label)}</div>
      <div style="font-size:14px;color:#1C2B33;line-height:1.5;margin-bottom:6px;">${esc(it.headline)}</div>
      ${it.rationale ? `<div style="font-size:13px;color:#5C6B73;line-height:1.5;">${esc(it.rationale)}</div>` : ''}
    </td></tr>`).join('')

  const count = items.length
  return `<!doctype html><html><body style="margin:0;background:#F6F4EF;padding:24px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E6E2D8;border-radius:14px;padding:28px;">
      <div style="font-family:Georgia,serif;font-size:22px;color:#1C2B33;font-weight:bold;">Harbored</div>
      <p style="font-size:14px;color:#5C6B73;line-height:1.6;margin:12px 0 22px;">
        ${firstName ? `Hi ${esc(firstName)} — ` : ''}${count} ${count === 1 ? 'person is' : 'people are'} worth reaching out to this week. Here's what Harbored found on the themes you share.
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:24px;background:#0D5C63;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 26px;border-radius:8px;">Open Harbored</a>
      <p style="font-size:11px;color:#9AA69F;margin-top:22px;line-height:1.5;">You're getting this because you're monitoring shared themes in Harbored. Reach-out threshold: significance ${SIGNIFICANCE_THRESHOLD}+.</p>
    </div>
  </body></html>`
}

async function sendViaResend(to, subject, html) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`Resend ${resp.status}`)
}

// send=false forces preview mode regardless of key — used in dev so a real key
// can never fire a live email against real accounts while testing.
export async function runDigest(supabase, { send = true } = {}) {
  const { data: rows, error } = await supabase
    .from('scan_results')
    .select('user_id, contact_name, theme_label, headline, rationale, score, above_bar')
    .eq('above_bar', true)
    .order('score', { ascending: false })
  if (error) throw new Error(`read scan_results: ${error.message}`)

  // Group above-bar results per user, capped.
  const byUser = new Map()
  for (const r of rows || []) {
    const arr = byUser.get(r.user_id) || []
    if (arr.length < MAX_ITEMS) arr.push(r)
    byUser.set(r.user_id, arr)
  }

  const summary = { usersWithOpportunities: byUser.size, usersEmailed: 0, skippedNoEmail: 0, previews: [] }
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
    const subject = `${items.length} ${items.length === 1 ? 'person' : 'people'} worth reaching out to`
    const html = buildEmailHtml(firstNameById.get(userId), items)

    if (send && hasKey) {
      try {
        await sendViaResend(email, subject, html)
        summary.usersEmailed++
      } catch (err) {
        console.error(`[digest] send failed for ${email}: ${err.message}`)
      }
    } else {
      // Preview: never sends. Records enough to verify without exposing addresses.
      summary.previews.push({ to: email.replace(/(.).+(@.+)/, '$1***$2'), subject, items: items.length })
    }
  }
  return summary
}
