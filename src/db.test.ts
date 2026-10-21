import { beforeEach, describe, expect, it } from 'vitest'
import { db, emptyTrash, initializeDatabase, moveItemToTrash, restoreItem, saveItem } from './db'
import type { ItemRecord } from './types'

const makeItem = (): ItemRecord => ({
  id: crypto.randomUUID(),
  name: 'テストジャケット',
  brand: 'TEST',
  categoryId: 'outerwear',
  size: 'M',
  color: 'ブラック',
  originalPrice: 20000,
  purchasePrice: 15000,
  purchaseDate: '2026-10-21',
  purchaseMethod: '実店舗',
  purchaseSource: 'テストストア',
  notes: '',
  isFavorite: false,
  coverImageId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  schemaVersion: 1,
})

describe('database operations', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
  })

  it('seeds default categories', async () => {
    expect(await db.categories.count()).toBe(7)
  })

  it('saves, trashes, restores and permanently empties items', async () => {
    const item = makeItem()
    await saveItem(item, [])
    expect(await db.items.get(item.id)).toMatchObject({ name: 'テストジャケット' })
    await moveItemToTrash(item.id)
    expect((await db.items.get(item.id))?.deletedAt).toBeInstanceOf(Date)
    await restoreItem(item.id)
    expect((await db.items.get(item.id))?.deletedAt).toBeNull()
    await moveItemToTrash(item.id)
    await emptyTrash()
    expect(await db.items.get(item.id)).toBeUndefined()
  })
})
