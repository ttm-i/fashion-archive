import type { ImageLayoutEntry, ImageRecord, ItemRecord } from '../types'
import { normalizeFocus, normalizeImageFocus } from './imageFocus'

export function createImageLayout(images: ImageRecord[]): ImageLayoutEntry[] {
  return images.map((image) => ({
    imageId: image.id,
    focusX: normalizeFocus(image.focusX),
    focusY: normalizeFocus(image.focusY),
  }))
}

export function arrangeImages(images: ImageRecord[], layout: ImageLayoutEntry[] | undefined): ImageRecord[] {
  const imageMap = new Map(images.map((image) => [image.id, normalizeImageFocus(image)]))
  const arranged: ImageRecord[] = []
  const seen = new Set<string>()

  for (const entry of layout ?? []) {
    const image = imageMap.get(entry.imageId)
    if (!image || seen.has(image.id)) continue
    arranged.push({ ...image, focusX: normalizeFocus(entry.focusX), focusY: normalizeFocus(entry.focusY) })
    seen.add(image.id)
  }

  const remaining = [...imageMap.values()]
    .filter((image) => !seen.has(image.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return [...arranged, ...remaining].map((image, sortOrder) => ({ ...image, sortOrder }))
}

export function imageFocus(item: ItemRecord, imageId: string) {
  const entry = item.imageLayout?.find((candidate) => candidate.imageId === imageId)
  return { x: normalizeFocus(entry?.focusX), y: normalizeFocus(entry?.focusY) }
}
