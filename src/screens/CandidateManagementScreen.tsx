import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { db, markDataChanged } from '../db'
import { navigate } from '../hooks/useRoute'
import type { ItemDraft, ItemRecord } from '../types'
import type { CandidatePreferences } from '../utils/candidatePreferences'

type CandidateField = Extract<keyof ItemRecord & keyof ItemDraft, 'brand' | 'purchaseSource'>

export interface CandidateManagementConfig {
  field: CandidateField
  settingKey: string
  maximum: number
  normalize: (value: unknown) => CandidatePreferences
  merge: (values: string[], preferences: CandidatePreferences) => string[]
  renamePreferences: (preferences: CandidatePreferences, previous: string, next: string) => CandidatePreferences
  overline: string
  entityLabel: string
  favoriteTitle: string
  favoriteDescription: string
  favoriteActionLabel: string
  example: string
  searchAlways?: boolean
}

export function CandidateManagementScreen({ config }: { config: CandidateManagementConfig }) {
  const data = useLiveQuery(async () => {
    const [items, setting] = await Promise.all([db.items.toArray(), db.settings.get(config.settingKey)])
    return { items, preferences: config.normalize(setting?.value) }
  }, [config.settingKey], { items: [], preferences: { favorites: [], custom: [] } })
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState('')
  const candidates = useMemo(() => config.merge(data.items.map((item) => item[config.field]), data.preferences), [config, data])
  const usage = useMemo(() => {
    const map = new Map<string, ItemRecord[]>()
    for (const item of data.items) {
      const value = item[config.field].trim()
      if (!value) continue
      const key = value.toLocaleLowerCase('ja-JP')
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [config.field, data.items])
  const favoriteKeys = useMemo(() => new Set(data.preferences.favorites.map((candidate) => candidate.toLocaleLowerCase('ja-JP'))), [data.preferences.favorites])
  const normalizedQuery = query.trim().toLocaleLowerCase('ja-JP')
  const filtered = normalizedQuery ? candidates.filter((candidate) => candidate.toLocaleLowerCase('ja-JP').includes(normalizedQuery)) : candidates

  const savePreferences = async (preferences: CandidatePreferences, status?: string) => {
    await db.settings.put({ key: config.settingKey, value: config.normalize(preferences) })
    await markDataChanged()
    if (status) setMessage(status)
  }

  const toggleFavorite = async (candidate: string) => {
    const key = candidate.toLocaleLowerCase('ja-JP')
    const isFavorite = favoriteKeys.has(key)
    if (!isFavorite && data.preferences.favorites.length >= config.maximum) {
      setMessage(`${config.favoriteTitle}は${config.maximum}件までです。いずれかの固定を外してください。`)
      return
    }
    const favorites = isFavorite
      ? data.preferences.favorites.filter((value) => value.toLocaleLowerCase('ja-JP') !== key)
      : [...data.preferences.favorites, candidate]
    await savePreferences({ ...data.preferences, favorites }, isFavorite ? '固定を外しました。' : '一覧の上部に固定しました。')
  }

  const moveFavorite = async (index: number, offset: -1 | 1) => {
    const favorites = [...data.preferences.favorites]
    const target = index + offset
    if (!favorites[index] || !favorites[target]) return
    ;[favorites[index], favorites[target]] = [favorites[target], favorites[index]]
    await savePreferences({ ...data.preferences, favorites })
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    if (candidates.some((candidate) => candidate.toLocaleLowerCase('ja-JP') === name.toLocaleLowerCase('ja-JP'))) {
      setMessage(`同じ${config.entityLabel}が既にあります。`)
      return
    }
    await savePreferences({ ...data.preferences, custom: [...data.preferences.custom, name] }, `${config.entityLabel}候補を追加しました。`)
    setNewName('')
  }

  const startRename = (candidate: string) => {
    setEditing(candidate)
    setEditName(candidate)
    setMessage('')
  }

  const rename = async () => {
    if (!editing) return
    const name = editName.trim()
    if (!name) {
      setMessage(`${config.entityLabel}名を入力してください。`)
      return
    }
    if (candidates.some((candidate) => candidate.toLocaleLowerCase('ja-JP') === name.toLocaleLowerCase('ja-JP') && candidate.toLocaleLowerCase('ja-JP') !== editing.toLocaleLowerCase('ja-JP'))) {
      setMessage(`同じ${config.entityLabel}が既にあります。`)
      return
    }
    const affected = usage.get(editing.toLocaleLowerCase('ja-JP')) ?? []
    if (affected.length > 0 && !window.confirm(`${affected.length}件のアイテムに登録されている${config.entityLabel}を「${name}」へ変更しますか？`)) return
    const previousKey = editing.toLocaleLowerCase('ja-JP')
    const nextPreferences = config.renamePreferences(data.preferences, editing, name)
    await db.transaction('rw', db.items, db.drafts, db.settings, async () => {
      await db.items.filter((item) => item[config.field].trim().toLocaleLowerCase('ja-JP') === previousKey).modify((item) => { item[config.field] = name; item.updatedAt = new Date() })
      await db.drafts.filter((draft) => draft.draft[config.field].trim().toLocaleLowerCase('ja-JP') === previousKey).modify((draft) => { draft.draft[config.field] = name; draft.updatedAt = new Date() })
      await db.settings.put({ key: config.settingKey, value: nextPreferences })
    })
    await markDataChanged()
    setEditing(null)
    setMessage(`${config.entityLabel}名を変更しました。`)
  }

  const remove = async (candidate: string) => {
    const usedItems = usage.get(candidate.toLocaleLowerCase('ja-JP')) ?? []
    if (usedItems.length > 0) {
      const names = usedItems.slice(0, 5).map((item) => `・${item.name}${item.deletedAt ? '（ゴミ箱）' : ''}`).join('\n')
      const rest = usedItems.length > 5 ? `\nほか${usedItems.length - 5}件` : ''
      window.alert(`${usedItems.length}件のアイテムで使用中のため削除できません。先に各アイテムの${config.entityLabel}を変更してください。\n\n${names}${rest}`)
      return
    }
    if (!window.confirm(`「${candidate}」を候補から削除しますか？`)) return
    const key = candidate.toLocaleLowerCase('ja-JP')
    await savePreferences({
      favorites: data.preferences.favorites.filter((value) => value.toLocaleLowerCase('ja-JP') !== key),
      custom: data.preferences.custom.filter((value) => value.toLocaleLowerCase('ja-JP') !== key),
    }, `${config.entityLabel}候補を削除しました。`)
  }

  return <main className="screen sub-screen candidate-management-screen"><AppHeader title={`${config.entityLabel}候補`} back={() => navigate('settings')} />
    <section className="sub-heading"><span>{config.overline}</span><h1>{config.entityLabel}候補</h1><p>{config.favoriteDescription}</p></section>
    <section className="source-favorites"><div className="source-section-heading"><h2>{config.favoriteTitle}</h2><span>{data.preferences.favorites.length} / {config.maximum}</span></div>
      {data.preferences.favorites.length === 0 && <p className="source-empty">下の候補にある☆を押すと、ここに固定されます。</p>}
      {data.preferences.favorites.map((candidate, index) => <div className="source-favorite-row" key={candidate}><span className="category-order"><button type="button" disabled={index === 0} onClick={() => moveFavorite(index, -1)} aria-label={`${candidate}を上へ移動`}><ChevronUp aria-hidden="true" /></button><button type="button" disabled={index === data.preferences.favorites.length - 1} onClick={() => moveFavorite(index, 1)} aria-label={`${candidate}を下へ移動`}><ChevronDown aria-hidden="true" /></button></span><strong>{candidate}</strong><button className="source-star active" type="button" onClick={() => toggleFavorite(candidate)} aria-label={`${candidate}の固定を外す`}><Star aria-hidden="true" /></button></div>)}
    </section>
    <form className="category-add source-add" onSubmit={(event) => { event.preventDefault(); add() }}><label><span>新しい{config.entityLabel}候補</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={`例：${config.example}`} /></label><button className="primary-button" type="submit"><Plus aria-hidden="true" />追加</button></form>
    {message && <p className="measurement-management-message source-message" role="status">{message}</p>}
    <section className="source-all"><div className="source-section-heading"><h2>すべての候補</h2><span>{candidates.length}件</span></div>
      {(config.searchAlways || candidates.length > 8) && <label className="source-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`${config.entityLabel}を検索`} aria-label={`${config.entityLabel}候補を検索`} /></label>}
      <div className="source-list">{filtered.map((candidate) => {
        const count = usage.get(candidate.toLocaleLowerCase('ja-JP'))?.length ?? 0
        const favorite = favoriteKeys.has(candidate.toLocaleLowerCase('ja-JP'))
        return <div key={candidate}><button className={favorite ? 'source-star active' : 'source-star'} type="button" onClick={() => toggleFavorite(candidate)} aria-label={`${candidate}を${favorite ? '固定から外す' : config.favoriteActionLabel}`}><Star aria-hidden="true" /></button><div><strong>{candidate}</strong><span>{count > 0 ? `${count}件で使用中` : '未使用'}</span></div><button type="button" onClick={() => startRename(candidate)} aria-label={`${candidate}の名称を変更`}><Pencil aria-hidden="true" /></button><button className="danger" type="button" onClick={() => remove(candidate)} aria-label={`${candidate}を削除`}><Trash2 aria-hidden="true" /></button></div>
      })}{filtered.length === 0 && <p className="source-empty">一致する{config.entityLabel}はありません。</p>}</div>
    </section>
    {editing && <div className="sheet-backdrop source-edit-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><section className="bottom-sheet source-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="candidate-edit-title"><div className="sheet-handle" /><header><h2 id="candidate-edit-title">{config.entityLabel}名を変更</h2><button className="icon-button" type="button" onClick={() => setEditing(null)} aria-label="閉じる"><X aria-hidden="true" /></button></header><label><span>{config.entityLabel}名</span><input value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus /></label><p>{(usage.get(editing.toLocaleLowerCase('ja-JP'))?.length ?? 0) > 0 ? `名称変更は、この${config.entityLabel}を使用しているアイテムにも反映されます。` : '設定した候補の名称を変更します。'}</p><button className="primary-button block" type="button" onClick={rename}>変更を保存</button></section></div>}
  </main>
}
