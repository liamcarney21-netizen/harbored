import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { callClaude, parseModelJson, acceptsSampling, isRetryableStatus } from './llm.js'
import { installGuards, removeGuards, noSleep } from './testing/guards.js'

const ok = (text, extra = {}) => new Response(JSON.stringify({
  model: 'claude-haiku-4-5-20251001', stop_reason: 'end_turn', content: [{ type: 'text', text }], ...extra,
}), { status: 200 })
const err = (status, type = 'api_error', headers = {}) =>
  new Response(JSON.stringify({ type: 'error', error: { type, message: 'nope' } }), { status, headers })

beforeEach(() => { installGuards(); vi.stubEnv('ANTHROPIC_API_KEY', 'test-key') })
afterEach(() => removeGuards())

describe('parseModelJson', () => {
  it('parses plain JSON, code fences, and JSON wrapped in prose', () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 })
    expect(parseModelJson('```json\n{"a":2}\n```')).toEqual({ a: 2 })
    expect(parseModelJson('Sure! Here you go:\n```\n{"a":3}\n```\nAnything else?')).toEqual({ a: 3 })
    expect(parseModelJson('Result: {"a":{"b":"}"}} trailing { junk')).toEqual({ a: { b: '}' } })
    expect(parseModelJson('[{"id":"0"}]')).toEqual([{ id: '0' }])
  })

  it('returns null for truncated or non-JSON output', () => {
    expect(parseModelJson('{"results":[{"id":"0","significance":8')).toBe(null)
    expect(parseModelJson('no json here')).toBe(null)
    expect(parseModelJson('42')).toBe(null)
    expect(parseModelJson('')).toBe(null)
  })
})

describe('callClaude', () => {
  it('retries 529 and 429 with backoff, then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(err(529, 'overloaded_error'))
      .mockResolvedValueOnce(err(429, 'rate_limit_error', { 'retry-after': '1' }))
      .mockResolvedValueOnce(ok('{"x":1}'))
    const sleep = vi.fn(noSleep)
    const res = await callClaude({ user: 'hi', fetchImpl, sleep })
    expect(res).toMatchObject({ ok: true, engine: 'claude', parsed: { x: 1 }, attempts: 3 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep.mock.calls[1][0]).toBe(1000) // honoured retry-after
  })

  it('gives up after 2 retries and reports the status', async () => {
    const fetchImpl = vi.fn(async () => err(503))
    const res = await callClaude({ user: 'hi', fetchImpl, sleep: noSleep })
    expect(res.ok).toBe(false)
    expect(res.status).toBe(503)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('retries network errors and timeouts', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce(ok('{"y":2}'))
    const res = await callClaude({ user: 'hi', fetchImpl, sleep: noSleep })
    expect(res).toMatchObject({ ok: true, parsed: { y: 2 } })
  })

  it('does not retry a 400 or 401', async () => {
    const fetchImpl = vi.fn(async () => err(401, 'authentication_error'))
    const res = await callClaude({ user: 'hi', fetchImpl, sleep: noSleep })
    expect(res).toMatchObject({ ok: false, status: 401 })
    expect(res.error).toContain('authentication_error')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('treats max_tokens and refusal stop reasons as failures', async () => {
    const truncated = vi.fn(async () => ok('{"results":[', { stop_reason: 'max_tokens' }))
    expect(await callClaude({ user: 'hi', fetchImpl: truncated, sleep: noSleep })).toMatchObject({ ok: false, error: 'stop_reason max_tokens' })
    const refused = vi.fn(async () => ok('', { stop_reason: 'refusal' }))
    expect(await callClaude({ user: 'hi', fetchImpl: refused, sleep: noSleep })).toMatchObject({ ok: false, error: 'stop_reason refusal' })
    expect(truncated).toHaveBeenCalledTimes(1)
  })

  it('fails on unparseable output without logging the output itself', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn(async () => ok('Kellan Carney is great, no JSON'))
    const res = await callClaude({ user: 'secret prompt about Kellan', fetchImpl, sleep: noSleep })
    expect(res.ok).toBe(false)
    const logged = spy.mock.calls.flat().join(' ')
    expect(logged).not.toContain('Kellan')
    spy.mockRestore()
  })

  it('never starts an attempt or a retry past the deadline', async () => {
    let t = 0
    const now = () => t
    const fetchImpl = vi.fn(async () => { t += 9000; return err(529) })
    const res = await callClaude({ user: 'hi', fetchImpl, sleep: noSleep, now, deadline: 10000 })
    expect(res.ok).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(res.error).toContain('no time left')
  })

  it('fails fast without an API key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const fetchImpl = vi.fn()
    const res = await callClaude({ user: 'hi', fetchImpl })
    expect(res).toMatchObject({ ok: false, configured: false })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('sends temperature only to models that accept it', async () => {
    const fetchImpl = vi.fn(async () => ok('{}'))
    await callClaude({ user: 'hi', temperature: 0, model: 'claude-haiku-4-5-20251001', fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).temperature).toBe(0)
    await callClaude({ user: 'hi', temperature: 0, model: 'claude-haiku-5-5', fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).not.toHaveProperty('temperature')
  })
})

describe('model helpers', () => {
  it('knows which models accept sampling parameters', () => {
    for (const m of ['claude-haiku-4-5-20251001', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-sonnet-4-20250514', 'claude-opus-4-1-20250805', 'claude-opus-4-6', 'claude-3-5-haiku-20241022']) {
      expect(acceptsSampling(m), m).toBe(true)
    }
    for (const m of ['claude-opus-4-7', 'claude-opus-4-8', 'claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1', 'unknown']) {
      expect(acceptsSampling(m), m).toBe(false)
    }
  })

  it('classifies retryable statuses', () => {
    for (const s of [408, 409, 429, 500, 502, 503, 504, 529]) expect(isRetryableStatus(s)).toBe(true)
    for (const s of [400, 401, 403, 404, 413]) expect(isRetryableStatus(s)).toBe(false)
  })
})
