import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => ({ inserts: [], user: { id: 'u1' }, demo: false }))
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ insert: (row) => { H.inserts.push(row); return Promise.resolve({ error: null }) } }) },
}))
vi.mock('../store/authStore', () => ({ useAuthStore: { getState: () => ({ user: H.user }) } }))
vi.mock('../store/demoStore', () => ({ useDemoStore: { getState: () => ({ active: H.demo }) } }))

import { cleanProps, track } from './events'

beforeEach(() => { H.inserts = []; H.user = { id: 'u1' }; H.demo = false })

describe('cleanProps', () => {
  it('keeps short labels, numbers and booleans, and drops anything that could carry a name or a headline', () => {
    expect(cleanProps({
      count: 3, granted: true, result: 'limited', kind: 'news',
      name: 'Kellan Carney', headline: 'Villanova lands a five-star guard', email: 'a@b.co',
      nested: { a: 1 }, list: [1], bad_key_That: 1, way_too_long_label: 'x'.repeat(30),
    })).toEqual({ count: 3, granted: true, result: 'limited', kind: 'news' })
  })
})

describe('track', () => {
  it('records a signed-in account, never the demo or a signed-out visitor', () => {
    track('draft_opened', { kind: 'news' })
    expect(H.inserts).toEqual([{ user_id: 'u1', name: 'draft_opened', props: { kind: 'news' }, platform: 'web' }])
    H.demo = true
    track('draft_opened')
    H.demo = false
    H.user = null
    track('draft_opened')
    expect(H.inserts).toHaveLength(1)
  })
})
