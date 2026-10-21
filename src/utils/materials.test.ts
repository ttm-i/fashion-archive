import { describe, expect, it } from 'vitest'
import { formatMaterials, parseMaterials } from './materials'

const row = (id: string, name: string, percentage = '') => ({ id, name, percentage })

describe('materials', () => {
  it('accepts material names without percentages', () => {
    expect(parseMaterials([row('1', ' ウール '), row('2', 'ナイロン')])).toEqual([
      { id: '1', name: 'ウール', percentage: null },
      { id: '2', name: 'ナイロン', percentage: null },
    ])
  })

  it('accepts percentages when their total is 100', () => {
    expect(parseMaterials([row('1', 'ウール', '90'), row('2', 'ナイロン', '10')])).toEqual([
      { id: '1', name: 'ウール', percentage: 90 },
      { id: '2', name: 'ナイロン', percentage: 10 },
    ])
  })

  it('rejects incomplete or invalid percentages', () => {
    expect(() => parseMaterials([row('1', 'ウール', '80'), row('2', 'ナイロン')])).toThrow('ナイロンの混率')
    expect(() => parseMaterials([row('1', 'ウール', '80'), row('2', 'ナイロン', '10')])).toThrow('合計100%')
  })

  it('formats materials for CSV export', () => {
    expect(formatMaterials([{ id: '1', name: '綿', percentage: 100 }])).toBe('綿 100%')
  })
})
