import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase } from '../db'
import type { ItemRecord, MeasurementDefinition } from '../types'
import { MEASUREMENT_DEFINITIONS_SETTING_KEY } from '../utils/measurements'
import { MeasurementsScreen } from './MeasurementsScreen'

const usedItem = (): ItemRecord => ({
  id: 'used-measurement-item', name: '寸法登録済みコート', brand: '', categoryId: 'outerwear', size: '', color: '', materials: [], measurements: { shoulderWidth: 48 }, originalPrice: null, purchasePrice: null, purchaseDate: null, purchaseMethod: null, purchaseSource: '', notes: '', isFavorite: false, ownershipStatus: 'owned', coverImageId: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, schemaVersion: 6,
})

describe('measurement management', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
  })

  afterEach(async () => {
    cleanup()
    await db.delete()
  })

  it('adds custom fields and blocks deletion of a field used by an item', async () => {
    await db.items.add(usedItem())
    render(<MeasurementsScreen />)

    fireEvent.click(await screen.findByRole('button', { name: '肩幅を削除' }))
    expect(await screen.findByText('寸法登録済みコート')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '「肩幅」は削除できません' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '確認しました' }))

    fireEvent.change(screen.getByPlaceholderText('例：裄丈'), { target: { value: '裄丈' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    await waitFor(async () => {
      const stored = (await db.settings.get(MEASUREMENT_DEFINITIONS_SETTING_KEY))?.value as MeasurementDefinition[]
      expect(stored.some((definition) => definition.categoryId === 'outerwear' && definition.name === '裄丈')).toBe(true)
    })
  })
})
