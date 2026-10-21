import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase, saveItem } from '../db'
import type { ItemRecord } from '../types'
import { ItemDetailScreen } from './ItemDetailScreen'

function item(id: string, name: string): ItemRecord {
  const now = new Date('2026-10-21T00:00:00.000Z')
  return { id, name, brand: '', categoryId: null, size: '', color: '', originalPrice: null, purchasePrice: null, purchaseDate: null, purchaseMethod: null, purchaseSource: '', notes: '', isFavorite: false, coverImageId: null, createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 1 }
}

describe('item detail navigation', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
    await saveItem(item('first', '最初のアイテム'), [])
    await saveItem(item('second', '次のアイテム'), [])
    sessionStorage.setItem('collectionNavigationIds', JSON.stringify(['first', 'second']))
    window.location.hash = '#/item/first'
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
  })

  it('moves to the next item in the current collection order', async () => {
    render(<ItemDetailScreen id="first" />)
    expect(await screen.findByText('最初のアイテム')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '次のアイテム' }))
    expect(window.location.hash).toBe('#/item/second')
  })
})
