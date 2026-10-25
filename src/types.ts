export const PURCHASE_METHODS = [
  '実店舗',
  '公式オンライン',
  '総合オンライン',
  'フリマ・中古',
  'その他',
] as const

export type PurchaseMethod = (typeof PURCHASE_METHODS)[number]
export type OwnershipStatus = 'owned' | 'wanted'

export interface MaterialEntry {
  id: string
  name: string
  percentage: number | null
}

export interface MaterialDraft {
  id: string
  name: string
  percentage: string
}

export type MeasurementKey = string
export type ItemMeasurements = Partial<Record<MeasurementKey, number>>
export type MeasurementDraft = Record<MeasurementKey, string>

export interface MeasurementDefinition {
  id: string
  categoryId: 'outerwear' | 'tops' | 'bottoms'
  name: string
  sortOrder: number
}

export interface ImageLayoutEntry {
  imageId: string
  focusX: number
  focusY: number
}

export interface ItemRecord {
  id: string
  name: string
  brand: string
  categoryId: string | null
  size: string
  color: string
  materials: MaterialEntry[]
  measurements: ItemMeasurements
  originalPrice: number | null
  purchasePrice: number | null
  purchaseDate: string | null
  purchaseMethod: PurchaseMethod | null
  purchaseSource: string
  notes: string
  isFavorite: boolean
  ownershipStatus: OwnershipStatus
  coverImageId: string | null
  imageLayout?: ImageLayoutEntry[]
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  schemaVersion: number
}

export interface ImageRecord {
  id: string
  itemId: string
  sortOrder: number
  imageBlob: Blob
  thumbnailBlob: Blob
  mimeType: string
  width: number
  height: number
  byteSize: number
  focusX: number
  focusY: number
  createdAt: Date
}

export interface CategoryRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface SettingRecord {
  key: string
  value: unknown
}

export interface EditorDraftRecord {
  key: string
  itemId: string
  draft: ItemDraft
  images: ImageRecord[]
  updatedAt: Date
}

export type SortMode =
  | 'purchase-newest'
  | 'purchase-oldest'
  | 'created-newest'
  | 'name'
  | 'brand'
  | 'price-high'
  | 'price-low'

export interface ItemDraft {
  name: string
  brand: string
  categoryId: string | null
  size: string
  color: string
  materials: MaterialDraft[]
  measurements: MeasurementDraft
  originalPrice: string
  purchasePrice: string
  purchaseDate: string
  purchaseMethod: PurchaseMethod | ''
  purchaseSource: string
  notes: string
  isFavorite: boolean
}

export interface BackupManifest {
  app: 'Fashion Archive'
  backupVersion: 1
  schemaVersion: number
  createdAt: string
  appVersion: string
  itemCount: number
  imageCount: number
  categoryCount: number
}
