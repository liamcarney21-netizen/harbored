import { describe, it, expect } from 'vitest'
import { buildEmailHtml } from './digestHandler.js'

const items = [
  { contact_name: 'Diego Alvarez', theme_label: 'Retail Leasing', headline: 'Downtown vacancy hits a low', rationale: 'A concrete market shift worth a note.' },
]

describe('buildEmailHtml', () => {
  it('renders the greeting, contact, theme, headline, and rationale', () => {
    const html = buildEmailHtml('Liam', items)
    expect(html).toContain('Hi Liam')
    expect(html).toContain('Diego Alvarez')
    expect(html).toContain('Retail Leasing')
    expect(html).toContain('Downtown vacancy hits a low')
    expect(html).toContain('A concrete market shift worth a note.')
  })

  it('escapes HTML in user-derived content (no injection)', () => {
    const html = buildEmailHtml('', [
      { contact_name: '<script>alert(1)</script>', theme_label: 'x', headline: 'a & b', rationale: '' },
    ])
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('a &amp; b')
  })

  it('pluralizes the count line', () => {
    expect(buildEmailHtml('X', items)).toContain('person is')
    expect(buildEmailHtml('X', [...items, ...items])).toContain('people are')
  })

  it('omits the greeting when no first name is known', () => {
    expect(buildEmailHtml('', items)).not.toContain('Hi ')
  })
})
