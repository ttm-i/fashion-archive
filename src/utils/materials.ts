import type { MaterialDraft, MaterialEntry } from '../types'

export function parseMaterials(rows: MaterialDraft[]): MaterialEntry[] {
  const entered = rows
    .map((row) => ({ ...row, name: row.name.trim(), percentage: row.percentage.trim() }))
    .filter((row) => row.name || row.percentage)

  const hasPercentage = entered.some((row) => row.percentage !== '')
  const materials = entered.map((row, index) => {
    if (!row.name) throw new Error(`${index + 1}件目の素材名を入力してください。`)
    if (!hasPercentage) return { id: row.id, name: row.name, percentage: null }
    if (!row.percentage) throw new Error(`${row.name}の混率を入力してください。`)

    const percentage = Number(row.percentage.replace(',', '.'))
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      throw new Error(`${row.name}の混率は、0より大きく100以下の数値で入力してください。`)
    }
    return { id: row.id, name: row.name, percentage }
  })

  if (hasPercentage) {
    const total = materials.reduce((sum, material) => sum + (material.percentage ?? 0), 0)
    if (Math.abs(total - 100) > 0.001) throw new Error(`素材の混率は合計100%にしてください（現在 ${total}%）。`)
  }
  return materials
}

export function formatMaterials(materials: MaterialEntry[] | undefined) {
  return (materials ?? [])
    .map((material) => material.percentage === null ? material.name : `${material.name} ${material.percentage}%`)
    .join(' / ')
}
