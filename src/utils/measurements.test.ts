import { describe, expect, it } from 'vitest'
import { DEFAULT_MEASUREMENT_DEFINITIONS, emptyMeasurementDraft, formatMeasurements, measurementDefinitionsForCategory, measurementKeysForCategory, normalizeMeasurementDefinitions, parseMeasurements, sanitizeMeasurementsForCategory, toMeasurementDraft } from './measurements'

describe('measurements', () => {
  it('provides the appropriate fields for supported categories', () => {
    expect(measurementKeysForCategory('tops')).toEqual(['shoulderWidth', 'chestWidth', 'bodyLength', 'sleeveLength'])
    expect(measurementKeysForCategory('bottoms')).toEqual(['waist', 'rise', 'inseam', 'thighWidth', 'hemWidth'])
    expect(measurementKeysForCategory('bags')).toEqual([])
  })

  it('parses only entered positive measurements including decimals', () => {
    const draft = emptyMeasurementDraft()
    draft.shoulderWidth = '47,5'
    draft.bodyLength = '72'
    expect(parseMeasurements(draft)).toEqual({ shoulderWidth: 47.5, bodyLength: 72 })
  })

  it('rejects invalid measurements', () => {
    const draft = emptyMeasurementDraft()
    draft.waist = '0'
    expect(() => parseMeasurements(draft)).toThrow('ウエスト')
  })

  it('keeps only measurements that belong to the selected category', () => {
    expect(sanitizeMeasurementsForCategory({ shoulderWidth: 48, waist: 82 }, 'bottoms')).toEqual({ waist: 82 })
    expect(sanitizeMeasurementsForCategory({ shoulderWidth: 48 }, 'bags')).toEqual({})
  })

  it('converts saved values for editing and CSV display', () => {
    expect(toMeasurementDraft({ inseam: 76 }).inseam).toBe('76')
    expect(formatMeasurements({ waist: 82, inseam: 76 })).toBe('ウエスト 82cm / 股下 76cm')
  })

  it('uses customized names and order without changing saved values', () => {
    const customized = DEFAULT_MEASUREMENT_DEFINITIONS.map((definition) => definition.categoryId === 'tops' && definition.id === 'bodyLength' ? { ...definition, name: '後ろ着丈', sortOrder: -1 } : definition)
    expect(measurementDefinitionsForCategory('tops', customized).map((definition) => definition.name)[0]).toBe('後ろ着丈')
    expect(formatMeasurements({ bodyLength: 72 }, 'tops', customized)).toBe('後ろ着丈 72cm')
  })

  it('falls back to safe defaults when stored definitions are unavailable', () => {
    expect(normalizeMeasurementDefinitions(null)).toEqual(DEFAULT_MEASUREMENT_DEFINITIONS)
    expect(normalizeMeasurementDefinitions([])).toEqual([])
  })
})
