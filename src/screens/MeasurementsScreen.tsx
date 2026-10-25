import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Plus, Save, Trash2, X } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { db, markDataChanged } from '../db'
import { navigate } from '../hooks/useRoute'
import type { ItemRecord, MeasurementDefinition } from '../types'
import { DEFAULT_MEASUREMENT_DEFINITIONS, MEASUREMENT_DEFINITIONS_SETTING_KEY, measurementDefinitionsForCategory, normalizeMeasurementDefinitions } from '../utils/measurements'

type MeasurementCategoryId = MeasurementDefinition['categoryId']

const SUPPORTED_CATEGORIES: Array<{ id: MeasurementCategoryId; fallbackName: string }> = [
  { id: 'outerwear', fallbackName: 'アウター' },
  { id: 'tops', fallbackName: 'トップス' },
  { id: 'bottoms', fallbackName: 'ボトムス' },
]

export function MeasurementsScreen() {
  const data = useLiveQuery(async () => {
    const [setting, categories] = await Promise.all([
      db.settings.get(MEASUREMENT_DEFINITIONS_SETTING_KEY),
      db.categories.toArray(),
    ])
    return { definitions: normalizeMeasurementDefinitions(setting?.value), categories }
  }, [], { definitions: DEFAULT_MEASUREMENT_DEFINITIONS, categories: [] })
  const [categoryId, setCategoryId] = useState<MeasurementCategoryId>('outerwear')
  const [newName, setNewName] = useState('')
  const [message, setMessage] = useState('')
  const [blockedDelete, setBlockedDelete] = useState<{ name: string; items: ItemRecord[] } | null>(null)
  const definitions = data.definitions
  const currentDefinitions = useMemo(() => measurementDefinitionsForCategory(categoryId, definitions), [categoryId, definitions])
  const categoryNames = useMemo(() => new Map(data.categories.map((category) => [category.id, category.name])), [data.categories])

  const saveDefinitions = async (next: MeasurementDefinition[]) => {
    await db.settings.put({ key: MEASUREMENT_DEFINITIONS_SETTING_KEY, value: next })
    await markDataChanged()
  }

  const validateName = (name: string, exceptId?: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setMessage('項目名を入力してください。')
      return null
    }
    const duplicate = currentDefinitions.some((definition) => definition.id !== exceptId && definition.name.toLocaleLowerCase('ja-JP') === trimmed.toLocaleLowerCase('ja-JP'))
    if (duplicate) {
      setMessage('同じ名前の寸法項目が既にあります。')
      return null
    }
    setMessage('')
    return trimmed
  }

  const add = async () => {
    const name = validateName(newName)
    if (!name) return
    await saveDefinitions([...definitions, { id: crypto.randomUUID(), categoryId, name, sortOrder: currentDefinitions.length }])
    setNewName('')
  }

  const rename = async (id: string, value: string) => {
    const name = validateName(value, id)
    if (!name) return
    await saveDefinitions(definitions.map((definition) => definition.categoryId === categoryId && definition.id === id ? { ...definition, name } : definition))
    setMessage('項目名を保存しました。')
  }

  const move = async (index: number, offset: -1 | 1) => {
    const reordered = [...currentDefinitions]
    const target = index + offset
    if (!reordered[index] || !reordered[target]) return
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const order = new Map(reordered.map((definition, sortOrder) => [definition.id, sortOrder]))
    await saveDefinitions(definitions.map((definition) => definition.categoryId === categoryId ? { ...definition, sortOrder: order.get(definition.id) ?? definition.sortOrder } : definition))
  }

  const remove = async (definition: MeasurementDefinition) => {
    const usedItems = await db.items.filter((item) => item.categoryId === categoryId && item.measurements?.[definition.id] !== undefined).toArray()
    if (usedItems.length > 0) {
      setBlockedDelete({ name: definition.name, items: usedItems })
      return
    }
    if (!window.confirm(`「${definition.name}」を削除しますか？`)) return
    const remaining = definitions.filter((candidate) => !(candidate.categoryId === categoryId && candidate.id === definition.id))
    const normalized = measurementDefinitionsForCategory(categoryId, remaining)
    const order = new Map(normalized.map((candidate, sortOrder) => [candidate.id, sortOrder]))
    await saveDefinitions(remaining.map((candidate) => candidate.categoryId === categoryId ? { ...candidate, sortOrder: order.get(candidate.id) ?? candidate.sortOrder } : candidate))
    setMessage('寸法項目を削除しました。')
  }

  return <main className="screen sub-screen"><AppHeader title="寸法項目管理" back={() => navigate('settings')} />
    <section className="sub-heading"><span>MEASUREMENTS</span><h1>寸法項目</h1><p>カテゴリーごとに、記録する寸法の名称と順序を整えます。</p></section>
    <div className="measurement-category-tabs" role="tablist" aria-label="カテゴリー">
      {SUPPORTED_CATEGORIES.map((category) => <button key={category.id} className={categoryId === category.id ? 'active' : ''} type="button" role="tab" aria-selected={categoryId === category.id} onClick={() => { setCategoryId(category.id); setMessage('') }}>{categoryNames.get(category.id) ?? category.fallbackName}</button>)}
    </div>
    <p className="measurement-management-note">名称変更は登録済みアイテムにも反映されます。数値が登録されている項目は削除できません。</p>
    {message && <p className="measurement-management-message" role="status">{message}</p>}
    <div className="measurement-type-list">
      {currentDefinitions.map((definition, index) => <MeasurementRow key={`${definition.categoryId}:${definition.id}`} definition={definition} canMoveUp={index > 0} canMoveDown={index < currentDefinitions.length - 1} onMove={(offset) => move(index, offset)} onSave={rename} onDelete={() => remove(definition)} />)}
      {currentDefinitions.length === 0 && <p className="measurement-type-empty">寸法項目はまだありません。</p>}
    </div>
    <form className="category-add measurement-add" onSubmit={(event) => { event.preventDefault(); add() }}><label><span>新しい寸法項目</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="例：裄丈" /></label><button className="primary-button" type="submit"><Plus aria-hidden="true" />追加</button></form>
    {blockedDelete && <div className="sheet-backdrop measurement-usage-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setBlockedDelete(null)}><section className="bottom-sheet measurement-usage-sheet" role="dialog" aria-modal="true" aria-labelledby="measurement-usage-title"><div className="sheet-handle" /><header><h2 id="measurement-usage-title">「{blockedDelete.name}」は削除できません</h2><button className="icon-button" type="button" onClick={() => setBlockedDelete(null)} aria-label="閉じる"><X aria-hidden="true" /></button></header><p>次のアイテムで数値が使われています。先に各アイテムの寸法を空欄にしてください。</p><ul>{blockedDelete.items.map((item) => <li key={item.id}>{item.name}{item.deletedAt && <span>（ゴミ箱）</span>}</li>)}</ul><button className="primary-button block" type="button" onClick={() => setBlockedDelete(null)}>確認しました</button></section></div>}
  </main>
}

function MeasurementRow({ definition, canMoveUp, canMoveDown, onMove, onSave, onDelete }: { definition: MeasurementDefinition; canMoveUp: boolean; canMoveDown: boolean; onMove: (offset: -1 | 1) => void; onSave: (id: string, name: string) => void; onDelete: () => void }) {
  const [name, setName] = useState(definition.name)
  useEffect(() => setName(definition.name), [definition.name])
  return <div><span className="category-order"><button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)} aria-label="上へ移動"><ChevronUp aria-hidden="true" /></button><button type="button" disabled={!canMoveDown} onClick={() => onMove(1)} aria-label="下へ移動"><ChevronDown aria-hidden="true" /></button></span><input value={name} onChange={(event) => setName(event.target.value)} aria-label={`${definition.name}の名称`} /><button type="button" onClick={() => onSave(definition.id, name)} aria-label="名称を保存"><Save aria-hidden="true" /></button><button className="danger" type="button" onClick={onDelete} aria-label={`${definition.name}を削除`}><Trash2 aria-hidden="true" /></button></div>
}
