import Dexie, { type EntityTable } from 'dexie'
import type { CategoryRecord, EditorDraftRecord, ImageRecord, ItemRecord, SettingRecord } from './types'

export const DATABASE_SCHEMA_VERSION = 3

const DEFAULT_CATEGORIES: CategoryRecord[] = [
  { id: 'outerwear', name: 'アウター', sortOrder: 0, isActive: true },
  { id: 'tops', name: 'トップス', sortOrder: 1, isActive: true },
  { id: 'bottoms', name: 'ボトムス', sortOrder: 2, isActive: true },
  { id: 'shoes', name: 'シューズ', sortOrder: 3, isActive: true },
  { id: 'bags', name: 'バッグ', sortOrder: 4, isActive: true },
  { id: 'accessories', name: 'アクセサリー', sortOrder: 5, isActive: true },
  { id: 'other', name: 'その他', sortOrder: 6, isActive: true },
]

class FashionArchiveDatabase extends Dexie {
  items!: EntityTable<ItemRecord, 'id'>
  images!: EntityTable<ImageRecord, 'id'>
  categories!: EntityTable<CategoryRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>
  drafts!: EntityTable<EditorDraftRecord, 'key'>

  constructor() {
    super('fashion-archive')
    this.version(1).stores({
      items: 'id, name, brand, categoryId, purchaseDate, purchaseMethod, isFavorite, createdAt, updatedAt, deletedAt',
      images: 'id, itemId, [itemId+sortOrder], sortOrder',
      categories: 'id, sortOrder, isActive',
      settings: 'key',
    })
    this.version(2).stores({
      items: 'id, name, brand, categoryId, purchaseDate, purchaseMethod, isFavorite, createdAt, updatedAt, deletedAt',
      images: 'id, itemId, [itemId+sortOrder], sortOrder',
      categories: 'id, sortOrder, isActive',
      settings: 'key',
      drafts: 'key, itemId, updatedAt',
    })
    this.version(3).stores({
      items: 'id, name, brand, categoryId, purchaseDate, purchaseMethod, ownershipStatus, isFavorite, createdAt, updatedAt, deletedAt',
      images: 'id, itemId, [itemId+sortOrder], sortOrder',
      categories: 'id, sortOrder, isActive',
      settings: 'key',
      drafts: 'key, itemId, updatedAt',
    }).upgrade(async (transaction) => {
      await transaction.table('items').toCollection().modify((item) => {
        if (!item.ownershipStatus) item.ownershipStatus = 'owned'
        item.schemaVersion = 2
      })
    })
  }
}

export const db = new FashionArchiveDatabase()

export async function initializeDatabase() {
  const categoryCount = await db.categories.count()
  if (categoryCount === 0) await db.categories.bulkAdd(DEFAULT_CATEGORIES)
  const storedVersion = Number((await db.settings.get('schemaVersion'))?.value ?? 0)
  if (storedVersion < DATABASE_SCHEMA_VERSION) await db.settings.put({ key: 'schemaVersion', value: DATABASE_SCHEMA_VERSION })
}

export async function markDataChanged() {
  await db.transaction('rw', db.settings, async () => {
    const current = Number((await db.settings.get('changesSinceBackup'))?.value ?? 0)
    await db.settings.put({ key: 'changesSinceBackup', value: current + 1 })
  })
}

export async function saveItem(item: ItemRecord, images: ImageRecord[]) {
  await db.transaction('rw', db.items, db.images, async () => {
    const oldImages = await db.images.where('itemId').equals(item.id).toArray()
    const oldImageMap = new Map(oldImages.map((image) => [image.id, image]))
    const nextIds = new Set(images.map((image) => image.id))
    const removedIds = oldImages.filter((image) => !nextIds.has(image.id)).map((image) => image.id)
    if (removedIds.length) await db.images.bulkDelete(removedIds)
    await db.items.put(item)
    const addedImages = images.filter((image) => !oldImageMap.has(image.id))
    if (addedImages.length) await db.images.bulkAdd(addedImages)
    for (const image of images) {
      const oldImage = oldImageMap.get(image.id)
      if (oldImage && (oldImage.sortOrder !== image.sortOrder || oldImage.itemId !== image.itemId)) {
        await db.images.update(image.id, { itemId: image.itemId, sortOrder: image.sortOrder })
      }
    }
  })
  await markDataChanged()
}

export async function moveItemToTrash(id: string) {
  await db.items.update(id, { deletedAt: new Date(), updatedAt: new Date() })
  await markDataChanged()
}

export async function restoreItem(id: string) {
  await db.items.update(id, { deletedAt: null, updatedAt: new Date() })
  await markDataChanged()
}

export async function permanentlyDeleteItem(id: string) {
  await db.transaction('rw', db.items, db.images, async () => {
    await db.images.where('itemId').equals(id).delete()
    await db.items.delete(id)
  })
  await markDataChanged()
}

export async function emptyTrash() {
  const deletedItems = await db.items.filter((item) => item.deletedAt !== null).toArray()
  await db.transaction('rw', db.items, db.images, async () => {
    for (const item of deletedItems) {
      await db.images.where('itemId').equals(item.id).delete()
      await db.items.delete(item.id)
    }
  })
  if (deletedItems.length) await markDataChanged()
}

export async function updateBackupTimestamp() {
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ key: 'lastBackupAt', value: new Date().toISOString() })
    await db.settings.put({ key: 'changesSinceBackup', value: 0 })
  })
}

export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null
  return navigator.storage.estimate()
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}
