// APNs push send service. Finds each user's genuinely-new above-bar opportunities
// (the notified-tracking's notified_at IS NULL rows), looks up their device tokens,
// and sends a push per device. Marks results notified after a successful send, so
// neither push nor the digest re-alerts them.
//
// PREVIEW MODE (default until Apple creds are set): computes exactly what it WOULD
// send and sends nothing — safe to run anytime. To actually send, set:
//   APNS_KEY        contents of the .p8 auth key (PEM)
//   APNS_KEY_ID     the key's 10-char id
//   APNS_TEAM_ID    your Apple Developer team id
//   APNS_BUNDLE_ID  app.harbored
//   APNS_ENV        production | sandbox   (default production)
//
// ⚠️ The APNs transport (sendApns) is the ONE part not verifiable without a real
// .p8 + device token — written to Apple's HTTP/2 provider-API spec, exercised once
// you supply the key. Everything above it (which results, which users, payloads,
// marking) is covered by the preview-mode tests.

import http2 from 'node:http2'
import jwt from 'jsonwebtoken'

const APNS_HOSTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
}

function apnsConfigured() {
  return !!(process.env.APNS_KEY && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_BUNDLE_ID)
}

// APNs provider JWT (ES256). Valid up to 1h; minted once per run.
function providerJwt() {
  return jwt.sign({}, process.env.APNS_KEY, {
    algorithm: 'ES256',
    keyid: process.env.APNS_KEY_ID,
    issuer: process.env.APNS_TEAM_ID,
  })
}

function buildPayload(topItem, count) {
  return {
    aps: {
      alert: {
        title: count > 1 ? `${count} people worth reaching out to` : `Reach out to ${topItem.contact_name}`,
        body: topItem.headline,
      },
      sound: 'default',
      badge: count,
    },
    // Deep-link target for when the user taps the notification.
    url: '/dashboard',
  }
}

// Send one push to one device token via APNs HTTP/2. Resolves {ok, status, body}.
function sendApns(client, token, deviceToken, payload) {
  return new Promise((resolve) => {
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      'apns-topic': process.env.APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    })
    let status = 0
    let body = ''
    req.on('response', (headers) => { status = headers[':status'] })
    req.setEncoding('utf8')
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve({ ok: status === 200, status, body }))
    req.on('error', (err) => resolve({ ok: false, status: 0, body: String(err.message || err) }))
    req.end(JSON.stringify(payload))
  })
}

export async function runPush(supabase, { send = true } = {}) {
  // New above-bar opportunities the user hasn't been alerted to yet.
  const { data: rows, error } = await supabase
    .from('scan_results')
    .select('id, user_id, contact_name, theme_label, headline, score, notified_at')
    .eq('above_bar', true)
    .is('notified_at', null)
    .order('score', { ascending: false })
  if (error) throw new Error(`read scan_results: ${error.message}`)

  const byUser = new Map()
  for (const r of rows || []) {
    const arr = byUser.get(r.user_id) || []
    arr.push(r)
    byUser.set(r.user_id, arr)
  }

  const summary = { usersWithNew: byUser.size, devicesPushed: 0, usersNoDevice: 0, previews: [] }
  if (byUser.size === 0) return summary

  // Device tokens for exactly those users.
  const { data: tokenRows, error: tErr } = await supabase
    .from('device_tokens')
    .select('user_id, token')
    .in('user_id', [...byUser.keys()])
  if (tErr) throw new Error(`read device_tokens: ${tErr.message}`)
  const tokensByUser = new Map()
  for (const t of tokenRows || []) {
    const arr = tokensByUser.get(t.user_id) || []
    arr.push(t.token)
    tokensByUser.set(t.user_id, arr)
  }

  const live = send && apnsConfigured()
  let client = null
  let token = null
  if (live) {
    client = http2.connect(APNS_HOSTS[process.env.APNS_ENV === 'sandbox' ? 'sandbox' : 'production'])
    token = providerJwt()
  }

  try {
    for (const [userId, items] of byUser) {
      const tokens = tokensByUser.get(userId) || []
      if (tokens.length === 0) { summary.usersNoDevice++; continue }
      const payload = buildPayload(items[0], items.length)

      if (!live) {
        summary.previews.push({ user: userId.slice(0, 8), devices: tokens.length, items: items.length, title: payload.aps.alert.title })
        continue
      }

      let anyOk = false
      for (const dt of tokens) {
        const res = await sendApns(client, token, dt, payload)
        if (res.ok) { anyOk = true; summary.devicesPushed++ }
        else console.error(`[push] APNs ${res.status} for …${dt.slice(-6)}: ${res.body}`)
      }
      // Mark notified only if at least one device accepted the push.
      if (anyOk) {
        const ids = items.map(it => it.id)
        const { error: mErr } = await supabase
          .from('scan_results')
          .update({ notified_at: new Date().toISOString() })
          .in('id', ids)
        if (mErr) console.error(`[push] mark notified failed: ${mErr.message}`)
      }
    }
  } finally {
    if (client) client.close()
  }

  return summary
}
