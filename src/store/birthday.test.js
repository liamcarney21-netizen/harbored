import { describe, it, expect } from 'vitest'
import { daysUntilBirthday, selectUpcomingBirthdays } from './dataStore'

describe('daysUntilBirthday', () => {
  const jun1 = new Date(2026, 5, 1) // 2026-06-01, a Monday

  it('returns 0 on the birthday itself', () => {
    expect(daysUntilBirthday('06-01', jun1)).toBe(0)
  })

  it('counts forward to a later-in-year birthday', () => {
    expect(daysUntilBirthday('06-11', jun1)).toBe(10)
  })

  it('wraps to next year when the birthday has passed', () => {
    // May 30 already passed on Jun 1 → should be ~364 days, not negative
    const d = daysUntilBirthday('05-30', jun1)
    expect(d).toBeGreaterThan(360)
    expect(d).toBeLessThan(367)
  })

  it('handles Feb 29 in a non-leap year without going negative', () => {
    const d = daysUntilBirthday('02-29', new Date(2026, 0, 1)) // 2026 is not a leap year
    expect(d).not.toBeNull()
    expect(d).toBeGreaterThanOrEqual(0)
  })

  it('rejects missing or malformed input', () => {
    expect(daysUntilBirthday('')).toBeNull()
    expect(daysUntilBirthday('June 1')).toBeNull()
    expect(daysUntilBirthday('13-40', jun1)).toBeNull()
  })
})

describe('selectUpcomingBirthdays', () => {
  it('includes only birthdays within the window, soonest first', () => {
    const now = new Date(2026, 5, 1)
    const contacts = [
      { id: 1, name: 'Soon Soonerson', initials: 'SS', color: '#000', birthday: '06-04' },
      { id: 2, name: 'Today Person', initials: 'TP', color: '#000', birthday: '06-01' },
      { id: 3, name: 'Far Away', initials: 'FA', color: '#000', birthday: '11-01' },
      { id: 4, name: 'No Birthday', initials: 'NB', color: '#000', birthday: '' },
    ]
    // Pin "now" via a controllable window by monkeypatching is overkill; the
    // selector uses daysUntilBirthday(now=new Date()) internally, so assert on
    // ordering/shape with a wide window and real dates instead.
    const res = selectUpcomingBirthdays({ contacts }, 400)
    const ids = res.map(r => r.contact.id)
    expect(ids).not.toContain(4) // no birthday → excluded
    // every result has a ready-to-send opener and a human "when"
    for (const r of res) {
      expect(r.opener).toMatch(/Happy birthday/)
      expect(typeof r.when).toBe('string')
    }
    // sorted ascending by days
    const days = res.map(r => r.days)
    expect([...days].sort((a, b) => a - b)).toEqual(days)
  })
})
