import { describe, it, expect } from 'vitest'
import { isGiveable, holdReasonFor } from './monitoring'

describe('isGiveable', () => {
  it('flags forwardable / resource-y headlines (a "give first" favor)', () => {
    expect(isGiveable('The best guide to Charleston real estate')).toBe(true)
    expect(isGiveable('2027 F1 schedule released')).toBe(true)
    expect(isGiveable('New report: downtown retail trends')).toBe(true)
  })

  it('does not flag hard-news headlines', () => {
    expect(isGiveable('Company acquires rival in $2B deal')).toBe(false)
    expect(isGiveable('Villanova lands five-star transfer guard')).toBe(false)
  })
})

describe('holdReasonFor', () => {
  it('explains near-miss scores as close to the bar', () => {
    expect(holdReasonFor(60)).toMatch(/close to the bar/i)
  })
  it('explains mid scores as routine coverage', () => {
    expect(holdReasonFor(45)).toMatch(/routine coverage/i)
  })
  it('explains low scores as a minor update', () => {
    expect(holdReasonFor(20)).toMatch(/minor update/i)
  })
})
