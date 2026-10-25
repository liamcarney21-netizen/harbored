import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => ({ rows: [] }))
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ order: async () => ({ data: H.rows, error: null }) }) }) },
}))
vi.mock('../store/authStore', () => ({ useAuthStore: { getState: () => ({ user: { id: 'u1' } }) } }))

import { fetchStoredUpdates } from './scanResults'

const HOUR = 3600000
const ago = (h) => new Date(Date.now() - h * HOUR).toISOString()
const mmdd = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = mmdd(new Date())
const tomorrow = mmdd(new Date(Date.now() + 24 * HOUR))

const contacts = [
  { id: 1, name: 'Ann Lee', birthday: today },
  { id: 2, name: 'Bo Park', birthday: tomorrow },
]
let n = 0
const row = (over = {}) => ({
  id: ++n, contact_id: '1', contact_name: 'Ann Lee', theme_label: 'Lakers', theme_category: 'sports',
  headline: `Story ${n}`, score: 85, above_bar: true, draft_message: 'Ann, huge night!', relevant: true,
  engine: 'claude', content_key: `k${n}`, scanned_at: ago(1), published_at: ago(2), ...over,
})

beforeEach(() => { H.rows = [] })

describe('fetchStoredUpdates', () => {
  it('shows news only while it is fresh (72 hours), using the scan time for older rows', async () => {
    H.rows = [
      row({ headline: 'Fresh' }),
      row({ headline: 'Stale', published_at: ago(80) }),
      row({ headline: 'Before 0005', published_at: undefined, scanned_at: ago(10) }),
    ]
    const out = await fetchStoredUpdates(contacts)
    expect(out.map(u => u.headline)).toEqual(['Fresh', 'Before 0005'])
  })

  it("shows a birthday only on the person's birthday", async () => {
    H.rows = [
      row({ theme_category: 'birthday', headline: "It's Ann's birthday today", published_at: ago(30) }),
      row({ contact_id: '2', contact_name: 'Bo Park', theme_category: 'birthday', headline: "It's Bo's birthday today" }),
    ]
    const out = await fetchStoredUpdates(contacts)
    expect(out.map(u => u.headline)).toEqual(["It's Ann's birthday today"])
  })

  it("takes a favor's note from the scorer, and never builds one from keywords", async () => {
    H.rows = [
      row({ headline: 'Lakers 2027 schedule released', score: 40, above_bar: false, draft_message: 'Ann, the schedule is out.' }),
      row({ headline: 'Report: Lakers ranked', score: 40, above_bar: false, draft_message: null }),
      row({ headline: 'Off-topic guide', score: 15, above_bar: false, relevant: false, draft_message: 'Ann, look.' }),
    ]
    const out = await fetchStoredUpdates(contacts)
    expect(out.map(u => [u.headline, !!u.giveable, u.giveMessage])).toEqual([
      ['Lakers 2027 schedule released', true, 'Ann, the schedule is out.'],
      ['Report: Lakers ranked', false, undefined],
      ['Off-topic guide', false, undefined],
    ])
  })

  it('falls back to a plain check-in that never quotes the headline when a reason has no draft', async () => {
    H.rows = [row({ headline: 'Three hurt in arena fire', draft_message: null })]
    const [u] = await fetchStoredUpdates(contacts)
    expect(u.draftMessage).toBe('Hey Ann, this made me think of you. How are you doing?')
    expect(u.draftMessage).not.toContain('arena')
  })
})
