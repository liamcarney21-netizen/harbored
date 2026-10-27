import { describe, it, expect } from 'vitest'
import { themeWatch, isFallbackRefinement } from './status'

const old = '2026-01-01T00:00:00.000Z'

describe('themeWatch', () => {
  it("says what a refined theme watches, in the refiner's own words", () => {
    const t = { label: 'Fintech startup', query: '"Sunny Benefits" (funding OR hiring)', entityType: 'company', display: "Watching Sunny Benefits (Kellan's company) for funding and hires.", createdAt: old }
    expect(themeWatch(t)).toEqual({ text: t.display, broad: false, refining: false })
  })

  it('flags only a bare category as too broad; a topic narrow enough to name is watched', () => {
    const bare = { label: 'Health and wellness', query: 'health and wellness', entityType: 'topic', bare: true, narrower: ['Yoga'], createdAt: old }
    expect(themeWatch(bare)).toMatchObject({ broad: true, text: expect.stringMatching(/too broad/i) })
    const mcm = { label: 'Mid century modern architecture', query: 'mid-century modern architecture', entityType: 'topic', display: 'Watching mid-century modern architecture.', createdAt: old }
    expect(themeWatch(mcm)).toEqual({ text: mcm.display, broad: false, refining: false })
  })

  it('says when every choice is turned off', () => {
    const t = { label: 'Lakers', query: '"Lakers"', entityType: 'team', display: 'Watching the Lakers.', textAbout: [{ label: 'Big games', on: false }], createdAt: old }
    expect(themeWatch(t)).toMatchObject({ paused: true, broad: false })
  })

  it("doesn't mistake an old keyword-fallback for a broad theme", () => {
    const t = { label: 'Villanova Basketball', query: '"Villanova Basketball"', entityType: 'topic', watchFor: ['significant news'], display: 'Watching Villanova Basketball for significant news.', createdAt: old }
    expect(isFallbackRefinement(t)).toBe(true)
    expect(themeWatch(t)).toEqual({ text: 'Watching the news for Villanova Basketball.', broad: false, refining: false })
  })

  it('shows the thinking state only while a fresh theme is being refined', () => {
    expect(themeWatch({ label: 'Lakers', createdAt: new Date().toISOString() }).refining).toBe(true)
    expect(themeWatch({ label: 'Lakers', createdAt: old }).text).toBe('Watching the news for Lakers.')
    expect(themeWatch(undefined)).toEqual({ text: '', broad: false, refining: false })
  })
})
