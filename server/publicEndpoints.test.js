import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleRefineRequest } from './refineHandler.js'
import { handleDiscoverRequest } from './discoverHandler.js'
import { handleRedraftRequest } from './redraftHandler.js'
import { buildEmailHtml } from './digestHandler.js'
import { installGuards, removeGuards } from './testing/guards.js'

beforeEach(() => { installGuards(); vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { vi.restoreAllMocks(); removeGuards() })

const failingLlm = vi.fn(async () => ({ ok: false, error: 'HTTP 529 overloaded_error' }))

describe('input clamps on the public LLM endpoints', () => {
  it('refine: label ≤ 120 chars, else 400', async () => {
    expect((await handleRefineRequest({ label: 'x'.repeat(121) })).status).toBe(400)
    expect((await handleRefineRequest({ label: '' })).status).toBe(400)
    expect((await handleRefineRequest({ label: { evil: true } })).status).toBe(400)
    const ok = await handleRefineRequest({ label: 'Villanova Basketball' })
    expect(ok).toMatchObject({ status: 200, body: { engine: 'heuristic', query: '"Villanova Basketball"' } })
  })

  it('refine: a failed Claude call falls back and says engine heuristic', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const res = await handleRefineRequest({ label: 'Fintech startup', contactCompany: 'Sunny Benefits' }, { llm: failingLlm })
    expect(res.body.engine).toBe('heuristic')
  })

  it('discover: text ≤ 12,000 chars, else 400', async () => {
    const long = 'We talked about Villanova basketball and the Final Four. '.repeat(250)
    expect(long.length).toBeGreaterThan(12000)
    expect((await handleDiscoverRequest({ text: long })).status).toBe(400)
    const ok = await handleDiscoverRequest({ text: long.slice(0, 11000) })
    expect(ok.status).toBe(200)
  })

  it('redraft: fields ≤ 2,000 chars, else 400', async () => {
    expect((await handleRedraftRequest({ current: 'x'.repeat(2001) })).status).toBe(400)
    expect((await handleRedraftRequest({ current: 'hi', headline: 'h'.repeat(2001) })).status).toBe(400)
    expect((await handleRedraftRequest({ current: 'Hey Ann — saw the Lakers news!', contactName: 'Ann Lee', angle: 'shorter' })).body.engine).toBe('heuristic')
  })
})

describe('digest email', () => {
  it('renders a heads-up as a label instead of raw brackets', () => {
    const html = buildEmailHtml('Liam', [{ contact_name: 'Ann', theme_label: 'Lakers', headline: 'Lakers vs Celtics', rationale: '[Heads-up · Saturday night] Marquee game.' }])
    expect(html).toContain('Heads-up: Saturday night')
    expect(html).not.toContain('[Heads-up')
    expect(html).toContain('Marquee game.')
  })
})
