import type { SettingRecord } from '../types'
import { mergeCandidates, normalizeCandidatePreferences, renameCandidatePreferences, type CandidatePreferences } from './candidatePreferences'

export const PURCHASE_SOURCE_PREFERENCES_KEY = 'purchaseSourcePreferences'
export const MAX_FAVORITE_PURCHASE_SOURCES = 8

export type PurchaseSourcePreferences = CandidatePreferences

export function normalizePurchaseSourcePreferences(value: unknown): PurchaseSourcePreferences {
  return normalizeCandidatePreferences(value, MAX_FAVORITE_PURCHASE_SOURCES)
}

export function purchaseSourcePreferencesFromSettings(settings: SettingRecord[]) {
  return normalizePurchaseSourcePreferences(settings.find((setting) => setting.key === PURCHASE_SOURCE_PREFERENCES_KEY)?.value)
}

export function mergePurchaseSources(values: string[], preferences: PurchaseSourcePreferences) {
  return mergeCandidates(values, preferences)
}

export function renamePurchaseSourcePreferences(preferences: PurchaseSourcePreferences, previous: string, next: string) {
  return renameCandidatePreferences(preferences, previous, next, MAX_FAVORITE_PURCHASE_SOURCES)
}
