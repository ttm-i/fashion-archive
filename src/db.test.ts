import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, emptyTrash, initializeDatabase, moveItemToTrash, restoreItem, saveItem } from './db'
import type { EditorDraftRecord, ItemRecord } from './types'

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
    expect((await db.settings.get('schemaVersion'))?.value).toBe(2)
  })

  it('saves, trashes, restores and permanently empties items', async () => {
    const item = makeItem()
    await saveItem(item, [])
    expect(await db.items.get(item.id)).toMatchObject({ name: 'テストジャケット' })
    expect((await db.settings.get('changesSinceBackup'))?.value).toBe(1)
    await moveItemToTrash(item.id)
    expect((await db.items.get(item.id))?.deletedAt).toBeInstanceOf(Date)
    await restoreItem(item.id)
    expect((await db.items.get(item.id))?.deletedAt).toBeNull()
    await moveItemToTrash(item.id)
    await emptyTrash()
    expect(await db.items.get(item.id)).toBeUndefined()
  })

  it('stores editor drafts separately from saved items', async () => {
    const record: EditorDraftRecord = {
      key: 'new',
      itemId: 'draft-item',
      draft: {
        name: '入力途中のコート', brand: '', categoryId: null, size: '', color: '', originalPrice: '', purchasePrice: '', purchaseDate: '', purchaseMethod: '', purchaseSource: '', notes: '', isFavorite: false,
      },
      images: [{
        id: 'draft-image', itemId: 'draft-item', sortOrder: 0,
        imageBlob: new Blob(['draft-full'], { type: 'image/webp' }),
        thumbnailBlob: new Blob(['draft-thumb'], { type: 'image/webp' }),
        mimeType: 'image/webp', width: 1200, height: 1600, byteSize: 10, createdAt: new Date(),
      }],
      updatedAt: new Date(),
    }
    await db.drafts.put(record)
    expect(await db.drafts.get('new')).toMatchObject({ itemId: 'draft-item', draft: { name: '入力途中のコート' } })
    expect((await db.drafts.get('new'))?.images[0]?.imageBlob.size).toBeGreaterThan(0)
    expect(await db.items.count()).toBe(0)
  })

  it('upgrades a version 1 database without losing existing items', async () => {
    await db.delete()
    const legacy = new Dexie('fashion-archive')
    legacy.version(1).stores({
      items: 'id, name, brand, categoryId, purchaseDate, purchaseMethod, isFavorite, createdAt, updatedAt, deletedAt',
      images: 'id, itemId, [itemId+sortOrder], sortOrder',
      categories: 'id, sortOrder, isActive',
      settings: 'key',
    })
    await legacy.open()
    await legacy.table('items').put(makeItem())
    await legacy.table('settings').put({ key: 'schemaVersion', value: 1 })
    legacy.close()

    await db.open()
    await initializeDatabase()

    expect(await db.items.count()).toBe(1)
    expect((await db.settings.get('schemaVersion'))?.value).toBe(2)
    await expect(db.drafts.count()).resolves.toBe(0)
  })
})
