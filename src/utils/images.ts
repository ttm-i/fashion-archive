import type { ImageRecord } from '../types'
import { DEFAULT_IMAGE_FOCUS } from './imageFocus'

const FULL_MAX = 2048
const THUMB_MAX = 640

async function loadImage(file: Blob) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function dimensions(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('写真を変換できませんでした。'))), type, quality)
  })
}

async function renderVariant(image: HTMLImageElement, max: number, quality: number) {
  const size = dimensions(image.naturalWidth, image.naturalHeight, max)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('この端末では写真を処理できません。')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, size.width, size.height)
  const blob = await canvasBlob(canvas, 'image/webp', quality)
  return { blob, ...size }
}

export async function prepareImage(file: File, itemId: string, sortOrder: number): Promise<ImageRecord> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください。')
  const image = await loadImage(file)
  try {
    const full = await renderVariant(image, FULL_MAX, 0.85)
    const thumbnail = await renderVariant(image, THUMB_MAX, 0.8)
    return {
      id: crypto.randomUUID(),
      itemId,
      sortOrder,
      imageBlob: full.blob,
      thumbnailBlob: thumbnail.blob,
      mimeType: full.blob.type || 'image/webp',
      width: full.width,
      height: full.height,
      byteSize: full.blob.size,
      focusX: DEFAULT_IMAGE_FOCUS,
      focusY: DEFAULT_IMAGE_FOCUS,
      createdAt: new Date(),
    }
  } finally {
    URL.revokeObjectURL(image.src)
  }
}

export function blobUrl(blob: Blob | undefined) {
  return blob ? URL.createObjectURL(blob) : ''
}
