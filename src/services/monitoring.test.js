import { describe, it, expect } from 'vitest'
import { holdReasonFor } from './monitoring'

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
