import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, X } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { BackupReminder } from '../components/BackupReminder'
import { ItemImage } from '../components/ItemImage'
import { db } from '../db'
import { navigate } from '../hooks/useRoute'
import type { ImageRecord, ItemRecord } from '../types'
import { formatYen } from '../utils/format'
import { imageFocus } from '../utils/imageLayout'

export function WishlistScreen() {
  const items = useLiveQuery(() => db.items.filter((item) => item.deletedAt === null && item.ownershipStatus === 'wanted').toArray(), [], [])
  const images = useLiveQuery(() => db.images.toArray(), [], [])
  const [query, setQuery] = useState('')
  const imageMap = useMemo(() => new Map(images.map((image) => [image.id, image])), [images])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ja-JP')
    return [...items]
      .filter((item) => !needle || [item.name, item.brand, item.color, item.purchaseSource, item.notes].some((value) => value.toLocaleLowerCase('ja-JP').includes(needle)))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [items, query])
  const navigationIds = useMemo(() => filtered.map((item) => item.id), [filtered])

  return (
    <main className="screen screen--with-nav wishlist-screen">
      <AppHeader title="ウィッシュリスト" />
      <section className="collection-heading wishlist-heading"><div><h1>ウィッシュリスト</h1><p>{filtered.length === items.length ? `${items.length} candidates` : `${filtered.length} / ${items.length} candidates`}</p></div></section>
      <BackupReminder />
      <label className="search-field">
        <Search aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="アイテム名、ブランドなど" aria-label="ウィッシュリストを検索" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="検索をクリア"><X aria-hidden="true" /></button>}
      </label>
      <div className="wishlist-spacer" />
      {filtered.length === 0 ? (
        <section className="empty-state">
          <span>WISHLIST</span>
          <h2>{items.length === 0 ? '気になる一着を残しましょう' : '検索に合う候補がありません'}</h2>
          <p>{items.length === 0 ? '名前だけでも登録でき、購入後はコレクションへ移せます。' : '検索語を変更してください。'}</p>
          {items.length === 0 && <button className="primary-button" type="button" onClick={() => navigate('new-wanted')}>ウィッシュリストに登録</button>}
        </section>
      ) : (
        <section className="item-grid" aria-label="ウィッシュリスト一覧">
          {filtered.map((item) => <WishlistCard key={item.id} item={item} image={item.coverImageId ? imageMap.get(item.coverImageId) : undefined} navigationIds={navigationIds} />)}
        </section>
      )}
      <button className="floating-add" type="button" onClick={() => navigate('new-wanted')} aria-label="ウィッシュリストに登録"><Plus aria-hidden="true" /></button>
    </main>
  )
}

function WishlistCard({ item, image, navigationIds }: { item: ItemRecord; image?: ImageRecord; navigationIds: string[] }) {
  const position = image ? imageFocus(item, image.id) : undefined
  const openDetail = () => {
    sessionStorage.setItem('wishlistNavigationIds', JSON.stringify(navigationIds))
    navigate(`item/${item.id}`)
  }
  return (
    <article className="item-card wishlist-card" role="button" tabIndex={0} onClick={openDetail} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail() } }}>
      <div className="item-card__photo"><ItemImage blob={image?.thumbnailBlob} imageKey={image ? `${image.id}:thumbnail` : undefined} alt={item.name} fit="cover" position={position} /><span className="wishlist-badge">WANTED</span></div>
      {item.brand && <span className="item-card__brand">{item.brand}</span>}
      <div className="item-card__line"><h2>{item.name}</h2>{item.originalPrice !== null && <strong>{formatYen(item.originalPrice)}</strong>}</div>
    </article>
  )
}
