import { describe, expect, it } from 'vitest'
import type { ItemRecord } from '../types'
import { filterItemsByYear, groupInsightRows, purchaseYears, summarizePurchases } from './insights'

function item(id: string, purchaseDate: string | null, purchasePrice: number | null, originalPrice: number | null, brand = 'TEST'): ItemRecord {
  const now = new Date('2026-10-22T00:00:00.000Z')
  return {
    id, name: id, brand, categoryId: 'tops', size: '', color: '', materials: [], measurements: {}, originalPrice, purchasePrice, purchaseDate,
    purchaseMethod: '実店舗', purchaseSource: '店舗', notes: '', isFavorite: false, ownershipStatus: 'owned', coverImageId: null,
    createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 3,
  }
}

describe('insight calculations', () => {
  const items = [
    item('a', '2026-01-10', 8000, 10000, 'A'),
    item('b', '2026-02-10', 10000, 10000, 'A'),
    item('c', '2025-03-10', 15000, 20000, 'B'),
    item('d', null, null, null, 'B'),
  ]

  it('lists available years and filters by purchase year', () => {
    expect(purchaseYears(items)).toEqual(['2026', '2025'])
    expect(filterItemsByYear(items, '2026').map((value) => value.id)).toEqual(['a', 'b'])
    expect(filterItemsByYear(items, 'all')).toHaveLength(4)
  })

  it('calculates spend, savings and weighted discount rate', () => {
    expect(summarizePurchases(items)).toMatchObject({
      itemCount: 4, pricedCount: 3, total: 33000, average: 11000, savings: 7000, discountRate: 17.5, discountEligibleCount: 3,
    })
  })

  it('groups counts and spend in descending order', () => {
    expect(groupInsightRows(items, (value) => value.brand)).toEqual([
      { label: 'B', count: 2, amount: 15000 },
      { label: 'A', count: 2, amount: 18000 },
    ].sort((a, b) => b.amount - a.amount))
  })
})
