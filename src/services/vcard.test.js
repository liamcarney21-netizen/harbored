import { describe, it, expect } from 'vitest'
import { parseVCard } from './vcard'
import { SAMPLE_VCARD } from '../data/sampleContacts'

describe('parseVCard', () => {
  it('parses the bundled sample Apple export into 5 contacts', () => {
    const cards = parseVCard(SAMPLE_VCARD)
    expect(cards).toHaveLength(5)
    expect(cards[0]).toMatchObject({
      name: 'Diego Alvarez',
      company: 'Sunbelt Retail Partners',
      role: 'Principal',
      email: 'diego@sunbeltretail.com',
    })
    expect(cards.map(c => c.name)).toContain('Wes Tanaka')
  })

  it('prefers FN, and falls back to N (family;given → "given family")', () => {
    expect(parseVCard('BEGIN:VCARD\nN:Smith;Jane;;;\nEND:VCARD')[0].name).toBe('Jane Smith')
    expect(parseVCard('BEGIN:VCARD\nFN:Janey Smith\nN:Smith;Jane;;;\nEND:VCARD')[0].name).toBe('Janey Smith')
  })

  it('handles RFC 6350 line folding (continuation lines start with a space)', () => {
    const vcf = 'BEGIN:VCARD\nFN:X\nORG:Very Long Company \n Name Inc\nEND:VCARD'
    expect(parseVCard(vcf)[0].company).toBe('Very Long Company Name Inc')
  })

  it('takes only the first ORG component and unescapes commas', () => {
    expect(parseVCard('BEGIN:VCARD\nFN:X\nORG:Acme\\, Inc;R&D\nEND:VCARD')[0].company).toBe('Acme, Inc')
  })

  it('skips cards with no name', () => {
    const vcf = 'BEGIN:VCARD\nEMAIL:noname@example.com\nEND:VCARD\nBEGIN:VCARD\nFN:Has Name\nEND:VCARD'
    const cards = parseVCard(vcf)
    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('Has Name')
  })

  it('returns an empty array for junk input', () => {
    expect(parseVCard('not a vcard at all')).toEqual([])
  })

  it('always returns the full contact shape (empty strings, never undefined)', () => {
    const c = parseVCard('BEGIN:VCARD\nFN:Bare Name\nEND:VCARD')[0]
    expect(c).toEqual({ name: 'Bare Name', role: '', company: '', email: '', phone: '' })
  })
})
