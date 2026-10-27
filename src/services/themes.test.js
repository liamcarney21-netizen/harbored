import { describe, it, expect, vi, afterEach } from 'vitest'
import { refineMissingThemes } from './themes'

afterEach(() => vi.unstubAllGlobals())

describe('refineMissingThemes', () => {
  it('refines real people only, then backfills choices: a place takes the whole refinement, other themes only their choices', async () => {
    const asked = []
    const refined = {
      'Unrefined': { entityType: 'team', textAbout: [{ label: 'Big games', on: true }] },
      'Old fallback': { entityType: 'team' },
      'Southern California': { entityType: 'place', query: '"Southern California"', display: 'Watching Southern California for news people there would notice.', textAbout: [{ label: 'Wildfires & storms', on: true }, { label: 'Big local events', on: true }] },
      'Colorado Avalanche': { entityType: 'team', query: '"Colorado Avalanche" (game OR trade)', textAbout: [{ label: 'Big games', on: true }, { label: 'Trades & signings', on: true }] },
      'Health and wellness': { entityType: 'topic', bare: true, narrower: ['Yoga', 'Marathon running'] },
      'Lakers': { entityType: 'team' }, // no choices came back: nothing to save
    }
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      const { label, relation } = JSON.parse(init.body)
      asked.push(relation ? `${label} (${relation})` : label)
      return new Response(JSON.stringify({ engine: 'claude', query: `"${label}"`, watchFor: ['games'], display: `Watching ${label}.`, ...refined[label] }))
    }))
    const contacts = [{ id: 1, name: 'Sample', seed: true }, { id: 2, name: 'Collin', relation: 'teammate' }]
    const themesByContact = {
      1: [{ id: 'a', label: 'Seed theme' }],
      2: [
        { id: 'b', label: 'Unrefined' },
        { id: 'c', label: 'Old fallback', query: '"Old fallback"', watchFor: ['significant news'], entityType: 'topic' },
        { id: 'd', label: 'Southern California', query: 'Southern California (startup OR funding)', entityType: 'place', display: 'Watching Southern California for business news.' },
        { id: 'e', label: 'Colorado Avalanche', query: '"Colorado Avalanche"', entityType: 'team', display: 'Watching the Avalanche.' },
        { id: 'f', label: 'Health and wellness', query: 'health AND wellness', entityType: 'topic' },
        { id: 'g', label: 'Lakers', query: '"Lakers"', entityType: 'team' },
        { id: 'h', label: 'Has choices', query: '"Has choices"', entityType: 'team', textAbout: [{ label: 'Big games', on: true }] },
        { id: 'i', label: 'Confirmed', query: '"Confirmed"', entityType: 'team', textAboutConfirmed: true },
      ],
    }
    const updates = []
    await refineMissingThemes(contacts, themesByContact, (cid, tid, r) => updates.push([tid, r]))
    expect(asked).toEqual(['Unrefined', 'Old fallback', 'Southern California', 'Colorado Avalanche', 'Health and wellness', 'Lakers'].map(l => `${l} (teammate)`))
    expect(updates.map(([tid]) => tid)).toEqual(['b', 'c', 'd', 'e', 'f'])
    expect(updates[2][1]).toMatchObject({ query: '"Southern California"', entityType: 'place', display: 'Watching Southern California for news people there would notice.', textAbout: [{ label: 'Wildfires & storms', on: true }, { label: 'Big local events', on: true }] })
    expect(updates[3][1]).toEqual({ textAbout: [{ label: 'Big games', on: true }, { label: 'Trades & signings', on: true }] })
    expect(updates[4][1]).toEqual({ bare: true, narrower: ['Yoga', 'Marathon running'] })
  })
})
