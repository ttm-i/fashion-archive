import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase, saveItem } from '../db'
import type { ItemRecord, OwnershipStatus } from '../types'
import { WishlistScreen } from './WishlistScreen'

function item(id: string, name: string, ownershipStatus: OwnershipStatus): ItemRecord {
  const now = new Date('2026-10-22T00:00:00.000Z')
  return {
    id, name, brand: '', categoryId: null, size: '', color: '', materials: [], measurements: {}, originalPrice: null, purchasePrice: null, purchaseDate: null,
    purchaseMethod: null, purchaseSource: '', notes: '', isFavorite: false, ownershipStatus, coverImageId: null,
    createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 2,
  }
}

describe('wishlist', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
    await saveItem(item('owned', '所有している服', 'owned'), [])
    await saveItem(item('wanted', 'ほしいコート', 'wanted'), [])
  })

  afterEach(() => cleanup())

  it('shows purchase candidates separately from owned items', async () => {
    render(<WishlistScreen />)
    expect(await screen.findByText('ほしいコート')).toBeTruthy()
    expect(screen.queryByText('所有している服')).toBeNull()
  })
})
