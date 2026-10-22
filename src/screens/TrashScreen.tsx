import { useLiveQuery } from 'dexie-react-hooks'
import { RotateCcw, Trash2 } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { ItemImage } from '../components/ItemImage'
import { db, emptyTrash, permanentlyDeleteItem, restoreItem } from '../db'
import { navigate } from '../hooks/useRoute'
import { formatDate } from '../utils/format'

export function TrashScreen() {
  const items = useLiveQuery(() => db.items.filter((item) => item.deletedAt !== null).toArray(), [], [])
  const images = useLiveQuery(() => db.images.toArray(), [], [])
  const imageMap = new Map(images.map((image) => [image.id, image]))
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const oldItemCount = items.filter((item) => (item.deletedAt?.getTime() ?? Date.now()) < thirtyDaysAgo).length
  const clear = async () => {
    if (!items.length || !window.confirm(`${items.length}件のアイテムと写真を完全に削除します。この操作は元に戻せません。`)) return
    await emptyTrash()
  }
  return <main className="screen sub-screen"><AppHeader title="ゴミ箱" back={() => navigate('settings')} action={items.length ? <button className="text-action danger" type="button" onClick={clear}>空にする</button> : null} />
    <section className="sub-heading"><span>TRASH</span><h1>ゴミ箱</h1><p>自動では完全削除されません。</p></section>
    {oldItemCount > 0 && <p className="trash-reminder">30日以上前に削除したアイテムが{oldItemCount}件あります。不要であれば整理してください。</p>}
    {items.length === 0 ? <section className="empty-state compact"><h2>ゴミ箱は空です</h2></section> : <div className="trash-list">{items.sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0)).map((item) => { const image = item.coverImageId ? imageMap.get(item.coverImageId) : undefined; return <article key={item.id}><ItemImage blob={image?.thumbnailBlob} imageKey={image ? `${image.id}:thumbnail` : undefined} alt={item.name} /><div><strong>{item.name}</strong><span>{item.deletedAt && `${formatDate(item.deletedAt)} に削除`}</span></div><div className="trash-actions"><button type="button" onClick={() => restoreItem(item.id)} aria-label="復元"><RotateCcw aria-hidden="true" /></button><button className="danger" type="button" onClick={() => window.confirm('写真を含めて完全に削除しますか？') && permanentlyDeleteItem(item.id)} aria-label="完全に削除"><Trash2 aria-hidden="true" /></button></div></article> })}</div>}
  </main>
}
