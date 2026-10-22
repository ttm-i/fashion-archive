import { beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase, saveItem } from '../db'
import type { ImageRecord, ItemRecord } from '../types'
import { createBackup, inspectBackup, restoreBackup } from './backup'

const itemId = 'backup-test-item'
const imageId = 'backup-test-image'

function makeItem(): ItemRecord {
  const now = new Date('2026-10-21T00:00:00.000Z')
  return {
    id: itemId,
    name: 'バックアップ用コート',
    brand: 'ARCHIVE TEST',
    categoryId: 'outerwear',
    size: 'M',
    color: 'ブラック',
    materials: [{ id: 'material-wool', name: 'ウール', percentage: 100 }],
    measurements: { shoulderWidth: 47.5, bodyLength: 72 },
    originalPrice: 45000,
    purchasePrice: 32000,
    purchaseDate: '2026-10-01',
    purchaseMethod: '公式オンライン',
    purchaseSource: '公式ストア',
    notes: '復元テスト',
    isFavorite: true,
    ownershipStatus: 'owned',
    coverImageId: imageId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    schemaVersion: 1,
  }
}

function makeImage(): ImageRecord {
  const imageBlob = new Blob(['full-image'], { type: 'image/webp' })
  const thumbnailBlob = new Blob(['thumbnail'], { type: 'image/webp' })
  return {
    id: imageId,
    itemId,
    sortOrder: 0,
    imageBlob,
    thumbnailBlob,
    mimeType: 'image/webp',
    width: 1200,
    height: 1600,
    byteSize: imageBlob.size,
    focusX: 68,
    focusY: 24,
    createdAt: new Date('2026-10-21T00:00:00.000Z'),
  }
}

describe('complete backup', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
  })

  it('creates, inspects and restores items and photos', async () => {
    await saveItem(makeItem(), [makeImage()])
    const { blob, manifest } = await createBackup()
    const file = new File([blob], 'FashionArchive_Backup.zip', { type: 'application/zip' })

    expect(manifest.itemCount).toBe(1)
    expect(manifest.imageCount).toBe(1)
    expect((await db.settings.get('changesSinceBackup'))?.value).toBe(0)
    await expect(inspectBackup(file)).resolves.toMatchObject({
      manifest: { itemCount: 1, imageCount: 1 },
    })

    await db.items.update(itemId, { name: '変更後' })
    await db.images.clear()
    await db.drafts.put({
      key: 'new', itemId: 'stale-draft', draft: { name: '古い下書き', brand: '', categoryId: null, size: '', color: '', materials: [], measurements: { shoulderWidth: '', chestWidth: '', bodyLength: '', sleeveLength: '', waist: '', rise: '', inseam: '', thighWidth: '', hemWidth: '' }, originalPrice: '', purchasePrice: '', purchaseDate: '', purchaseMethod: '', purchaseSource: '', notes: '', isFavorite: false }, images: [], updatedAt: new Date(),
    })
    await restoreBackup(file)

    expect(await db.items.get(itemId)).toMatchObject({ name: 'バックアップ用コート', coverImageId: imageId, imageLayout: [{ imageId, focusX: 68, focusY: 24 }], ownershipStatus: 'owned', materials: [{ name: 'ウール', percentage: 100 }], measurements: { shoulderWidth: 47.5, bodyLength: 72 } })
    const restoredImage = await db.images.get(imageId)
    expect(restoredImage?.imageBlob.size).toBe(new Blob(['full-image']).size)
    expect(restoredImage?.thumbnailBlob.size).toBe(new Blob(['thumbnail']).size)
    expect(restoredImage).toMatchObject({ focusX: 68, focusY: 24 })
    expect(await db.drafts.count()).toBe(0)
    expect((await db.settings.get('schemaVersion'))?.value).toBe(8)
  })

  it('rejects a file that is not a Fashion Archive backup', async () => {
    const file = new File(['not a zip'], 'invalid.zip', { type: 'application/zip' })
    await expect(inspectBackup(file)).rejects.toThrow()
  })
})
