import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase, saveItem } from '../db'
import type { ItemRecord } from '../types'
import { loadCollectionViewState } from '../utils/collection'
import { InsightsScreen } from './InsightsScreen'

function item(index: number): ItemRecord {
  const now = new Date('2026-10-22T00:00:00.000Z')
  return {
    id: `item-${index}`, name: `アイテム${index}`, brand: `ブランド${index}`, categoryId: 'tops', size: '', color: '', materials: [], measurements: {},
    originalPrice: 20000, purchasePrice: 20000 - index * 1000, purchaseDate: '2026-10-01', purchaseMethod: '実店舗', purchaseSource: '',
    notes: '', isFavorite: false, ownershipStatus: 'owned', coverImageId: null, createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 3,
  }
}

describe('insights screen', () => {
  beforeEach(async () => {
    localStorage.clear()
    await db.delete()
    await db.open()
    await initializeDatabase()
    for (let index = 1; index <= 10; index += 1) await saveItem(item(index), [])
  })

  afterEach(() => cleanup())

  it('summarizes hidden classifications and expands them on demand', async () => {
    render(<InsightsScreen />)
    const summaries = await screen.findAllByText('その他 2分類')
    expect(summaries.length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'ブランド10のアイテムを見る' })).toBeNull()
    fireEvent.click(summaries[0].closest('button')!)
    expect(screen.getByRole('button', { name: 'ブランド10のアイテムを見る' })).toBeTruthy()
  })

  it('opens the collection with the selected breakdown applied', async () => {
    render(<InsightsScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'ブランド1のアイテムを見る' }))
    expect(window.location.hash).toBe('#/collection')
    expect(loadCollectionViewState().filter).toMatchObject({ brand: 'ブランド1' })
  })
})
