// Waitlist signups: POST /api/waitlist { firstName, email, plan? }
// plan is optional ('free' | 'pro') and reflects which pricing card the
// visitor clicked — lets us segment interest before anything is billable.
//
// Delivery: emails each signup to the owner via Resend when RESEND_API_KEY is
// set (resend.com — free tier covers 100/day; the same key powers the digest
// and the scan alerts). Without a key the signup is NOT stored anywhere (logs
// carry no personal data), and the response tells the client delivery wasn't
// durable (delivered: false).

const OWNER_EMAIL = 'harboredsupport@gmail.com'

export async function handleWaitlistRequest({ firstName, email, plan }) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { status: 400, body: { error: 'Enter a valid email address.' } }
  }
  const name = String(firstName || '').trim().slice(0, 80)
  const cleanPlan = ['free', 'pro'].includes(plan) ? plan : null

  // Counts only: the address and name go to the owner by email, never into logs.
  console.log(`[waitlist] signup received plan=${cleanPlan || 'unspecified'}`)

  if (!process.env.RESEND_API_KEY) {
    return { status: 200, body: { ok: true, delivered: false } }
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Harbored Waitlist <onboarding@resend.dev>',
        to: [OWNER_EMAIL],
        subject: `Waitlist signup: ${cleanEmail}${cleanPlan ? ` (${cleanPlan})` : ''}`,
        text: `New Harbored waitlist signup\n\nName: ${name || '(not given)'}\nEmail: ${cleanEmail}\nPlan interest: ${cleanPlan || 'unspecified'}\nWhen: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT\n`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) throw new Error(`Resend ${resp.status}`)
    return { status: 200, body: { ok: true, delivered: true } }
  } catch (err) {
    console.error('[waitlist] delivery failed:', err.message)
    return { status: 200, body: { ok: true, delivered: false } }
  }
}
