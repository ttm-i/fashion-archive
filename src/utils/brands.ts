import type { SettingRecord } from '../types'
import { mergeCandidates, normalizeCandidatePreferences, renameCandidatePreferences, type CandidatePreferences } from './candidatePreferences'

export const BRAND_PREFERENCES_KEY = 'brandPreferences'
export const MAX_FAVORITE_BRANDS = 8
export type BrandPreferences = CandidatePreferences

export const normalizeBrandPreferences = (value: unknown) => normalizeCandidatePreferences(value, MAX_FAVORITE_BRANDS)
export const mergeBrands = (values: string[], preferences: BrandPreferences) => mergeCandidates(values, preferences)
export const renameBrandPreferences = (preferences: BrandPreferences, previous: string, next: string) => renameCandidatePreferences(preferences, previous, next, MAX_FAVORITE_BRANDS)
export const brandPreferencesFromSettings = (settings: SettingRecord[]) => normalizeBrandPreferences(settings.find((setting) => setting.key === BRAND_PREFERENCES_KEY)?.value)
