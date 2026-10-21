import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Heart, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { db, markDataChanged } from '../db'
import { navigate } from '../hooks/useRoute'
import { PURCHASE_METHODS, type ImageRecord, type ItemRecord, type SortMode } from '../types'
import { formatYen } from '../utils/format'
import { ItemImage } from '../components/ItemImage'
import { AppHeader } from '../components/AppHeader'
import { BackupReminder } from '../components/BackupReminder'

const SORT_LABELS: Record<SortMode, string> = {
  'purchase-newest': '購入日の新しい順',
  'purchase-oldest': '購入日の古い順',
  'created-newest': '登録日の新しい順',
  name: '名前順',
  brand: 'ブランド順',
  'price-high': '価格の高い順',
  'price-low': '価格の安い順',
}

interface FilterState {
  categoryId: string
  brand: string
  year: string
  purchaseMethod: string
  favoriteOnly: boolean
  minPrice: string
  maxPrice: string
}

const emptyFilter: FilterState = { categoryId: '', brand: '', year: '', purchaseMethod: '', favoriteOnly: false, minPrice: '', maxPrice: '' }

function sortItems(items: ItemRecord[], mode: SortMode) {
  const copy = [...items]
  const nullableDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).getTime() : null
  const withNullLast = (a: number | null, b: number | null, direction: 1 | -1) => {
    if (a === null) return 1
    if (b === null) return -1
    return (a - b) * direction
  }
  return copy.sort((a, b) => {
    if (mode === 'purchase-newest') return withNullLast(nullableDate(a.purchaseDate), nullableDate(b.purchaseDate), -1)
    if (mode === 'purchase-oldest') return withNullLast(nullableDate(a.purchaseDate), nullableDate(b.purchaseDate), 1)
    if (mode === 'created-newest') return b.createdAt.getTime() - a.createdAt.getTime()
    if (mode === 'name') return a.name.localeCompare(b.name, 'ja')
    if (mode === 'brand') return a.brand.localeCompare(b.brand, 'ja')
    if (mode === 'price-high') return withNullLast(a.purchasePrice, b.purchasePrice, -1)
    return withNullLast(a.purchasePrice, b.purchasePrice, 1)
  })
}

export function CollectionScreen() {
  const items = useLiveQuery(() => db.items.filter((item) => item.deletedAt === null).toArray(), [], [])
  const images = useLiveQuery(() => db.images.toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [], [])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('purchase-newest')
  const [filter, setFilter] = useState<FilterState>(emptyFilter)
  const [draftFilter, setDraftFilter] = useState<FilterState>(emptyFilter)
  const [filterOpen, setFilterOpen] = useState(false)
  const restoredScroll = useRef(false)

  useEffect(() => {
    if (restoredScroll.current || items.length === 0) return
    restoredScroll.current = true
    const stored = sessionStorage.getItem('collectionScrollY')
    if (!stored) return
    sessionStorage.removeItem('collectionScrollY')
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: Number(stored) || 0 })))
  }, [items.length])

  const imageMap = useMemo(() => new Map(images.map((image) => [image.id, image])), [images])
  const brands = useMemo(() => [...new Set(items.map((item) => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja')), [items])
  const years = useMemo(() => [...new Set(items.map((item) => item.purchaseDate?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(), [items])
  const activeFilterCount = Object.entries(filter).filter(([key, value]) => key === 'favoriteOnly' ? value === true : value !== '').length

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ja')
    const min = filter.minPrice ? Number(filter.minPrice) : null
    const max = filter.maxPrice ? Number(filter.maxPrice) : null
    const result = items.filter((item) => {
      const haystack = [item.name, item.brand, item.color, item.purchaseSource, item.notes].join(' ').toLocaleLowerCase('ja')
      if (normalized && !haystack.includes(normalized)) return false
      if (filter.categoryId && item.categoryId !== filter.categoryId) return false
      if (filter.brand && item.brand !== filter.brand) return false
      if (filter.year && item.purchaseDate?.slice(0, 4) !== filter.year) return false
      if (filter.purchaseMethod && item.purchaseMethod !== filter.purchaseMethod) return false
      if (filter.favoriteOnly && !item.isFavorite) return false
      if (min !== null && (item.purchasePrice === null || item.purchasePrice < min)) return false
      if (max !== null && (item.purchasePrice === null || item.purchasePrice > max)) return false
      return true
    })
    return sortItems(result, sort)
  }, [items, query, filter, sort])

  const openFilters = () => {
    setDraftFilter(filter)
    setFilterOpen(true)
  }

  return (
    <main className="screen screen--with-nav collection-screen">
      <AppHeader title="コレクション" />
      <section className="collection-heading">
        <div><h1>コレクション</h1><p>{filtered.length === items.length ? `${items.length} pieces` : `${filtered.length} / ${items.length} pieces`}</p></div>
      </section>
      <BackupReminder />

      <label className="search-field">
        <Search aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="アイテム名、ブランドなど" aria-label="アイテムを検索" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="検索をクリア"><X aria-hidden="true" /></button>}
      </label>

      <div className="collection-tools">
        <button className={activeFilterCount ? 'filter-button active' : 'filter-button'} type="button" onClick={openFilters}>
          <SlidersHorizontal aria-hidden="true" />絞り込み{activeFilterCount > 0 && <span>{activeFilterCount}</span>}
        </button>
        <label className="sort-select">
          <span className="sr-only">並べ替え</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            {Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <section className="empty-state">
          <span>ARCHIVE</span>
          <h2>{items.length === 0 ? '最初の一着を記録しましょう' : '条件に合うアイテムがありません'}</h2>
          <p>{items.length === 0 ? '写真と名前だけでも登録できます。' : '検索語や絞り込み条件を変更してください。'}</p>
          {items.length === 0 && <button className="primary-button" type="button" onClick={() => navigate('new')}>アイテムを登録</button>}
        </section>
      ) : (
        <section className="item-grid" aria-label="アイテム一覧">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} image={item.coverImageId ? imageMap.get(item.coverImageId) : undefined} />
          ))}
        </section>
      )}

      <button className="floating-add" type="button" onClick={() => navigate('new')} aria-label="新しいアイテムを登録"><Plus aria-hidden="true" /></button>

      {filterOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setFilterOpen(false)}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
            <div className="sheet-handle" />
            <header><h2 id="filter-title">絞り込み</h2><button className="icon-button" type="button" onClick={() => setFilterOpen(false)} aria-label="閉じる"><X aria-hidden="true" /></button></header>
            <div className="form-stack compact">
              <label><span>カテゴリー</span><select value={draftFilter.categoryId} onChange={(event) => setDraftFilter({ ...draftFilter, categoryId: event.target.value })}><option value="">すべて</option>{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><span>ブランド</span><select value={draftFilter.brand} onChange={(event) => setDraftFilter({ ...draftFilter, brand: event.target.value })}><option value="">すべて</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
              <label><span>購入年</span><select value={draftFilter.year} onChange={(event) => setDraftFilter({ ...draftFilter, year: event.target.value })}><option value="">すべて</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
              <label><span>購入方法</span><select value={draftFilter.purchaseMethod} onChange={(event) => setDraftFilter({ ...draftFilter, purchaseMethod: event.target.value })}><option value="">すべて</option>{PURCHASE_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
              <div className="field-pair"><label><span>最低価格</span><input inputMode="numeric" value={draftFilter.minPrice} onChange={(event) => setDraftFilter({ ...draftFilter, minPrice: event.target.value.replace(/\D/g, '') })} placeholder="¥0" /></label><label><span>最高価格</span><input inputMode="numeric" value={draftFilter.maxPrice} onChange={(event) => setDraftFilter({ ...draftFilter, maxPrice: event.target.value.replace(/\D/g, '') })} placeholder="上限なし" /></label></div>
              <label className="switch-row"><span>お気に入りのみ</span><input type="checkbox" checked={draftFilter.favoriteOnly} onChange={(event) => setDraftFilter({ ...draftFilter, favoriteOnly: event.target.checked })} /></label>
            </div>
            <div className="sheet-actions"><button className="secondary-button" type="button" onClick={() => setDraftFilter(emptyFilter)}>すべてクリア</button><button className="primary-button" type="button" onClick={() => { setFilter(draftFilter); setFilterOpen(false) }}>絞り込みを適用</button></div>
          </section>
        </div>
      )}
    </main>
  )
}

function ItemCard({ item, image }: { item: ItemRecord; image?: ImageRecord }) {
  const openDetail = () => {
    sessionStorage.setItem('collectionScrollY', String(window.scrollY))
    navigate(`item/${item.id}`)
  }
  const toggleFavorite = async (event: React.MouseEvent) => {
    event.stopPropagation()
    await db.items.update(item.id, { isFavorite: !item.isFavorite, updatedAt: new Date() })
    await markDataChanged()
  }
  return (
    <article className="item-card" role="button" tabIndex={0} onClick={openDetail} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail() } }}>
      <div className="item-card__photo">
        <ItemImage blob={image?.thumbnailBlob} alt={item.name} />
        <button className={item.isFavorite ? 'favorite-button active' : 'favorite-button'} type="button" onClick={toggleFavorite} aria-label={item.isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}>
          <Heart aria-hidden="true" fill={item.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      {item.brand && <span className="item-card__brand">{item.brand}</span>}
      <div className="item-card__line"><h2>{item.name}</h2>{item.purchasePrice !== null && <strong>{formatYen(item.purchasePrice)}</strong>}</div>
    </article>
  )
}
