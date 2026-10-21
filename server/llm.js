// The one Anthropic Messages API caller every server handler uses (score,
// refine, redraft, discover). Before this existed each handler had its own raw
// fetch with one attempt, no stop_reason check and brace-sliced JSON parsing,
// and a single 429/529 was enough to silently degrade a whole day's scan.
//
// What it guarantees:
//  - a per-attempt timeout, and an optional overall `deadline` (epoch ms) so a
//    serverless invocation never starts an attempt or a backoff it can't finish;
//  - up to `retries` (default 2) retries with exponential backoff + jitter on
//    408/409/429/5xx/529 and network errors, honouring retry-after;
//  - success only when stop_reason is end_turn/stop_sequence — max_tokens
//    (truncated JSON) and refusal are failures, never "partial success";
//  - JSON parsing that handles prose, code fences and stray braces, with the
//    old first-{-to-last-} slice kept only as the last resort.
//
// Returns { ok: true, engine: 'claude', model, parsed, stopReason, usage }
//      or { ok: false, engine: 'claude', model, error, status }.
// Failures are logged with console.error (reason + HTTP status only). Prompt
// contents and model output are never logged — they carry contact names.

const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'
export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

// Don't start an attempt with less than this much time left before `deadline`.
const MIN_ATTEMPT_MS = 2500
const MAX_RETRY_AFTER_MS = 10000

export function anthropicModel() {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
}

export function isRetryableStatus(status) {
  return status === 408 || status === 409 || status === 429 || status === 529 || status >= 500
}

// Claude 3.x, Haiku 4.5, Sonnet 4/4.5/4.6 and Opus 4/4.1/4.5/4.6 accept
// `temperature`. Opus 4.7+, every 5.x model and Fable reject non-default
// sampling with a 400, so an ANTHROPIC_MODEL override to one of those must not
// turn every scoring call into a hard failure — we just omit the parameter.
export function acceptsSampling(model) {
  const m = String(model || '')
  if (/^claude-3[-.]/.test(m)) return true
  if (/^claude-haiku-4-5\b/.test(m)) return true
  const family = m.match(/^claude-(?:sonnet|opus)-4(?:-(\d))?(?:-\d{8})?$/)
  if (family) return (family[1] ? Number(family[1]) : 0) <= 6
  return false
}

function tryParse(s) {
  try { return JSON.parse(s) } catch { return undefined }
}

function isJsonContainer(v) {
  return v !== null && typeof v === 'object'
}

// Index of the bracket that closes the one at `start`, respecting strings and
// escapes; -1 if it never closes (e.g. output truncated mid-object).
function matchingClose(s, start) {
  const stack = []
  let inString = false
  let escaped = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') { inString = true; continue }
    if (c === '{' || c === '[') stack.push(c)
    else if (c === '}' || c === ']') {
      const open = stack.pop()
      if ((c === '}' && open !== '{') || (c === ']' && open !== '[')) return -1
      if (stack.length === 0) return i
    }
  }
  return -1
}

// Parse a model's JSON answer. Order of preference: the whole text, the inside
// of a ```json fence, the first balanced {...}/[...] that parses, and finally
// the legacy first-{-to-last-} slice. Returns null when nothing parses to an
// object or array.
export function parseModelJson(text) {
  if (typeof text !== 'string') return null
  const s = text.trim()
  if (!s) return null

  const whole = tryParse(s)
  if (isJsonContainer(whole)) return whole

  const fence = s.match(/```(?:json|JSON)?\s*([\s\S]*?)```/)
  if (fence) {
    const inner = tryParse(fence[1].trim())
    if (isJsonContainer(inner)) return inner
  }

  let tries = 0
  for (let i = 0; i < s.length && tries < 25; i++) {
    if (s[i] !== '{' && s[i] !== '[') continue
    tries++
    const end = matchingClose(s, i)
    if (end === -1) continue
    const v = tryParse(s.slice(i, end + 1))
    if (isJsonContainer(v)) return v
  }

  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last > first) {
    const v = tryParse(s.slice(first, last + 1))
    if (isJsonContainer(v)) return v
  }
  return null
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function backoffMs(attempt, retryAfterHeader) {
  const retryAfter = Number(retryAfterHeader)
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS)
  return Math.min(600 * 2 ** attempt, 6000) + Math.floor(Math.random() * 250)
}

async function errorTypeOf(resp) {
  try {
    const body = await resp.json()
    return body?.error?.type ? String(body.error.type).slice(0, 60) : ''
  } catch {
    return ''
  }
}

export async function callClaude({
  label = 'claude',
  system,
  user,
  messages,
  maxTokens = 1024,
  temperature,
  timeoutMs = 20000,
  retries = 2,
  deadline,
  model = anthropicModel(),
  fetchImpl = globalThis.fetch,
  sleep = defaultSleep,
  now = Date.now,
} = {}) {
  const fail = (error, status = 0, extra = {}) => {
    console.error(`[llm] ${label} failed: ${error}${status ? ` (status ${status})` : ''}`)
    return { ok: false, engine: 'claude', model, error, status, ...extra }
  }

  if (!process.env.ANTHROPIC_API_KEY) return fail('ANTHROPIC_API_KEY not set', 0, { configured: false })

  const body = {
    model,
    max_tokens: maxTokens,
    messages: messages || [{ role: 'user', content: String(user ?? '') }],
  }
  if (system) body.system = system
  if (temperature !== undefined && acceptsSampling(model)) body.temperature = temperature

  const maxAttempts = retries + 1
  let lastError = 'no attempt made'
  let lastStatus = 0

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remaining = deadline ? deadline - now() : Infinity
    if (remaining < MIN_ATTEMPT_MS) {
      lastError = attempt === 0 ? 'no time left before deadline' : `${lastError}; no time left to retry`
      break
    }

    let resp
    let retryAfter = null
    try {
      resp = await fetchImpl(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
      })
    } catch (err) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
      lastStatus = 0
      lastError = timedOut ? `timed out after ${Math.round(Math.min(timeoutMs, remaining))}ms` : `network error: ${err?.code || err?.message || err}`
      resp = null
    }

    if (resp && !resp.ok) {
      lastStatus = resp.status
      const type = await errorTypeOf(resp)
      lastError = `HTTP ${resp.status}${type ? ` ${type}` : ''}`
      retryAfter = resp.headers?.get?.('retry-after') ?? null
      if (!isRetryableStatus(resp.status)) break
    }

    if (resp && resp.ok) {
      let data
      try {
        data = await resp.json()
      } catch {
        return fail('unreadable response body', resp.status)
      }
      const stopReason = data?.stop_reason
      if (stopReason !== 'end_turn' && stopReason !== 'stop_sequence') {
        // max_tokens = truncated output; refusal = declined. Neither is usable.
        return fail(`stop_reason ${stopReason || 'missing'}`, resp.status, { stopReason })
      }
      const text = (data.content || []).filter(b => b?.type === 'text').map(b => b.text || '').join('')
      const parsed = parseModelJson(text)
      if (parsed === null) return fail(`unparseable JSON output (${text.length} chars)`, resp.status, { stopReason })
      return {
        ok: true,
        engine: 'claude',
        model: data.model || model,
        parsed,
        stopReason,
        usage: data.usage || null,
        attempts: attempt + 1,
      }
    }

    // Retryable failure (network error, timeout, 408/409/429/5xx/529).
    if (attempt + 1 >= maxAttempts) break
    const wait = backoffMs(attempt, retryAfter)
    if (deadline && now() + wait + MIN_ATTEMPT_MS > deadline) {
      lastError = `${lastError}; no time left to retry`
      break
    }
    console.warn(`[llm] ${label} attempt ${attempt + 1}/${maxAttempts} failed: ${lastError}; retrying in ${wait}ms`)
    await sleep(wait)
  }

  return fail(lastError, lastStatus)
}
