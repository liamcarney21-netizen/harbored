import { describe, it, expect } from 'vitest'
import { cleanChoiceLabel, choiceKey, checkedChoices, uncheckedChoices, isPausedTheme, recentNotAbout, CHOICE_LABEL_MAX } from './themeChoices'
import { cleanRelation, relationLabel } from './relations'

const NOW = Date.parse('2026-10-27T17:00:00Z')
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString()

describe('theme choices', () => {
  it('cleans a label to one line and refuses one that is too long', () => {
    expect(cleanChoiceLabel('  Wildfires\n&  storms ')).toBe('Wildfires & storms')
    expect(cleanChoiceLabel('x'.repeat(CHOICE_LABEL_MAX))).toHaveLength(CHOICE_LABEL_MAX)
    expect(cleanChoiceLabel('x'.repeat(CHOICE_LABEL_MAX + 1))).toBe('')
    expect(cleanChoiceLabel({ label: 'no' })).toBe('')
  })

  it('treats case, spacing, punctuation and "&" versus "and" as the same choice', () => {
    expect(choiceKey('Wildfires & storms')).toBe(choiceKey('wildfires and storms'))
    expect(choiceKey("Local teams' big moments")).toBe(choiceKey('Local teams big moments'))
    expect(choiceKey('Big games')).not.toBe(choiceKey('Big game day'))
  })

  it('keeps only checked choices, once each, at most six', () => {
    const list = [
      { label: 'Wildfires & storms', on: true },
      { label: 'Big local events', on: false },
      { label: 'wildfires and storms', on: true },
      { label: 'Real estate', on: 'yes' },
      'Big games',
      null,
      ...['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map(label => ({ label, on: true })),
    ]
    expect(checkedChoices(list)).toEqual(['Wildfires & storms', 'Big games', 'A1', 'A2', 'A3', 'A4'])
    expect(checkedChoices('Wildfires')).toEqual([])
  })

  it('lists the unchecked choices once each, never one that is also checked', () => {
    const list = [
      { label: 'Big games', on: true },
      { label: 'Records & milestones', on: false },
      { label: 'big games', on: false },
      { label: 'Coaching changes' },
      { label: 'records and milestones', on: false },
      'Trades & signings',
    ]
    expect(uncheckedChoices(list)).toEqual(['Records & milestones', 'Coaching changes'])
    expect(uncheckedChoices(['Big games'])).toEqual([])
  })

  it('pauses a theme only when it has choices and none is checked', () => {
    expect(isPausedTheme({ textAbout: [{ label: 'Big games', on: false }] })).toBe(true)
    expect(isPausedTheme({ textAbout: [{ label: 'Big games', on: true }] })).toBe(false)
    expect(isPausedTheme({ textAbout: [] })).toBe(false)
    expect(isPausedTheme({})).toBe(false)
    expect(isPausedTheme({ textAbout: [{ label: 'x'.repeat(99), on: false }] })).toBe(false)
  })

  it('keeps the newest five dated not-about headlines from the last 60 days', () => {
    const list = [
      ...[1, 2, 3, 4, 5, 6].map(n => ({ headline: `Story ${n}`, at: daysAgo(n) })),
      { headline: 'Too old', at: daysAgo(61) },
      { headline: 'Undated' },
      { headline: '   ', at: daysAgo(1) },
    ]
    expect(recentNotAbout(list, NOW)).toEqual(['Story 1', 'Story 2', 'Story 3', 'Story 4', 'Story 5'])
    expect(recentNotAbout(null, NOW)).toEqual([])
  })
})

describe('relations', () => {
  it('knows the six ways the person can know someone, and nothing else', () => {
    expect(['family', 'friend', 'teammate', 'classmate', 'coworker', 'work'].map(cleanRelation)).toEqual(['family', 'friend', 'teammate', 'classmate', 'coworker', 'work'])
    expect(cleanRelation('boss')).toBeUndefined()
    expect(cleanRelation({ id: 'family' })).toBeUndefined()
    expect(relationLabel('work')).toBe('Work contact')
    expect(relationLabel('nope')).toBeUndefined()
  })
})
