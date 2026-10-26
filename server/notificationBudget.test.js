import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  MAX_STORIES_PER_USER_PER_DAY, MAX_PUSHES_PER_USER_PER_WEEK, CONTACT_COOLDOWN_DAYS,
  PUSH_HOURS, BREAKER_MIN_USERS, BREAKER_SHARE, buildPayload,
} from './pushHandler.js'
import { PUSH_THRESHOLD, SENSITIVE_PUSH_THRESHOLD } from './scoreHandler.js'

// Harbored's promise is that it never turns noisy (CLAUDE.md, "Notification
// budget"). These numbers are product decisions, not tuning knobs: if a change
// needs to loosen one, change this test on purpose and say why in the commit.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('the notification budget', () => {
  it('caps how often anyone hears from Harbored', () => {
    expect(MAX_STORIES_PER_USER_PER_DAY).toBe(2) // bundled into one notification
    expect(MAX_PUSHES_PER_USER_PER_WEEK).toBe(3)
    expect(CONTACT_COOLDOWN_DAYS).toBe(7)
  })

  it('only lands between 8 AM and 9 PM local, and never with a sound', () => {
    expect(PUSH_HOURS).toEqual({ start: 8, end: 21 })
    const aps = buildPayload({ contact_name: 'Ann Lee', headline: 'h', theme_category: 'sports' }, 1).aps
    expect(aps.sound).toBeUndefined()
    expect(aps['interruption-level']).toBeUndefined() // never time-sensitive or critical
  })

  it('only pushes stories that clear the strict bar', () => {
    expect(PUSH_THRESHOLD).toBe(80)
    expect(SENSITIVE_PUSH_THRESHOLD).toBe(90)
  })

  it('runs once a day at 16:00 UTC, and the recap email has no schedule', () => {
    const { crons } = JSON.parse(read('../vercel.json'))
    expect(crons).toEqual([{ path: '/api/scan', schedule: '0 16 * * *' }])
  })

  it('only the morning scan sends pushes: "Check again" and the first scan never do', () => {
    expect(read('./rescanHandler.js')).not.toMatch(/runPush|pushHandler/)
    expect(read('./scanHandler.js')).not.toMatch(/runPush|pushHandler/)
  })

  it('holds a run that would notify most people at once', () => {
    expect(BREAKER_MIN_USERS).toBe(5)
    expect(BREAKER_SHARE).toBe(0.5)
  })
})
