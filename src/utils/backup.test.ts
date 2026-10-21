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
    originalPrice: 45000,
    purchasePrice: 32000,
    purchaseDate: '2026-10-01',
    purchaseMethod: '公式オンライン',
    purchaseSource: '公式ストア',
    notes: '復元テスト',
    isFavorite: true,
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
    await expect(inspectBackup(file)).resolves.toMatchObject({
      manifest: { itemCount: 1, imageCount: 1 },
    })

    await db.items.update(itemId, { name: '変更後' })
    await db.images.clear()
    await restoreBackup(file)

    expect(await db.items.get(itemId)).toMatchObject({ name: 'バックアップ用コート', coverImageId: imageId })
    const restoredImage = await db.images.get(imageId)
    expect(restoredImage?.imageBlob.size).toBe(new Blob(['full-image']).size)
    expect(restoredImage?.thumbnailBlob.size).toBe(new Blob(['thumbnail']).size)
  })

  it('rejects a file that is not a Fashion Archive backup', async () => {
    const file = new File(['not a zip'], 'invalid.zip', { type: 'application/zip' })
    await expect(inspectBackup(file)).rejects.toThrow()
  })
})
