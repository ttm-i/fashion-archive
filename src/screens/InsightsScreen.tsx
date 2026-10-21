import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppHeader } from '../components/AppHeader'
import { db } from '../db'
import type { ItemRecord } from '../types'
import { formatYen } from '../utils/format'

interface Row { label: string; count: number; amount: number }

export function InsightsScreen() {
  const items = useLiveQuery(() => db.items.filter((item) => item.deletedAt === null).toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const priced = items.filter((item) => item.purchasePrice !== null)
  const total = priced.reduce((sum, item) => sum + (item.purchasePrice ?? 0), 0)
  const average = priced.length ? Math.round(total / priced.length) : 0

  const categoryRows = useMemo(() => groupRows(items, (item) => item.categoryId ? categoryNames.get(item.categoryId) ?? '未設定' : '未設定'), [items, categoryNames])
  const brandRows = useMemo(() => groupRows(items, (item) => item.brand || '未設定').slice(0, 8), [items])
  const monthRows = useMemo(() => groupRows(items.filter((item) => item.purchaseDate), (item) => item.purchaseDate!.slice(0, 7)).sort((a, b) => b.label.localeCompare(a.label)).slice(0, 12), [items])
  const methodRows = useMemo(() => groupRows(items, (item) => item.purchaseMethod || '未設定'), [items])

  return (
    <main className="screen screen--with-nav insights-screen">
      <AppHeader title="インサイト" />
      <section className="insights-heading"><span>YOUR WARDROBE IN NUMBERS</span><h1>インサイト</h1><p>コレクションの輪郭を、数字で眺めます。</p></section>
      <section className="stat-grid">
        <article><span>COLLECTION</span><strong>{items.length}</strong><p>pieces</p></article>
        <article><span>TOTAL SPEND</span><strong>{formatYen(total)}</strong><p>{priced.length} items with price</p></article>
        <article><span>AVERAGE</span><strong>{formatYen(average)}</strong><p>per priced item</p></article>
      </section>
      {items.length === 0 ? <section className="empty-state compact"><h2>統計はアイテム登録後に表示されます</h2></section> : <>
        <InsightSection title="月ごとの購入" rows={monthRows} />
        <InsightSection title="カテゴリー" rows={categoryRows} showCount />
        <InsightSection title="ブランド" rows={brandRows} showCount />
        <InsightSection title="購入方法" rows={methodRows} showCount />
      </>}
    </main>
  )
}

function groupRows(items: ItemRecord[], label: (item: ItemRecord) => string): Row[] {
  const map = new Map<string, Row>()
  for (const item of items) {
    const key = label(item)
    const row = map.get(key) ?? { label: key, count: 0, amount: 0 }
    row.count += 1
    row.amount += item.purchasePrice ?? 0
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || b.count - a.count)
}

function InsightSection({ title, rows, showCount = false }: { title: string; rows: Row[]; showCount?: boolean }) {
  const max = Math.max(...rows.map((row) => row.amount), 1)
  return <section className="insight-section"><h2>{title}</h2>{rows.length === 0 ? <p className="muted">集計できるデータがありません。</p> : <div className="insight-list">{rows.map((row) => <div className="insight-row" key={row.label}><div className="insight-row__head"><span>{row.label}</span><strong>{showCount && `${row.count}点 · `}{formatYen(row.amount)}</strong></div><div className="insight-bar"><span style={{ width: `${Math.max(row.amount ? 5 : 0, row.amount / max * 100)}%` }} /></div></div>)}</div>}</section>
}
