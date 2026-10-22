import type { ItemRecord } from '../types'

export interface InsightRow {
  label: string
  count: number
  amount: number
}

export function purchaseYears(items: ItemRecord[]) {
  return [...new Set(items.map((item) => item.purchaseDate?.slice(0, 4)).filter((year): year is string => Boolean(year)))]
    .sort((a, b) => b.localeCompare(a))
}

export function filterItemsByYear(items: ItemRecord[], year: string) {
  return year === 'all' ? items : items.filter((item) => item.purchaseDate?.startsWith(`${year}-`))
}

export function summarizePurchases(items: ItemRecord[]) {
  const priced = items.filter((item) => item.purchasePrice !== null)
  const total = priced.reduce((sum, item) => sum + (item.purchasePrice ?? 0), 0)
  const discountEligible = priced.filter((item) => item.originalPrice !== null && item.originalPrice > 0)
  const listPriceTotal = discountEligible.reduce((sum, item) => sum + (item.originalPrice ?? 0), 0)
  const savings = discountEligible.reduce((sum, item) => sum + Math.max(0, (item.originalPrice ?? 0) - (item.purchasePrice ?? 0)), 0)
  return {
    itemCount: items.length,
    pricedCount: priced.length,
    total,
    average: priced.length ? Math.round(total / priced.length) : 0,
    savings,
    discountRate: listPriceTotal ? Math.round(savings / listPriceTotal * 1000) / 10 : 0,
    discountEligibleCount: discountEligible.length,
  }
}

export function groupInsightRows(items: ItemRecord[], label: (item: ItemRecord) => string): InsightRow[] {
  const map = new Map<string, InsightRow>()
  for (const item of items) {
    const key = label(item)
    const row = map.get(key) ?? { label: key, count: 0, amount: 0 }
    row.count += 1
    row.amount += item.purchasePrice ?? 0
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || b.count - a.count || a.label.localeCompare(b.label, 'ja'))
}
