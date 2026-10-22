import type { ImageRecord } from '../types'

export const DEFAULT_IMAGE_FOCUS = 50

export function normalizeFocus(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number)) return DEFAULT_IMAGE_FOCUS
  return Math.min(100, Math.max(0, number))
}

export function normalizeImageFocus(image: ImageRecord): ImageRecord {
  return {
    ...image,
    focusX: normalizeFocus(image.focusX),
    focusY: normalizeFocus(image.focusY),
  }
}
