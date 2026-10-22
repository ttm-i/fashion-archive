import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppHeader } from '../components/AppHeader'
import { db } from '../db'
import { formatYen } from '../utils/format'
import { filterItemsByYear, groupInsightRows, purchaseYears, summarizePurchases, type InsightRow } from '../utils/insights'

export function InsightsScreen() {
  const items = useLiveQuery(() => db.items.filter((item) => item.deletedAt === null && item.ownershipStatus !== 'wanted').toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])
  const [year, setYear] = useState('all')
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const years = useMemo(() => purchaseYears(items), [items])
  const periodItems = useMemo(() => filterItemsByYear(items, year), [items, year])
  const summary = useMemo(() => summarizePurchases(periodItems), [periodItems])

  const categoryRows = useMemo(() => groupInsightRows(periodItems, (item) => item.categoryId ? categoryNames.get(item.categoryId) ?? '未設定' : '未設定'), [periodItems, categoryNames])
  const brandRows = useMemo(() => groupInsightRows(periodItems, (item) => item.brand || '未設定').slice(0, 8), [periodItems])
  const monthRows = useMemo(() => groupInsightRows(periodItems.filter((item) => item.purchaseDate), (item) => item.purchaseDate!.slice(0, 7)).sort((a, b) => b.label.localeCompare(a.label)).slice(0, 12), [periodItems])
  const colorRows = useMemo(() => groupInsightRows(periodItems, (item) => item.color || '未設定').slice(0, 8), [periodItems])
  const methodRows = useMemo(() => groupInsightRows(periodItems, (item) => item.purchaseMethod || '未設定'), [periodItems])
  const sourceRows = useMemo(() => groupInsightRows(periodItems, (item) => item.purchaseSource || '未設定').slice(0, 8), [periodItems])

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
        <InsightSection title="月ごとの購入" rows={monthRows} showCount formatLabel={formatMonth} />
        <InsightSection title="カテゴリー" rows={categoryRows} showCount />
        <InsightSection title="ブランド" rows={brandRows} showCount />
        <InsightSection title="カラー" rows={colorRows} showCount />
        <InsightSection title="購入方法" rows={methodRows} showCount />
        <InsightSection title="購入先" rows={sourceRows} showCount />
      </>}
    </main>
  )
}

function formatMonth(value: string) {
  const [year, month] = value.split('-')
  return `${year}年${Number(month)}月`
}

function InsightSection({ title, rows, showCount = false, formatLabel = (value: string) => value }: { title: string; rows: InsightRow[]; showCount?: boolean; formatLabel?: (value: string) => string }) {
  const max = Math.max(...rows.map((row) => row.amount), 1)
  return <section className="insight-section"><h2>{title}</h2>{rows.length === 0 ? <p className="muted">集計できるデータがありません。</p> : <div className="insight-list">{rows.map((row) => <div className="insight-row" key={row.label}><div className="insight-row__head"><span>{formatLabel(row.label)}</span><strong>{showCount && `${row.count}点 · `}{formatYen(row.amount)}</strong></div><div className="insight-bar"><span style={{ width: `${Math.max(row.amount ? 5 : 0, row.amount / max * 100)}%` }} /></div></div>)}</div>}</section>
}
