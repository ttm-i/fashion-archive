import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { db } from '../db'
import { navigate } from '../hooks/useRoute'
import { formatYen } from '../utils/format'
import { filterItemsByYear, groupInsightRows, purchaseYears, summarizePurchases, type InsightRow } from '../utils/insights'
import { EMPTY_COLLECTION_FILTER, saveCollectionViewState, type CollectionFilter } from '../utils/collection'

export function InsightsScreen() {
  const items = useLiveQuery(() => db.items.filter((item) => item.deletedAt === null && item.ownershipStatus !== 'wanted').toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])
  const [year, setYear] = useState('all')
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const categoryIds = useMemo(() => new Map(categories.map((category) => [category.name, category.id])), [categories])
  const years = useMemo(() => purchaseYears(items), [items])
  const periodItems = useMemo(() => filterItemsByYear(items, year), [items, year])
  const summary = useMemo(() => summarizePurchases(periodItems), [periodItems])

  const categoryRows = useMemo(() => groupInsightRows(periodItems, (item) => item.categoryId ? categoryNames.get(item.categoryId) ?? '未設定' : '未設定'), [periodItems, categoryNames])
  const brandRows = useMemo(() => groupInsightRows(periodItems, (item) => item.brand || '未設定'), [periodItems])
  const monthRows = useMemo(() => groupInsightRows(periodItems.filter((item) => item.purchaseDate), (item) => item.purchaseDate!.slice(0, 7)).sort((a, b) => b.label.localeCompare(a.label)), [periodItems])
  const colorRows = useMemo(() => groupInsightRows(periodItems, (item) => item.color || '未設定'), [periodItems])
  const methodRows = useMemo(() => groupInsightRows(periodItems, (item) => item.purchaseMethod || '未設定'), [periodItems])
  const sourceRows = useMemo(() => groupInsightRows(periodItems, (item) => item.purchaseSource || '未設定'), [periodItems])
  const openCollection = (filter: Partial<CollectionFilter>) => {
    const periodFilter = year === 'all' ? {} : { purchaseDateFrom: `${year}-01-01`, purchaseDateTo: `${year}-12-31` }
    saveCollectionViewState({ query: '', sort: 'purchase-newest', filter: { ...EMPTY_COLLECTION_FILTER, ...periodFilter, ...filter } })
    navigate('collection')
  }
  const filterValue = (label: string) => label === '未設定' ? '__unset__' : label

  return (
    <main className="screen screen--with-nav insights-screen">
      <AppHeader title="インサイト" />
      <section className="insights-heading"><span>YOUR WARDROBE IN NUMBERS</span><h1>インサイト</h1><p>コレクションの輪郭を、数字で眺めます。</p></section>
      <section className="insights-period"><label htmlFor="insight-year"><span>集計期間</span><select id="insight-year" value={year} onChange={(event) => setYear(event.target.value)}><option value="all">全期間</option>{years.map((value) => <option value={value} key={value}>{value}年</option>)}</select></label><p>{year === 'all' ? '購入日未登録のアイテムも点数に含みます' : `${year}年に購入したアイテムを集計`}</p></section>
      <section className="stat-grid">
        <article><span>COLLECTION</span><strong>{summary.itemCount}</strong><p>pieces</p></article>
        <article><span>TOTAL SPEND</span><strong>{formatYen(summary.total)}</strong><p>価格登録 {summary.pricedCount}点</p></article>
        <article><span>AVERAGE</span><strong>{formatYen(summary.average)}</strong><p>平均購入単価</p></article>
        <article><span>TOTAL SAVED</span><strong>{formatYen(summary.savings)}</strong><p>定価との差額</p></article>
        <article><span>DISCOUNT RATE</span><strong>{summary.discountRate}%</strong><p>定価・購入価格登録 {summary.discountEligibleCount}点</p></article>
      </section>
      {periodItems.length === 0 ? <section className="empty-state compact"><h2>{items.length === 0 ? '統計はアイテム登録後に表示されます' : 'この期間のアイテムはありません'}</h2></section> : <>
        <InsightSection title="月ごとの購入" rows={monthRows} showCount limit={12} formatLabel={formatMonth} onSelect={(row) => openCollection(monthFilter(row.label))} />
        <InsightSection title="カテゴリー" rows={categoryRows} showCount onSelect={(row) => openCollection({ categoryId: row.label === '未設定' ? '__unset__' : categoryIds.get(row.label) ?? '' })} />
        <InsightSection title="ブランド" rows={brandRows} showCount onSelect={(row) => openCollection({ brand: filterValue(row.label) })} />
        <InsightSection title="カラー" rows={colorRows} showCount onSelect={(row) => openCollection({ color: filterValue(row.label) })} />
        <InsightSection title="購入方法" rows={methodRows} showCount onSelect={(row) => openCollection({ purchaseMethod: filterValue(row.label) })} />
        <InsightSection title="購入先" rows={sourceRows} showCount onSelect={(row) => openCollection({ purchaseSource: filterValue(row.label) })} />
      </>}
    </main>
  )
}

function formatMonth(value: string) {
  const [year, month] = value.split('-')
  return `${year}年${Number(month)}月`
}

function monthFilter(value: string): Partial<CollectionFilter> {
  const [year, month] = value.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return { purchaseDateFrom: `${value}-01`, purchaseDateTo: `${value}-${String(lastDay).padStart(2, '0')}` }
}

function InsightSection({ title, rows, showCount = false, formatLabel = (value: string) => value, limit = 8, onSelect }: { title: string; rows: InsightRow[]; showCount?: boolean; formatLabel?: (value: string) => string; limit?: number; onSelect?: (row: InsightRow) => void }) {
  const [expanded, setExpanded] = useState(false)
  const max = Math.max(...rows.map((row) => row.amount), 1)
  const visibleRows = expanded ? rows : rows.slice(0, limit)
  const remainingRows = rows.slice(limit)
  const remainingCount = remainingRows.reduce((sum, row) => sum + row.count, 0)
  const remainingAmount = remainingRows.reduce((sum, row) => sum + row.amount, 0)
  return <section className="insight-section"><h2>{title}</h2>{rows.length === 0 ? <p className="muted">集計できるデータがありません。</p> : <div className="insight-list">{visibleRows.map((row) => {
    const content = <><div className="insight-row__head"><span>{formatLabel(row.label)}</span><strong>{showCount && `${row.count}点 · `}{formatYen(row.amount)}</strong>{onSelect && <ChevronRight aria-hidden="true" />}</div><div className="insight-bar"><span style={{ width: `${Math.max(row.amount ? 5 : 0, row.amount / max * 100)}%` }} /></div></>
    return onSelect ? <button className="insight-row selectable" type="button" key={row.label} onClick={() => onSelect(row)} aria-label={`${formatLabel(row.label)}のアイテムを見る`}>{content}</button> : <div className="insight-row" key={row.label}>{content}</div>
  })}{remainingRows.length > 0 && <button className="insight-expand" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? <><ChevronUp aria-hidden="true" />上位{limit}分類に戻す</> : <><div><strong>その他 {remainingRows.length}分類</strong><span>{remainingCount}点 · {formatYen(remainingAmount)}</span></div><span>すべて表示<ChevronDown aria-hidden="true" /></span></>}</button>}</div>}</section>
}
