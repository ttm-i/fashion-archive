import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { db, markDataChanged } from '../db'
import { navigate } from '../hooks/useRoute'

export function CategoriesScreen() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [], [])
  const [newName, setNewName] = useState('')
  const add = async () => {
    const name = newName.trim()
    if (!name) return
    await db.categories.add({ id: crypto.randomUUID(), name, sortOrder: categories.length, isActive: true })
    await markDataChanged()
    setNewName('')
  }
  const rename = async (id: string, name: string) => {
    const trimmed = name.trim()
    if (trimmed) {
      await db.categories.update(id, { name: trimmed })
      await markDataChanged()
    }
  }
  const remove = async (id: string) => {
    const count = await db.items.where('categoryId').equals(id).count()
    if (count > 0) {
      window.alert(`${count}件のアイテムで使用中のため削除できません。先にアイテムのカテゴリーを変更してください。`)
      return
    }
    if (window.confirm('このカテゴリーを削除しますか？')) {
      await db.categories.delete(id)
      await markDataChanged()
    }
  }
  const move = async (index: number, offset: -1 | 1) => {
    const other = categories[index + offset]
    const current = categories[index]
    if (!current || !other) return
    await db.transaction('rw', db.categories, async () => {
      await db.categories.update(current.id, { sortOrder: other.sortOrder })
      await db.categories.update(other.id, { sortOrder: current.sortOrder })
    })
    await markDataChanged()
  }
  return <main className="screen sub-screen"><AppHeader title="カテゴリー管理" back={() => navigate('settings')} />
    <section className="sub-heading"><span>CATEGORIES</span><h1>カテゴリー</h1><p>表示順や名称を変更し、新しい分類を追加できます。</p></section>
    <div className="category-list">{categories.map((category, index) => <CategoryRow key={category.id} id={category.id} initialName={category.name} canMoveUp={index > 0} canMoveDown={index < categories.length - 1} onMove={(offset) => move(index, offset)} onSave={rename} onDelete={remove} />)}</div>
    <form className="category-add" onSubmit={(event) => { event.preventDefault(); add() }}><label><span>新しいカテゴリー</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="カテゴリー名" /></label><button className="primary-button" type="submit"><Plus aria-hidden="true" />追加</button></form>
  </main>
}

function CategoryRow({ id, initialName, canMoveUp, canMoveDown, onMove, onSave, onDelete }: { id: string; initialName: string; canMoveUp: boolean; canMoveDown: boolean; onMove: (offset: -1 | 1) => void; onSave: (id: string, name: string) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState(initialName)
  return <div><span className="category-order"><button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)} aria-label="上へ移動"><ChevronUp aria-hidden="true" /></button><button type="button" disabled={!canMoveDown} onClick={() => onMove(1)} aria-label="下へ移動"><ChevronDown aria-hidden="true" /></button></span><input value={name} onChange={(event) => setName(event.target.value)} aria-label={`${initialName}の名称`} /><button type="button" onClick={() => onSave(id, name)} aria-label="名称を保存"><Save aria-hidden="true" /></button><button className="danger" type="button" onClick={() => onDelete(id)} aria-label="カテゴリーを削除"><Trash2 aria-hidden="true" /></button></div>
}
