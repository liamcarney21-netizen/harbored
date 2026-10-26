import { describe, it, expect } from 'vitest'
import { themeWatch, isFallbackRefinement } from './status'

const old = '2026-01-01T00:00:00.000Z'

describe('themeWatch', () => {
  it("says what a refined theme watches, in the refiner's own words", () => {
    const t = { label: 'Fintech startup', query: '"Sunny Benefits" (funding OR hiring)', entityType: 'company', display: "Watching Sunny Benefits (Kellan's company) for funding and hires.", createdAt: old }
    expect(themeWatch(t)).toEqual({ text: t.display, broad: false, refining: false })
  })

  it('flags a theme that resolved to a broad topic, with the fix', () => {
    const t = { label: 'Fintech startup', query: 'fintech startup', entityType: 'topic', display: 'Watching fintech news.', createdAt: old }
    expect(themeWatch(t)).toMatchObject({ broad: true, text: expect.stringMatching(/too broad/i) })
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
