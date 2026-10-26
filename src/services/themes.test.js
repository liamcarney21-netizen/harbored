import { describe, it, expect, vi, afterEach } from 'vitest'
import { refineMissingThemes } from './themes'

afterEach(() => vi.unstubAllGlobals())

describe('refineMissingThemes', () => {
  it('refines real people only, including old keyword-fallback themes, a few per session', async () => {
    const asked = []
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      const { label } = JSON.parse(init.body)
      asked.push(label)
      return new Response(JSON.stringify({ engine: 'claude', query: `"${label}"`, entityType: 'team', watchFor: ['games'], display: `Watching ${label}.` }))
    }))
    const contacts = [{ id: 1, name: 'Sample', seed: true }, { id: 2, name: 'Kellan' }]
    const themesByContact = {
      1: [{ id: 'a', label: 'Seed theme' }],
      2: [
        { id: 'b', label: 'Unrefined' },
        { id: 'c', label: 'Old fallback', query: '"Old fallback"', watchFor: ['significant news'], entityType: 'topic' },
        { id: 'd', label: 'Done', query: '"Done"', watchFor: ['games'], entityType: 'team' },
      ],
    }
    const updates = []
    await refineMissingThemes(contacts, themesByContact, (cid, tid, r) => updates.push([cid, tid, r.entityType]))
    expect(asked).toEqual(['Unrefined', 'Old fallback'])
    expect(updates).toEqual([[2, 'b', 'team'], [2, 'c', 'team']])
  })
})
