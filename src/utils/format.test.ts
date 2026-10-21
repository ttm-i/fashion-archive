import { describe, expect, it } from 'vitest'
import { formatYen, parseOptionalPrice, uniqueSuggestions } from './format'

describe('format utilities', () => {
  it('formats yen without decimals', () => {
    expect(formatYen(16050)).toContain('16,050')
  })

  it('parses optional prices', () => {
    expect(parseOptionalPrice('12,800')).toBe(12800)
    expect(parseOptionalPrice('')).toBeNull()
    expect(() => parseOptionalPrice('-1')).toThrow()
  })

  it('normalizes suggestion values', () => {
    expect(uniqueSuggestions([' HOKA ', 'HOKA', '', 'HARUTA'])).toEqual(['HARUTA', 'HOKA'])
  })
})
