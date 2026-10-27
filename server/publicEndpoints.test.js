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

  it('refine: a place is searched as the place itself, never steered to business news', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const llm = vi.fn(async () => ({ ok: true, parsed: { entityType: 'place', query: '"Southern California"', watchFor: ['big local events'], display: 'Watching Southern California for news people there would notice.' } }))
    const res = await handleRefineRequest({ label: 'Southern California', contactName: 'Collin Parsons' }, { llm })
    const { system } = llm.mock.calls[0][0]
    expect(system).toContain('Search a place as the place itself')
    expect(system).toContain('never steer it toward business news')
    expect(res.body).toMatchObject({ engine: 'claude', entityType: 'place', query: '"Southern California"' })
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

describe("refine: what you'd text them about", () => {
  beforeEach(() => vi.stubEnv('ANTHROPIC_API_KEY', 'test-key'))
  const refineWith = (parsed) => vi.fn(async () => ({ ok: true, parsed }))

  it('proposes up to five choices with two or three checked, minus duplicates, long labels and kinds that never count', async () => {
    const llm = refineWith({
      entityType: 'place',
      query: '"Southern California"',
      watchFor: ['big local events'],
      display: 'Watching Southern California for news people there would notice.',
      textAbout: [
        { label: 'Wildfires & storms', on: true },
        { label: 'wildfires and storms', on: true }, // the same choice
        { label: 'Big local events', on: true },
        { label: 'Startup funding', on: true },      // business news, for a place
        { label: 'Every game', on: false },          // never counts
        { label: 'x'.repeat(41), on: false },        // too long
        { label: "Local teams' big moments", on: true },
        { label: 'Real estate', on: true },          // a fourth checked
        { label: 'Big changes to the area', on: false },
        { label: 'Beach openings', on: false },      // past five
      ],
      bare: true, // only a topic can be bare
      narrower: ['Irvine'],
    })
    const res = await handleRefineRequest({ label: 'Southern California', contactName: 'Collin Parsons', relation: 'teammate' }, { llm })
    expect(res.body.textAbout).toEqual([
      { label: 'Wildfires & storms', on: true },
      { label: 'Big local events', on: true },
      { label: "Local teams' big moments", on: true },
      { label: 'Real estate', on: false },
      { label: 'Big changes to the area', on: false },
    ])
    expect(res.body.bare).toBeUndefined()
    expect(res.body.narrower).toBeUndefined()
    const { system, user } = llm.mock.calls[0][0]
    expect(user).toContain('How the user knows them: "teammate"')
    expect(system).toContain('how the user knows them')
    expect(system).toContain('Never offer a kind of story that is never a reason to text')
  })

  it('checks the first two when the model checks none, and ignores an unknown relation', async () => {
    const llm = refineWith({ entityType: 'team', query: '"Colorado Avalanche" (game OR trade)', textAbout: ['Big games', 'Trades & signings', 'Coaching changes'] })
    const res = await handleRefineRequest({ label: 'Colorado Avalanche', relation: 'nemesis' }, { llm })
    expect(res.body.textAbout).toEqual([{ label: 'Big games', on: true }, { label: 'Trades & signings', on: true }, { label: 'Coaching changes', on: false }])
    expect(llm.mock.calls[0][0].user).toContain('How the user knows them: ""')
  })

  it('gives a bare category narrower subjects instead of choices', async () => {
    const health = await handleRefineRequest({ label: 'Health and wellness' }, {
      llm: refineWith({
        entityType: 'topic',
        query: 'health AND wellness',
        bare: false, // the code's own list knows this one
        textAbout: [{ label: 'Studies', on: true }, { label: 'Fitness trends', on: true }],
        narrower: ['Marathon running', 'Nutrition', 'Yoga', 'yoga', 'Health and wellness', 'Plant-based eating', 'Pilates', 'Barre'],
      }),
    })
    expect(health.body).toMatchObject({ entityType: 'topic', bare: true, narrower: ['Marathon running', 'Yoga', 'Plant-based eating', 'Pilates'] })
    expect(health.body.textAbout).toBeUndefined()
    // The model can call a topic bare that the list doesn't know.
    const running = await handleRefineRequest({ label: 'Running' }, { llm: refineWith({ entityType: 'topic', query: 'running', bare: true, narrower: ['Boston Marathon', 'Trail running'] }) })
    expect(running.body).toMatchObject({ bare: true, narrower: ['Boston Marathon', 'Trail running'] })
    // A topic narrow enough to name keeps its choices.
    const mcm = await handleRefineRequest({ label: 'Mid century modern architecture' }, {
      llm: refineWith({ entityType: 'topic', query: 'mid-century modern architecture', textAbout: [{ label: 'Famous houses', on: true }, { label: 'Design events', on: true }], narrower: ['Eichler homes'] }),
    })
    expect(mcm.body.bare).toBeUndefined()
    expect(mcm.body.textAbout).toHaveLength(2)
  })

  it('proposes no choices from fewer than two usable ones, or without a key', async () => {
    const one = await handleRefineRequest({ label: 'Villanova' }, { llm: refineWith({ entityType: 'team', query: '"Villanova" (game OR trade)', textAbout: [{ label: 'Big games', on: true }, { label: 'Every game', on: true }] }) })
    expect(one.body).toMatchObject({ engine: 'claude', entityType: 'team' })
    expect(one.body.textAbout).toBeUndefined()
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const keyless = await handleRefineRequest({ label: 'Villanova Basketball' })
    expect(keyless.body.engine).toBe('heuristic')
    expect(keyless.body.textAbout).toBeUndefined()
  })
})

describe('redraft: how the user knows them', () => {
  it('sets the tone, and anything unknown is ignored', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const llm = vi.fn(async () => ({ ok: true, parsed: { message: 'Collin, you guys OK out there?' } }))
    await handleRedraftRequest({ current: 'Hey Collin', contactName: 'Collin Parsons', headline: 'Wildfire forces evacuations in Irvine', relation: 'teammate' }, { llm })
    expect(llm.mock.calls[0][0].user).toContain('friendly ribbing of them')
    await handleRedraftRequest({ current: 'Hey Collin', contactName: 'Collin Parsons', headline: 'Wildfire forces evacuations in Irvine', relation: 'rival' }, { llm })
    expect(llm.mock.calls[1][0].user).not.toContain('They are')
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
