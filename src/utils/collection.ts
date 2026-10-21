import type { ItemRecord, SortMode } from '../types'

export interface CollectionFilter {
  categoryId: string
  brand: string
  color: string
  purchaseDateFrom: string
  purchaseDateTo: string
  purchaseMethod: string
  favoriteOnly: boolean
  minPrice: string
  maxPrice: string
}

export interface CollectionViewState {
  query: string
  sort: SortMode
  filter: CollectionFilter
}

export const EMPTY_COLLECTION_FILTER: CollectionFilter = {
  categoryId: '', brand: '', color: '', purchaseDateFrom: '', purchaseDateTo: '', purchaseMethod: '', favoriteOnly: false, minPrice: '', maxPrice: '',
}

export const DEFAULT_COLLECTION_VIEW: CollectionViewState = {
  query: '', sort: 'purchase-newest', filter: EMPTY_COLLECTION_FILTER,
}

const STORAGE_KEY = 'fashionArchive.collectionView.v1'
const SORT_MODES = new Set<SortMode>(['purchase-newest', 'purchase-oldest', 'created-newest', 'name', 'brand', 'price-high', 'price-low'])

export function loadCollectionViewState(): CollectionViewState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<CollectionViewState>
    const rawFilter = stored.filter && typeof stored.filter === 'object' ? stored.filter : {}
    return {
      query: typeof stored.query === 'string' ? stored.query : '',
      sort: stored.sort && SORT_MODES.has(stored.sort) ? stored.sort : DEFAULT_COLLECTION_VIEW.sort,
      filter: {
        ...EMPTY_COLLECTION_FILTER,
        ...Object.fromEntries(Object.keys(EMPTY_COLLECTION_FILTER).map((key) => {
          const value = (rawFilter as Record<string, unknown>)[key]
          return [key, key === 'favoriteOnly' ? value === true : typeof value === 'string' ? value : '']
        })),
      },
    }
  } catch {
    return { ...DEFAULT_COLLECTION_VIEW, filter: { ...EMPTY_COLLECTION_FILTER } }
  }
}

export function saveCollectionViewState(state: CollectionViewState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function nullableDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).getTime() : null
}

function withNullLast(a: number | null, b: number | null, direction: 1 | -1) {
  if (a === null) return 1
  if (b === null) return -1
  return (a - b) * direction
}

export function filterAndSortItems(items: ItemRecord[], query: string, filter: CollectionFilter, mode: SortMode) {
  const normalized = query.trim().toLocaleLowerCase('ja')
  const min = filter.minPrice ? Number(filter.minPrice) : null
  const max = filter.maxPrice ? Number(filter.maxPrice) : null
  const result = items.filter((item) => {
    const haystack = [item.name, item.brand, item.color, item.purchaseSource, item.notes].join(' ').toLocaleLowerCase('ja')
    if (normalized && !haystack.includes(normalized)) return false
    if (filter.categoryId && item.categoryId !== filter.categoryId) return false
    if (filter.brand && item.brand !== filter.brand) return false
    if (filter.color && item.color !== filter.color) return false
    if (filter.purchaseDateFrom && (!item.purchaseDate || item.purchaseDate < filter.purchaseDateFrom)) return false
    if (filter.purchaseDateTo && (!item.purchaseDate || item.purchaseDate > filter.purchaseDateTo)) return false
    if (filter.purchaseMethod && item.purchaseMethod !== filter.purchaseMethod) return false
    if (filter.favoriteOnly && !item.isFavorite) return false
    if (min !== null && (item.purchasePrice === null || item.purchasePrice < min)) return false
    if (max !== null && (item.purchasePrice === null || item.purchasePrice > max)) return false
    return true
  })
  return result.sort((a, b) => {
    if (mode === 'purchase-newest') return withNullLast(nullableDate(a.purchaseDate), nullableDate(b.purchaseDate), -1)
    if (mode === 'purchase-oldest') return withNullLast(nullableDate(a.purchaseDate), nullableDate(b.purchaseDate), 1)
    if (mode === 'created-newest') return b.createdAt.getTime() - a.createdAt.getTime()
    if (mode === 'name') return a.name.localeCompare(b.name, 'ja')
    if (mode === 'brand') return a.brand.localeCompare(b.brand, 'ja')
    if (mode === 'price-high') return withNullLast(a.purchasePrice, b.purchasePrice, -1)
    return withNullLast(a.purchasePrice, b.purchasePrice, 1)
  })
}

export function hasCollectionConditions(query: string, filter: CollectionFilter) {
  return Boolean(query.trim()) || Object.entries(filter).some(([key, value]) => key === 'favoriteOnly' ? value === true : value !== '')
}
