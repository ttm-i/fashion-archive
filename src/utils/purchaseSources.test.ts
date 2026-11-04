import { describe, expect, it } from 'vitest'
import { mergePurchaseSources, normalizePurchaseSourcePreferences, renamePurchaseSourcePreferences } from './purchaseSources'

describe('purchase source preferences', () => {
  it('normalizes duplicate values and limits favorites', () => {
    const preferences = normalizePurchaseSourcePreferences({ favorites: ['A', ' a ', ...Array.from({ length: 10 }, (_, index) => `店${index}`)], custom: ['B', ' b '] })
    expect(preferences.favorites).toHaveLength(8)
    expect(preferences.favorites[0]).toBe('A')
    expect(preferences.custom).toEqual(['B'])
  })

  it('places favorites first and keeps remaining source order', () => {
    expect(mergePurchaseSources(['最近の店', '固定店', '別の店'], { favorites: ['固定店'], custom: ['追加店'] })).toEqual(['固定店', '最近の店', '別の店', '追加店'])
  })

  it('renames matching favorites and custom candidates', () => {
    expect(renamePurchaseSourcePreferences({ favorites: ['旧店'], custom: ['旧店'] }, '旧店', '新店')).toEqual({ favorites: ['新店'], custom: ['新店'] })
  })
})
