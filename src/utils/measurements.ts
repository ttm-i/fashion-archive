import type { ItemMeasurements, MeasurementDraft, MeasurementKey } from '../types'

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  shoulderWidth: '肩幅',
  chestWidth: '身幅',
  bodyLength: '着丈',
  sleeveLength: '袖丈',
  waist: 'ウエスト',
  rise: '股上',
  inseam: '股下',
  thighWidth: 'わたり幅',
  hemWidth: '裾幅',
}

export const MEASUREMENT_KEYS: MeasurementKey[] = Object.keys(MEASUREMENT_LABELS) as MeasurementKey[]

export function emptyMeasurementDraft(): MeasurementDraft {
  return Object.fromEntries(MEASUREMENT_KEYS.map((key) => [key, ''])) as unknown as MeasurementDraft
}

export function measurementKeysForCategory(categoryId: string | null): MeasurementKey[] {
  if (categoryId === 'outerwear' || categoryId === 'tops') return ['shoulderWidth', 'chestWidth', 'bodyLength', 'sleeveLength']
  if (categoryId === 'bottoms') return ['waist', 'rise', 'inseam', 'thighWidth', 'hemWidth']
  return []
}

export function toMeasurementDraft(measurements: ItemMeasurements | undefined): MeasurementDraft {
  return Object.fromEntries(MEASUREMENT_KEYS.map((key) => [key, measurements?.[key]?.toString() ?? ''])) as unknown as MeasurementDraft
}

export function parseMeasurements(draft: MeasurementDraft, allowedKeys: MeasurementKey[] = MEASUREMENT_KEYS): ItemMeasurements {
  const result: ItemMeasurements = {}
  for (const key of allowedKeys) {
    const raw = draft[key].trim()
    if (!raw) continue
    const value = Number(raw.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0 || value > 500) throw new Error(`${MEASUREMENT_LABELS[key]}は0より大きく500以下の数値で入力してください。`)
    result[key] = value
  }
  return result
}

export function sanitizeMeasurementsForCategory(measurements: ItemMeasurements | undefined, categoryId: string | null): ItemMeasurements {
  const allowedKeys = measurementKeysForCategory(categoryId)
  return Object.fromEntries(allowedKeys.flatMap((key) => measurements?.[key] === undefined ? [] : [[key, measurements[key]]])) as ItemMeasurements
}

export function measurementEntries(measurements: ItemMeasurements | undefined, keys: MeasurementKey[] = MEASUREMENT_KEYS) {
  return keys.flatMap((key) => measurements?.[key] === undefined ? [] : [{ key, label: MEASUREMENT_LABELS[key], value: measurements[key] }])
}

export function formatMeasurements(measurements: ItemMeasurements | undefined, categoryId?: string | null) {
  const keys = categoryId === undefined ? MEASUREMENT_KEYS : measurementKeysForCategory(categoryId)
  return measurementEntries(measurements, keys).map((entry) => `${entry.label} ${entry.value}cm`).join(' / ')
}
