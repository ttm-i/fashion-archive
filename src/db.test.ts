import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { db, emptyTrash, initializeDatabase, moveItemToTrash, restoreItem, saveItem } from './db'
import type { EditorDraftRecord, ImageRecord, ItemRecord } from './types'

const makeItem = (): ItemRecord => ({
  id: crypto.randomUUID(),
  name: 'テストジャケット',
  brand: 'TEST',
  categoryId: 'outerwear',
  size: 'M',
  color: 'ブラック',
  materials: [],
  measurements: {},
  originalPrice: 20000,
  purchasePrice: 15000,
  purchaseDate: '2026-10-21',
  purchaseMethod: '実店舗',
  purchaseSource: 'テストストア',
  notes: '',
  isFavorite: false,
  ownershipStatus: 'owned',
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
    expect((await db.settings.get('schemaVersion'))?.value).toBe(8)
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
        name: '入力途中のコート', brand: '', categoryId: null, size: '', color: '', materials: [], measurements: { shoulderWidth: '', chestWidth: '', bodyLength: '', sleeveLength: '', waist: '', rise: '', inseam: '', thighWidth: '', hemWidth: '' }, originalPrice: '', purchasePrice: '', purchaseDate: '', purchaseMethod: '', purchaseSource: '', notes: '', isFavorite: false,
      },
      images: [{
        id: 'draft-image', itemId: 'draft-item', sortOrder: 0,
        imageBlob: new Blob(['draft-full'], { type: 'image/webp' }),
        thumbnailBlob: new Blob(['draft-thumb'], { type: 'image/webp' }),
        mimeType: 'image/webp', width: 1200, height: 1600, byteSize: 10, focusX: 50, focusY: 50, createdAt: new Date(),
      }],
      updatedAt: new Date(),
    }
    await db.drafts.put(record)
    expect(await db.drafts.get('new')).toMatchObject({ itemId: 'draft-item', draft: { name: '入力途中のコート' } })
    expect((await db.drafts.get('new'))?.images[0]?.imageBlob.size).toBeGreaterThan(0)
    expect(await db.items.count()).toBe(0)
  })

  it('stores order and framing on the item without updating existing photo records', async () => {
    const item = makeItem()
    const makeImage = (id: string, sortOrder: number): ImageRecord => ({
      id,
      itemId: item.id,
      sortOrder,
      imageBlob: new Blob([`full-${id}`], { type: 'image/webp' }),
      thumbnailBlob: new Blob([`thumb-${id}`], { type: 'image/webp' }),
      mimeType: 'image/webp',
      width: 228,
      height: 228,
      byteSize: 8,
      focusX: 50,
      focusY: 50,
      createdAt: new Date(),
    })
    await saveItem(item, [makeImage('first', 0), makeImage('second', 1)])
    const stored = await db.images.where('itemId').equals(item.id).sortBy('sortOrder')
    const bulkAdd = vi.spyOn(db.images, 'bulkAdd')
    const updateImage = vi.spyOn(db.images, 'update')

    await saveItem({ ...item, name: '編集後' }, [
      { ...stored[1], sortOrder: 0, focusX: 72, focusY: 31 },
      { ...stored[0], sortOrder: 1 },
    ])

    expect(bulkAdd).not.toHaveBeenCalled()
    expect(updateImage).not.toHaveBeenCalled()
    const unchangedImages = await db.images.where('itemId').equals(item.id).sortBy('sortOrder')
    expect(unchangedImages.map((image) => image.id)).toEqual(['first', 'second'])
    expect(await unchangedImages[0].imageBlob.text()).toBe('full-first')
    expect(await unchangedImages[1].imageBlob.text()).toBe('full-second')
    expect(await db.items.get(item.id)).toMatchObject({
      coverImageId: 'second',
      imageLayout: [
        { imageId: 'second', focusX: 72, focusY: 31 },
        { imageId: 'first', focusX: 50, focusY: 50 },
      ],
    })
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
    const legacyItem = makeItem() as Partial<ItemRecord>
    delete legacyItem.ownershipStatus
    delete legacyItem.materials
    delete legacyItem.measurements
    await legacy.table('items').put(legacyItem)
    await legacy.table('settings').put({ key: 'schemaVersion', value: 1 })
    legacy.close()

    await db.open()
    await initializeDatabase()

    expect(await db.items.count()).toBe(1)
    expect((await db.settings.get('schemaVersion'))?.value).toBe(8)
    expect((await db.items.toArray())[0]?.ownershipStatus).toBe('owned')
    expect((await db.items.toArray())[0]?.materials).toEqual([])
    expect((await db.items.toArray())[0]?.measurements).toEqual({})
    await expect(db.drafts.count()).resolves.toBe(0)
  })

  it('removes measurements that do not belong to the saved category during upgrade', async () => {
    await db.delete()
    const legacy = new Dexie('fashion-archive')
    legacy.version(5).stores({
      items: 'id, name, brand, categoryId, purchaseDate, purchaseMethod, ownershipStatus, isFavorite, createdAt, updatedAt, deletedAt',
      images: 'id, itemId, [itemId+sortOrder], sortOrder',
      categories: 'id, sortOrder, isActive',
      settings: 'key',
      drafts: 'key, itemId, updatedAt',
    })
    await legacy.open()
    await legacy.table('items').put({ ...makeItem(), categoryId: 'bottoms', measurements: { shoulderWidth: 48, waist: 82 } })
    legacy.close()

    await db.open()
    await initializeDatabase()

    expect((await db.items.toArray())[0]?.measurements).toEqual({ waist: 82 })
  })

  it('adds a centered list position to photos saved by an older version', async () => {
    await db.delete()
    const legacy = new Dexie('fashion-archive')
    legacy.version(6).stores({
      items: 'id, name, brand, categoryId, purchaseDate, purchaseMethod, ownershipStatus, isFavorite, createdAt, updatedAt, deletedAt',
      images: 'id, itemId, [itemId+sortOrder], sortOrder',
      categories: 'id, sortOrder, isActive',
      settings: 'key',
      drafts: 'key, itemId, updatedAt',
    })
    await legacy.open()
    await legacy.table('images').put({
      id: 'legacy-image', itemId: 'legacy-item', sortOrder: 0,
      imageBlob: new Blob(['full']), thumbnailBlob: new Blob(['thumb']), mimeType: 'image/webp',
      width: 1200, height: 1600, byteSize: 4, createdAt: new Date(),
    })
    legacy.close()

    await db.open()
    await initializeDatabase()

    expect(await db.images.get('legacy-image')).toMatchObject({ focusX: 50, focusY: 50 })
  })

  it('moves legacy photo order and framing into the item without touching its blobs', async () => {
    await db.delete()
    const legacy = new Dexie('fashion-archive')
    legacy.version(7).stores({
      items: 'id, name, brand, categoryId, purchaseDate, purchaseMethod, ownershipStatus, isFavorite, createdAt, updatedAt, deletedAt',
      images: 'id, itemId, [itemId+sortOrder], sortOrder',
      categories: 'id, sortOrder, isActive',
      settings: 'key',
      drafts: 'key, itemId, updatedAt',
    })
    await legacy.open()
    const legacyItem = { ...makeItem(), id: 'legacy-layout-item', coverImageId: 'legacy-second' }
    await legacy.table('items').put(legacyItem)
    await legacy.table('images').bulkAdd([
      { id: 'legacy-first', itemId: legacyItem.id, sortOrder: 1, imageBlob: new Blob(['first']), thumbnailBlob: new Blob(['first-thumb']), mimeType: 'image/webp', width: 800, height: 600, byteSize: 5, focusX: 20, focusY: 30, createdAt: new Date() },
      { id: 'legacy-second', itemId: legacyItem.id, sortOrder: 0, imageBlob: new Blob(['second']), thumbnailBlob: new Blob(['second-thumb']), mimeType: 'image/webp', width: 800, height: 600, byteSize: 6, focusX: 70, focusY: 80, createdAt: new Date() },
    ])
    legacy.close()

    await db.open()
    await initializeDatabase()

    expect(await db.items.get(legacyItem.id)).toMatchObject({
      coverImageId: 'legacy-second',
      imageLayout: [
        { imageId: 'legacy-second', focusX: 70, focusY: 80 },
        { imageId: 'legacy-first', focusX: 20, focusY: 30 },
      ],
    })
    expect(await (await db.images.get('legacy-second'))?.imageBlob.text()).toBe('second')
  })
})
