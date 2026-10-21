// Test guards. vitest loads vite.config.js, which copies .env.local (production
// keys) into process.env, so every server test blanks the secrets it could
// reach and replaces global fetch with one that throws: no test can call
// Anthropic, Supabase, Resend, APNs or a heartbeat URL by accident.
import { vi } from 'vitest'

const BLANKED = [
  'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'RESEND_API_KEY', 'ALERT_EMAIL', 'HEARTBEAT_URL',
  'SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET',
  'APNS_KEY', 'APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_BUNDLE_ID', 'APNS_ENV',
]

export function installGuards() {
  for (const k of BLANKED) vi.stubEnv(k, '')
  const blocked = vi.fn(async (url) => {
    throw new Error(`unexpected network call in a test: ${String(url).slice(0, 80)}`)
  })
  vi.stubGlobal('fetch', blocked)
  return blocked
}

export function removeGuards() {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
}

// A fake Anthropic Messages endpoint. `judge(item)` gets each item from the
// <items> block of the scoring prompt and returns that item's result (or
// undefined to omit it); `fail(body)` can return an HTTP status to fail with.
export function fakeClaudeFetch({ judge, fail, raw } = {}) {
  const requests = []
  const fn = vi.fn(async (url, init) => {
    if (!String(url).startsWith('https://api.anthropic.com/')) throw new Error(`unexpected URL ${url}`)
    const body = JSON.parse(init.body)
    requests.push(body)
    const status = fail?.(body)
    if (status) {
      return new Response(JSON.stringify({ type: 'error', error: { type: status === 529 ? 'overloaded_error' : 'api_error', message: 'x' } }), { status })
    }
    let text
    if (raw) text = raw(body)
    else {
      const content = body.messages[0].content
      const items = JSON.parse(content.slice(content.indexOf('<items>') + 7, content.indexOf('</items>')))
      const results = items.map(item => {
        const r = judge(item)
        return r === undefined ? undefined : { id: item.id, ...r }
      }).filter(Boolean)
      text = JSON.stringify({ results })
    }
    return new Response(JSON.stringify({
      model: body.model,
      stop_reason: 'end_turn',
      content: [{ type: 'text', text }],
      usage: { input_tokens: 10, output_tokens: 10 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  })
  fn.requests = requests
  return fn
}

export const noSleep = async () => {}
