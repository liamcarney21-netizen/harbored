import { describe, it, expect } from 'vitest'
import { runPush } from './pushHandler.js'
import { runDigest } from './digestHandler.js'

// Minimal Supabase stub: every query-builder method chains and the builder is
// awaitable, resolving to a preset result per table. Enough for the preview-mode
// read paths (which never write).
function mockSupabase(byTable, users = []) {
  return {
    from(table) {
      const result = byTable[table] ?? { data: [], error: null }
      const b = {}
      for (const m of ['select', 'eq', 'is', 'in', 'gte', 'order', 'update', 'delete', 'insert', 'upsert']) {
        b[m] = () => b
      }
      b.then = (resolve) => resolve(result)
      return b
    },
    auth: { admin: { listUsers: async () => ({ data: { users }, error: null }) } },
  }
}

describe('runPush (preview)', () => {
  it('targets only users with a device token, counts the rest as no-device', async () => {
    const supabase = mockSupabase({
      scan_results: {
        data: [
          { id: 'r1', user_id: 'u1', contact_name: 'Kellan Carney', headline: 'Big fintech news', score: 78 },
          { id: 'r2', user_id: 'u2', contact_name: 'Sarah Chen', headline: 'F1 news', score: 80 },
        ],
        error: null,
      },
      device_tokens: { data: [{ user_id: 'u1', token: 'tok-1' }], error: null },
    })
    const summary = await runPush(supabase, { send: false })
    expect(summary.usersWithNew).toBe(2)
    expect(summary.usersNoDevice).toBe(1)
    expect(summary.devicesPushed).toBe(0) // preview never sends
    expect(summary.previews).toHaveLength(1)
    expect(summary.previews[0].title).toBe('Reach out to Kellan Carney')
  })

  it('does nothing when there are no new opportunities', async () => {
    const supabase = mockSupabase({ scan_results: { data: [], error: null } })
    const summary = await runPush(supabase, { send: false })
    expect(summary.usersWithNew).toBe(0)
    expect(summary.previews).toHaveLength(0)
  })
})

describe('runDigest (preview)', () => {
  it('groups new opportunities per user and resolves their email', async () => {
    const supabase = mockSupabase(
      {
        scan_results: {
          data: [
            { id: 'r1', user_id: 'u1', contact_name: 'Kellan Carney', theme_label: 'Fintech', headline: 'News', rationale: 'why' },
          ],
          error: null,
        },
      },
      [{ id: 'u1', email: 'kellan@example.com', user_metadata: { name: 'Kellan Carney' } }],
    )
    const summary = await runDigest(supabase, { send: false })
    expect(summary.usersWithOpportunities).toBe(1)
    expect(summary.previews).toHaveLength(1)
    expect(summary.previews[0].to).toContain('@example.com')
  })

  it('skips users whose email cannot be resolved', async () => {
    const supabase = mockSupabase(
      { scan_results: { data: [{ id: 'r1', user_id: 'u1', contact_name: 'X', theme_label: 't', headline: 'h', rationale: '' }], error: null } },
      [], // no users → no email
    )
    const summary = await runDigest(supabase, { send: false })
    expect(summary.skippedNoEmail).toBe(1)
    expect(summary.previews).toHaveLength(0)
  })
})
