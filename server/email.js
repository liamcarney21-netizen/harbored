// Resend delivery shared by the weekly digest and the scan health alert.
// FROM is Resend's test sender: it only delivers to the Resend account owner
// (harboredsupport@gmail.com). That is exactly right for alerts; the digest
// needs a verified sending domain before it can reach other users.

export const FROM = 'Harbored <onboarding@resend.dev>'

export async function sendEmail({ to, subject, html, text }, { fetchImpl = globalThis.fetch } = {}) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')
  const resp = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, ...(html ? { html } : {}), ...(text ? { text } : {}) }),
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`Resend ${resp.status}`)
}
