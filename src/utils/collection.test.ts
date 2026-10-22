import { beforeEach, describe, expect, it } from 'vitest'
import type { ItemRecord } from '../types'
import { EMPTY_COLLECTION_FILTER, filterAndSortItems, loadCollectionViewState, saveCollectionViewState } from './collection'

function item(id: string, color: string, date: string, price: number): ItemRecord {
  const now = new Date('2026-10-21T00:00:00.000Z')
  return {
    id, name: `アイテム${id}`, brand: 'TEST', categoryId: 'tops', size: '', color, materials: [],
    originalPrice: null, purchasePrice: price, purchaseDate: date, purchaseMethod: '実店舗', purchaseSource: '', notes: '', isFavorite: false,
    ownershipStatus: 'owned', coverImageId: null, createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 2,
  }
}

describe('collection view', () => {
  beforeEach(() => localStorage.clear())

  it('filters by color and purchase period, then sorts the result', () => {
    const items = [item('1', 'ブラック', '2025-03-01', 10000), item('2', 'ブラック', '2026-05-01', 20000), item('3', 'ホワイト', '2026-06-01', 30000)]
    const result = filterAndSortItems(items, '', { ...EMPTY_COLLECTION_FILTER, color: 'ブラック', purchaseDateFrom: '2026-01-01', purchaseDateTo: '2026-12-31' }, 'price-high')
    expect(result.map((value) => value.id)).toEqual(['2'])
  })

  it('restores the search, filters and sort order after reopening', () => {
    saveCollectionViewState({ query: 'コート', sort: 'brand', filter: { ...EMPTY_COLLECTION_FILTER, color: 'ネイビー', favoriteOnly: true } })
    expect(loadCollectionViewState()).toMatchObject({ query: 'コート', sort: 'brand', filter: { color: 'ネイビー', favoriteOnly: true } })
  })

  it('filters by purchase source and values that are not set', () => {
    const items = [
      { ...item('1', '', '2026-01-01', 10000), brand: '', purchaseSource: '' },
      { ...item('2', '', '2026-01-01', 10000), brand: 'TEST', purchaseSource: '公式ストア' },
    ]
    expect(filterAndSortItems(items, '', { ...EMPTY_COLLECTION_FILTER, purchaseSource: '公式ストア' }, 'name').map((value) => value.id)).toEqual(['2'])
    expect(filterAndSortItems(items, '', { ...EMPTY_COLLECTION_FILTER, brand: '__unset__' }, 'name').map((value) => value.id)).toEqual(['1'])
  })
})
