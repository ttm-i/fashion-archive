import { describe, expect, it } from 'vitest'
import { emptyMeasurementDraft, formatMeasurements, measurementKeysForCategory, parseMeasurements, toMeasurementDraft } from './measurements'

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

  it('converts saved values for editing and CSV display', () => {
    expect(toMeasurementDraft({ inseam: 76 }).inseam).toBe('76')
    expect(formatMeasurements({ waist: 82, inseam: 76 })).toBe('ウエスト 82cm / 股下 76cm')
  })
})
