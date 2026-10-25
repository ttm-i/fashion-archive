import type { ItemMeasurements, MeasurementDefinition, MeasurementDraft, MeasurementKey, SettingRecord } from '../types'

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

export const MEASUREMENT_DEFINITIONS_SETTING_KEY = 'measurementDefinitions'

export const DEFAULT_MEASUREMENT_DEFINITIONS: MeasurementDefinition[] = [
  ...['outerwear', 'tops'].flatMap((categoryId) => [
    { id: 'shoulderWidth', categoryId, name: '肩幅', sortOrder: 0 },
    { id: 'chestWidth', categoryId, name: '身幅', sortOrder: 1 },
    { id: 'bodyLength', categoryId, name: '着丈', sortOrder: 2 },
    { id: 'sleeveLength', categoryId, name: '袖丈', sortOrder: 3 },
  ]),
  { id: 'waist', categoryId: 'bottoms', name: 'ウエスト', sortOrder: 0 },
  { id: 'rise', categoryId: 'bottoms', name: '股上', sortOrder: 1 },
  { id: 'inseam', categoryId: 'bottoms', name: '股下', sortOrder: 2 },
  { id: 'thighWidth', categoryId: 'bottoms', name: 'わたり幅', sortOrder: 3 },
  { id: 'hemWidth', categoryId: 'bottoms', name: '裾幅', sortOrder: 4 },
] as MeasurementDefinition[]

export function normalizeMeasurementDefinitions(value: unknown): MeasurementDefinition[] {
  if (!Array.isArray(value)) return DEFAULT_MEASUREMENT_DEFINITIONS.map((definition) => ({ ...definition }))
  if (value.length === 0) return []
  const definitions = value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []
    const definition = candidate as Partial<MeasurementDefinition>
    if (typeof definition.id !== 'string' || !definition.id || typeof definition.name !== 'string' || !definition.name.trim()) return []
    if (definition.categoryId !== 'outerwear' && definition.categoryId !== 'tops' && definition.categoryId !== 'bottoms') return []
    return [{ id: definition.id, categoryId: definition.categoryId, name: definition.name.trim(), sortOrder: Number.isFinite(definition.sortOrder) ? Number(definition.sortOrder) : 0 }]
  })
  return definitions.length ? definitions : DEFAULT_MEASUREMENT_DEFINITIONS.map((definition) => ({ ...definition }))
}

export function measurementDefinitionsFromSettings(settings: SettingRecord[]): MeasurementDefinition[] {
  return normalizeMeasurementDefinitions(settings.find((setting) => setting.key === MEASUREMENT_DEFINITIONS_SETTING_KEY)?.value)
}

export function measurementDefinitionsForCategory(categoryId: string | null, definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS) {
  return definitions.filter((definition) => definition.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function emptyMeasurementDraft(definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS): MeasurementDraft {
  return Object.fromEntries([...new Set(definitions.map((definition) => definition.id))].map((key) => [key, '']))
}

export function measurementKeysForCategory(categoryId: string | null, definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS): MeasurementKey[] {
  return measurementDefinitionsForCategory(categoryId, definitions).map((definition) => definition.id)
}

export function toMeasurementDraft(measurements: ItemMeasurements | undefined, definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS): MeasurementDraft {
  const keys = new Set([...definitions.map((definition) => definition.id), ...Object.keys(measurements ?? {})])
  return Object.fromEntries([...keys].map((key) => [key, measurements?.[key]?.toString() ?? '']))
}

export function parseMeasurements(draft: MeasurementDraft, definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS): ItemMeasurements {
  const result: ItemMeasurements = {}
  for (const definition of definitions) {
    const raw = (draft[definition.id] ?? '').trim()
    if (!raw) continue
    const value = Number(raw.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0 || value > 500) throw new Error(`${definition.name}は0より大きく500以下の数値で入力してください。`)
    result[definition.id] = value
  }
  return result
}

export function sanitizeMeasurementsForCategory(measurements: ItemMeasurements | undefined, categoryId: string | null, definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS): ItemMeasurements {
  const allowedKeys = measurementKeysForCategory(categoryId, definitions)
  return Object.fromEntries(allowedKeys.flatMap((key) => measurements?.[key] === undefined ? [] : [[key, measurements[key]]])) as ItemMeasurements
}

export function measurementEntries(measurements: ItemMeasurements | undefined, definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS) {
  return definitions.flatMap((definition) => measurements?.[definition.id] === undefined ? [] : [{ key: definition.id, label: definition.name, value: measurements[definition.id] }])
}

export function formatMeasurements(measurements: ItemMeasurements | undefined, categoryId?: string | null, definitions: MeasurementDefinition[] = DEFAULT_MEASUREMENT_DEFINITIONS) {
  const selectedDefinitions = categoryId === undefined ? definitions : measurementDefinitionsForCategory(categoryId, definitions)
  return measurementEntries(measurements, selectedDefinitions).map((entry) => `${entry.label} ${entry.value}cm`).join(' / ')
}
