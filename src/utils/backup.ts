import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter } from '@zip.js/zip.js'
import { DATABASE_SCHEMA_VERSION, db, updateBackupTimestamp } from '../db'
import type { BackupManifest, CategoryRecord, ImageRecord, ItemMeasurements, ItemRecord, MaterialEntry, OwnershipStatus, SettingRecord } from '../types'
import { formatMaterials } from './materials'
import { formatMeasurements, sanitizeMeasurementsForCategory } from './measurements'
import { normalizeFocus } from './imageFocus'
import { arrangeImages, createImageLayout } from './imageLayout'

interface SerializedImage {
  id: string
  itemId: string
  sortOrder: number
  mimeType: string
  width: number
  height: number
  byteSize: number
  focusX?: number
  focusY?: number
  createdAt: string
  imageFile: string
  thumbnailFile: string
}

interface SerializedItem extends Omit<ItemRecord, 'createdAt' | 'updatedAt' | 'deletedAt' | 'ownershipStatus' | 'materials' | 'measurements'> {
  ownershipStatus?: OwnershipStatus
  materials?: MaterialEntry[]
  measurements?: ItemMeasurements
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface BackupContents {
  manifest: BackupManifest
  items: SerializedItem[]
  images: SerializedImage[]
  categories: CategoryRecord[]
  settings: SettingRecord[]
}

const json = (value: unknown) => new TextReader(JSON.stringify(value, null, 2))

export async function createBackup() {
  const [items, images, categories, settings] = await Promise.all([
    db.items.toArray(),
    db.images.toArray(),
    db.categories.orderBy('sortOrder').toArray(),
    db.settings.toArray(),
  ])
  const manifest: BackupManifest = {
    app: 'Fashion Archive',
    backupVersion: 1,
    schemaVersion: 6,
    createdAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    itemCount: items.length,
    imageCount: images.length,
    categoryCount: categories.length,
  }
  const serializedItems: SerializedItem[] = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    deletedAt: item.deletedAt?.toISOString() ?? null,
  }))
  const serializedImages: SerializedImage[] = images.map((image) => ({
    id: image.id,
    itemId: image.itemId,
    sortOrder: image.sortOrder,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    byteSize: image.byteSize,
    focusX: normalizeFocus(image.focusX),
    focusY: normalizeFocus(image.focusY),
    createdAt: image.createdAt.toISOString(),
    imageFile: `images/${image.id}.webp`,
    thumbnailFile: `thumbnails/${image.id}.webp`,
  }))

  const writer = new ZipWriter(new BlobWriter('application/zip'))
  await writer.add('manifest.json', json(manifest))
  await writer.add('items.json', json(serializedItems))
  await writer.add('images.json', json(serializedImages))
  await writer.add('categories.json', json(categories))
  await writer.add('settings.json', json(settings))
  for (const image of images) {
    await writer.add(`images/${image.id}.webp`, new BlobReader(image.imageBlob))
    await writer.add(`thumbnails/${image.id}.webp`, new BlobReader(image.thumbnailBlob))
  }
  const blob = await writer.close()
  await updateBackupTimestamp()
  return { blob, manifest }
}

export function downloadBackup(blob: Blob, createdAt: string) {
  const date = new Date(createdAt)
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '_',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `FashionArchive_Backup_${stamp}.zip`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

async function parseJsonEntry<T>(entries: Awaited<ReturnType<ZipReader<Blob>['getEntries']>>, name: string) {
  const entry = entries.find((candidate) => candidate.filename === name)
  if (!entry || !('getData' in entry)) throw new Error(`${name} が見つかりません。`)
  const text = await entry.getData(new TextWriter())
  return JSON.parse(text) as T
}

export async function inspectBackup(file: File): Promise<BackupContents> {
  const reader = new ZipReader(new BlobReader(file))
  try {
    const entries = await reader.getEntries()
    const manifest = await parseJsonEntry<BackupManifest>(entries, 'manifest.json')
    if (manifest.app !== 'Fashion Archive' || manifest.backupVersion !== 1) {
      throw new Error('Fashion Archiveの対応バックアップではありません。')
    }
    if (manifest.schemaVersion > 6) throw new Error('このバックアップには、より新しいアプリが必要です。')
    const [items, images, categories, settings] = await Promise.all([
      parseJsonEntry<SerializedItem[]>(entries, 'items.json'),
      parseJsonEntry<SerializedImage[]>(entries, 'images.json'),
      parseJsonEntry<CategoryRecord[]>(entries, 'categories.json'),
      parseJsonEntry<SettingRecord[]>(entries, 'settings.json'),
    ])
    if (items.length !== manifest.itemCount || images.length !== manifest.imageCount || categories.length !== manifest.categoryCount) {
      throw new Error('バックアップの件数が一致しません。')
    }
    return { manifest, items, images, categories, settings }
  } finally {
    await reader.close()
  }
}

export async function restoreBackup(file: File) {
  const metadata = await inspectBackup(file)
  const reader = new ZipReader(new BlobReader(file))
  try {
    const entries = await reader.getEntries()
    const images: ImageRecord[] = []
    for (const image of metadata.images) {
      const imageEntry = entries.find((entry) => entry.filename === image.imageFile)
      const thumbnailEntry = entries.find((entry) => entry.filename === image.thumbnailFile)
      if (!imageEntry || !thumbnailEntry || !('getData' in imageEntry) || !('getData' in thumbnailEntry)) throw new Error('バックアップ内の写真が不足しています。')
      const [imageBlob, thumbnailBlob] = await Promise.all([
        imageEntry.getData(new BlobWriter(image.mimeType)),
        thumbnailEntry.getData(new BlobWriter(image.mimeType)),
      ])
      images.push({
        id: image.id,
        itemId: image.itemId,
        sortOrder: image.sortOrder,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        byteSize: image.byteSize,
        focusX: normalizeFocus(image.focusX),
        focusY: normalizeFocus(image.focusY),
        createdAt: new Date(image.createdAt),
        imageBlob,
        thumbnailBlob,
      })
    }
    const items: ItemRecord[] = metadata.items.map((item) => {
      const itemImages = images.filter((image) => image.itemId === item.id)
      const arrangedImages = arrangeImages(itemImages, item.imageLayout)
      return {
        ...item,
        ownershipStatus: item.ownershipStatus ?? 'owned',
        materials: item.materials ?? [],
        measurements: sanitizeMeasurementsForCategory(item.measurements, item.categoryId),
        coverImageId: arrangedImages[0]?.id ?? null,
        imageLayout: createImageLayout(arrangedImages),
        schemaVersion: 6,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
      }
    })
    await db.transaction('rw', db.items, db.images, db.categories, db.settings, db.drafts, async () => {
      await Promise.all([db.items.clear(), db.images.clear(), db.categories.clear(), db.settings.clear(), db.drafts.clear()])
      if (items.length) await db.items.bulkAdd(items)
      if (images.length) await db.images.bulkAdd(images)
      if (metadata.categories.length) await db.categories.bulkAdd(metadata.categories)
      if (metadata.settings.length) await db.settings.bulkAdd(metadata.settings)
      await db.settings.put({ key: 'schemaVersion', value: DATABASE_SCHEMA_VERSION })
      await db.settings.put({ key: 'changesSinceBackup', value: 0 })
      await db.settings.put({ key: 'lastBackupAt', value: metadata.manifest.createdAt })
    })
    return metadata.manifest
  } finally {
    await reader.close()
  }
}

export async function exportCsv() {
  const [items, categories] = await Promise.all([
    db.items.filter((item) => item.deletedAt === null).toArray(),
    db.categories.toArray(),
  ])
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = items.map((item) => [
    item.name,
    item.brand,
    item.categoryId ? categoryNames.get(item.categoryId) ?? '' : '',
    item.size,
    item.color,
    formatMaterials(item.materials),
    formatMeasurements(item.measurements, item.categoryId),
    item.originalPrice ?? '',
    item.purchasePrice ?? '',
    item.purchaseDate ?? '',
    item.purchaseMethod ?? '',
    item.purchaseSource,
    item.ownershipStatus === 'wanted' ? 'ほしいもの' : '所有',
    item.isFavorite ? 'はい' : 'いいえ',
    item.notes,
    item.createdAt.toISOString(),
    item.updatedAt.toISOString(),
  ])
  const header = ['アイテム名', 'ブランド', 'カテゴリー', 'サイズ', 'カラー', '素材・混率', '採寸', '定価・想定価格', '購入価格', '購入日', '購入方法', '購入先・候補先', '状態', 'お気に入り', 'メモ', '登録日時', '更新日時']
  const content = `\uFEFF${[header, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `FashionArchive_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.csv`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
