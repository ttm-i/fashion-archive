import type { SettingRecord } from '../types'

export const PURCHASE_SOURCE_PREFERENCES_KEY = 'purchaseSourcePreferences'
export const MAX_FAVORITE_PURCHASE_SOURCES = 8

export interface PurchaseSourcePreferences {
  favorites: string[]
  custom: string[]
}

const clean = (values: unknown) => {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  return values.flatMap((value) => {
    if (typeof value !== 'string') return []
    const trimmed = value.trim()
    const key = trimmed.toLocaleLowerCase('ja-JP')
    if (!trimmed || seen.has(key)) return []
    seen.add(key)
    return [trimmed]
  })
}

export function normalizePurchaseSourcePreferences(value: unknown): PurchaseSourcePreferences {
  if (!value || typeof value !== 'object') return { favorites: [], custom: [] }
  const candidate = value as Partial<PurchaseSourcePreferences>
  return {
    favorites: clean(candidate.favorites).slice(0, MAX_FAVORITE_PURCHASE_SOURCES),
    custom: clean(candidate.custom),
  }
}

export function purchaseSourcePreferencesFromSettings(settings: SettingRecord[]) {
  return normalizePurchaseSourcePreferences(settings.find((setting) => setting.key === PURCHASE_SOURCE_PREFERENCES_KEY)?.value)
}

export function mergePurchaseSources(values: string[], preferences: PurchaseSourcePreferences) {
  const available = clean([...values, ...preferences.custom])
  const byKey = new Map(available.map((value) => [value.toLocaleLowerCase('ja-JP'), value]))
  const favorites = preferences.favorites.map((value) => byKey.get(value.toLocaleLowerCase('ja-JP')) ?? value)
  const favoriteKeys = new Set(favorites.map((value) => value.toLocaleLowerCase('ja-JP')))
  return [...favorites, ...available.filter((value) => !favoriteKeys.has(value.toLocaleLowerCase('ja-JP')))]
}

export function renamePurchaseSourcePreferences(preferences: PurchaseSourcePreferences, previous: string, next: string) {
  const replace = (value: string) => value.toLocaleLowerCase('ja-JP') === previous.toLocaleLowerCase('ja-JP') ? next : value
  return normalizePurchaseSourcePreferences({
    favorites: preferences.favorites.map(replace),
    custom: preferences.custom.map(replace),
  })
}
