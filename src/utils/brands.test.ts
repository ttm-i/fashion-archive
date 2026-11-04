import { describe, expect, it } from 'vitest'
import { mergeBrands, normalizeBrandPreferences, renameBrandPreferences } from './brands'

describe('brand preferences', () => {
  it('keeps favorite brands first and preserves recent order for the rest', () => {
    expect(mergeBrands(['最近', '固定', '以前'], { favorites: ['固定'], custom: ['追加'] })).toEqual(['固定', '最近', '以前', '追加'])
  })

  it('normalizes duplicates without changing the displayed spelling', () => {
    expect(normalizeBrandPreferences({ favorites: ['COMOLI', ' comoli '], custom: ['AURALEE'] })).toEqual({ favorites: ['COMOLI'], custom: ['AURALEE'] })
  })

  it('renames favorite and custom brand candidates together', () => {
    expect(renameBrandPreferences({ favorites: ['旧ブランド'], custom: ['旧ブランド'] }, '旧ブランド', '新ブランド')).toEqual({ favorites: ['新ブランド'], custom: ['新ブランド'] })
  })
})
