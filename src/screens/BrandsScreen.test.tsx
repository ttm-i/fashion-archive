import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, initializeDatabase } from '../db'
import type { ItemRecord } from '../types'
import { BRAND_PREFERENCES_KEY, normalizeBrandPreferences } from '../utils/brands'
import { BrandsScreen } from './BrandsScreen'

const brandItem = (): ItemRecord => ({
  id: 'brand-item', name: 'テストコート', brand: 'AURALEE', categoryId: 'outerwear', size: '', color: '', materials: [], measurements: {}, originalPrice: null, purchasePrice: null, purchaseDate: null, purchaseMethod: null, purchaseSource: '', notes: '', isFavorite: false, ownershipStatus: 'owned', coverImageId: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, schemaVersion: 6,
})

describe('brand candidate management', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
    await db.items.add(brandItem())
  })

  afterEach(async () => {
    cleanup()
    vi.restoreAllMocks()
    await db.delete()
  })

  it('pins a favorite brand and applies renaming to existing items', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<BrandsScreen />)

    fireEvent.click(await screen.findByRole('button', { name: 'AURALEEをよく買うブランドに固定' }))
    await waitFor(async () => {
      const preferences = normalizeBrandPreferences((await db.settings.get(BRAND_PREFERENCES_KEY))?.value)
      expect(preferences.favorites).toEqual(['AURALEE'])
    })

    fireEvent.click(screen.getByRole('button', { name: 'AURALEEの名称を変更' }))
    fireEvent.change(screen.getByLabelText('ブランド名'), { target: { value: 'AURALEE TEST' } })
    fireEvent.click(screen.getByRole('button', { name: '変更を保存' }))
    await waitFor(async () => expect((await db.items.get('brand-item'))?.brand).toBe('AURALEE TEST'))
  })
})
