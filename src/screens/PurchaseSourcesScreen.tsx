import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { db, markDataChanged } from '../db'
import { navigate } from '../hooks/useRoute'
import type { ItemRecord } from '../types'
import { MAX_FAVORITE_PURCHASE_SOURCES, PURCHASE_SOURCE_PREFERENCES_KEY, mergePurchaseSources, normalizePurchaseSourcePreferences, renamePurchaseSourcePreferences } from '../utils/purchaseSources'

export function PurchaseSourcesScreen() {
  const data = useLiveQuery(async () => {
    const [items, setting] = await Promise.all([db.items.toArray(), db.settings.get(PURCHASE_SOURCE_PREFERENCES_KEY)])
    return { items, preferences: normalizePurchaseSourcePreferences(setting?.value) }
  }, [], { items: [], preferences: { favorites: [], custom: [] } })
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState('')
  const sources = useMemo(() => mergePurchaseSources(data.items.map((item) => item.purchaseSource), data.preferences), [data])
  const usage = useMemo(() => {
    const map = new Map<string, ItemRecord[]>()
    for (const item of data.items) {
      const source = item.purchaseSource.trim()
      if (!source) continue
      const key = source.toLocaleLowerCase('ja-JP')
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [data.items])
  const favoriteKeys = useMemo(() => new Set(data.preferences.favorites.map((source) => source.toLocaleLowerCase('ja-JP'))), [data.preferences.favorites])
  const normalizedQuery = query.trim().toLocaleLowerCase('ja-JP')
  const filtered = normalizedQuery ? sources.filter((source) => source.toLocaleLowerCase('ja-JP').includes(normalizedQuery)) : sources

  const savePreferences = async (preferences: typeof data.preferences, status?: string) => {
    await db.settings.put({ key: PURCHASE_SOURCE_PREFERENCES_KEY, value: normalizePurchaseSourcePreferences(preferences) })
    await markDataChanged()
    if (status) setMessage(status)
  }

  const toggleFavorite = async (source: string) => {
    const key = source.toLocaleLowerCase('ja-JP')
    const isFavorite = favoriteKeys.has(key)
    if (!isFavorite && data.preferences.favorites.length >= MAX_FAVORITE_PURCHASE_SOURCES) {
      setMessage(`よく使う購入先は${MAX_FAVORITE_PURCHASE_SOURCES}件までです。いずれかの固定を外してください。`)
      return
    }
    const favorites = isFavorite
      ? data.preferences.favorites.filter((value) => value.toLocaleLowerCase('ja-JP') !== key)
      : [...data.preferences.favorites, source]
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
    if (sources.some((source) => source.toLocaleLowerCase('ja-JP') === name.toLocaleLowerCase('ja-JP'))) {
      setMessage('同じ購入先が既にあります。')
      return
    }
    await savePreferences({ ...data.preferences, custom: [...data.preferences.custom, name] }, '購入先候補を追加しました。')
    setNewName('')
  }

  const startRename = (source: string) => {
    setEditing(source)
    setEditName(source)
    setMessage('')
  }

  const rename = async () => {
    if (!editing) return
    const name = editName.trim()
    if (!name) {
      setMessage('購入先名を入力してください。')
      return
    }
    if (sources.some((source) => source.toLocaleLowerCase('ja-JP') === name.toLocaleLowerCase('ja-JP') && source.toLocaleLowerCase('ja-JP') !== editing.toLocaleLowerCase('ja-JP'))) {
      setMessage('同じ購入先が既にあります。')
      return
    }
    const affected = usage.get(editing.toLocaleLowerCase('ja-JP')) ?? []
    if (affected.length > 0 && !window.confirm(`${affected.length}件のアイテムに登録されている購入先を「${name}」へ変更しますか？`)) return
    const previousKey = editing.toLocaleLowerCase('ja-JP')
    const nextPreferences = renamePurchaseSourcePreferences(data.preferences, editing, name)
    await db.transaction('rw', db.items, db.drafts, db.settings, async () => {
      await db.items.filter((item) => item.purchaseSource.trim().toLocaleLowerCase('ja-JP') === previousKey).modify((item) => { item.purchaseSource = name; item.updatedAt = new Date() })
      await db.drafts.filter((draft) => draft.draft.purchaseSource.trim().toLocaleLowerCase('ja-JP') === previousKey).modify((draft) => { draft.draft.purchaseSource = name; draft.updatedAt = new Date() })
      await db.settings.put({ key: PURCHASE_SOURCE_PREFERENCES_KEY, value: nextPreferences })
    })
    await markDataChanged()
    setEditing(null)
    setMessage('購入先名を変更しました。')
  }

  const remove = async (source: string) => {
    const usedItems = usage.get(source.toLocaleLowerCase('ja-JP')) ?? []
    if (usedItems.length > 0) {
      const names = usedItems.slice(0, 5).map((item) => `・${item.name}${item.deletedAt ? '（ゴミ箱）' : ''}`).join('\n')
      const rest = usedItems.length > 5 ? `\nほか${usedItems.length - 5}件` : ''
      window.alert(`${usedItems.length}件のアイテムで使用中のため削除できません。先に各アイテムの購入先を変更してください。\n\n${names}${rest}`)
      return
    }
    if (!window.confirm(`「${source}」を候補から削除しますか？`)) return
    const key = source.toLocaleLowerCase('ja-JP')
    await savePreferences({
      favorites: data.preferences.favorites.filter((value) => value.toLocaleLowerCase('ja-JP') !== key),
      custom: data.preferences.custom.filter((value) => value.toLocaleLowerCase('ja-JP') !== key),
    }, '購入先候補を削除しました。')
  }

  return <main className="screen sub-screen purchase-sources-screen"><AppHeader title="購入先候補" back={() => navigate('settings')} />
    <section className="sub-heading"><span>PURCHASE SOURCES</span><h1>購入先候補</h1><p>よく使う購入先を、選択画面の上部に固定できます。</p></section>
    <section className="source-favorites"><div className="source-section-heading"><h2>よく使う</h2><span>{data.preferences.favorites.length} / {MAX_FAVORITE_PURCHASE_SOURCES}</span></div>
      {data.preferences.favorites.length === 0 && <p className="source-empty">下の候補にある☆を押すと、ここに固定されます。</p>}
      {data.preferences.favorites.map((source, index) => <div className="source-favorite-row" key={source}><span className="category-order"><button type="button" disabled={index === 0} onClick={() => moveFavorite(index, -1)} aria-label={`${source}を上へ移動`}><ChevronUp aria-hidden="true" /></button><button type="button" disabled={index === data.preferences.favorites.length - 1} onClick={() => moveFavorite(index, 1)} aria-label={`${source}を下へ移動`}><ChevronDown aria-hidden="true" /></button></span><strong>{source}</strong><button className="source-star active" type="button" onClick={() => toggleFavorite(source)} aria-label={`${source}の固定を外す`}><Star aria-hidden="true" /></button></div>)}
    </section>
    <form className="category-add source-add" onSubmit={(event) => { event.preventDefault(); add() }}><label><span>新しい購入先候補</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="例：公式オンラインストア" /></label><button className="primary-button" type="submit"><Plus aria-hidden="true" />追加</button></form>
    {message && <p className="measurement-management-message source-message" role="status">{message}</p>}
    <section className="source-all"><div className="source-section-heading"><h2>すべての候補</h2><span>{sources.length}件</span></div>
      {sources.length > 8 && <label className="source-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="購入先を検索" aria-label="購入先候補を検索" /></label>}
      <div className="source-list">{filtered.map((source) => {
        const count = usage.get(source.toLocaleLowerCase('ja-JP'))?.length ?? 0
        const favorite = favoriteKeys.has(source.toLocaleLowerCase('ja-JP'))
        return <div key={source}><button className={favorite ? 'source-star active' : 'source-star'} type="button" onClick={() => toggleFavorite(source)} aria-label={`${source}を${favorite ? '固定から外す' : 'よく使う購入先に固定'}`}><Star aria-hidden="true" /></button><div><strong>{source}</strong><span>{count > 0 ? `${count}件で使用中` : '未使用'}</span></div><button type="button" onClick={() => startRename(source)} aria-label={`${source}の名称を変更`}><Pencil aria-hidden="true" /></button><button className="danger" type="button" onClick={() => remove(source)} aria-label={`${source}を削除`}><Trash2 aria-hidden="true" /></button></div>
      })}{filtered.length === 0 && <p className="source-empty">一致する購入先はありません。</p>}</div>
    </section>
    {editing && <div className="sheet-backdrop source-edit-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><section className="bottom-sheet source-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="source-edit-title"><div className="sheet-handle" /><header><h2 id="source-edit-title">購入先名を変更</h2><button className="icon-button" type="button" onClick={() => setEditing(null)} aria-label="閉じる"><X aria-hidden="true" /></button></header><label><span>購入先名</span><input value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus /></label><p>{(usage.get(editing.toLocaleLowerCase('ja-JP'))?.length ?? 0) > 0 ? '名称変更は、この購入先を使用しているアイテムにも反映されます。' : '設定した候補の名称を変更します。'}</p><button className="primary-button block" type="button" onClick={rename}>変更を保存</button></section></div>}
  </main>
}
