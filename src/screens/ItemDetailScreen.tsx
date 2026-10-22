import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Heart, Maximize2, Pencil, Trash2, X } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { ItemImage } from '../components/ItemImage'
import { db, markDataChanged, moveItemToTrash, restoreItem } from '../db'
import { navigate } from '../hooks/useRoute'
import type { CategoryRecord, ImageRecord, ItemRecord } from '../types'
import { formatDate, formatYen } from '../utils/format'
import { measurementEntries, measurementKeysForCategory } from '../utils/measurements'
import { arrangeImages } from '../utils/imageLayout'

interface DetailData {
  item?: ItemRecord
  images: ImageRecord[]
  category?: CategoryRecord
}

type ItemTransition = 'idle' | 'exit-next' | 'exit-previous' | 'enter-next' | 'enter-previous'

async function loadDetailData(id: string): Promise<DetailData> {
  const [item, images] = await Promise.all([
    db.items.get(id),
    db.images.where('itemId').equals(id).toArray(),
  ])
  const category = item?.categoryId ? await db.categories.get(item.categoryId) : undefined
  return { item, images, category }
}

export function ItemDetailScreen({ id }: { id: string }) {
  const liveData = useLiveQuery(() => loadDetailData(id), [id])
  const [displayData, setDisplayData] = useState<DetailData>()
  const [imageIndex, setImageIndex] = useState(0)
  const [fullScreen, setFullScreen] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [itemTransition, setItemTransition] = useState<ItemTransition>('idle')
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const itemTouchStart = useRef<{ x: number; y: number } | null>(null)
  const transitionSequence = useRef(0)
  const transitioning = useRef(false)
  const item = displayData?.item
  const category = displayData?.category
  const isWanted = item?.ownershipStatus === 'wanted'
  const images = useMemo(() => arrangeImages(displayData?.images ?? [], item?.imageLayout), [displayData?.images, item?.imageLayout])
  const navigationIds = (() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(isWanted ? 'wishlistNavigationIds' : 'collectionNavigationIds') ?? '[]')
      return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string') ? parsed as string[] : []
    } catch { return [] }
  })()
  const navigationIndex = navigationIds.indexOf(item?.id ?? id)
  const previousId = navigationIndex > 0 ? navigationIds[navigationIndex - 1] : undefined
  const nextId = navigationIndex >= 0 && navigationIndex < navigationIds.length - 1 ? navigationIds[navigationIndex + 1] : undefined

  useEffect(() => {
    if (!liveData || liveData.item?.id !== id) return
    setDisplayData(liveData)
  }, [id, liveData])

  useEffect(() => () => {
    transitionSequence.current += 1
  }, [])

  useEffect(() => {
    if (!deleted) return
    const timer = window.setTimeout(() => navigate('collection'), 4500)
    return () => window.clearTimeout(timer)
  }, [deleted])

  useEffect(() => {
    setImageIndex(0)
    setFullScreen(false)
    setDeleted(false)
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
  }, [id])

  useEffect(() => {
    if (imageIndex >= images.length) setImageIndex(0)
  }, [imageIndex, images.length])

  if (liveData === undefined && item === undefined) return <main className="screen loading-screen"><p>読み込んでいます…</p></main>
  if (!item) return <main className="screen empty-state"><h1>アイテムが見つかりません</h1><button className="primary-button" type="button" onClick={() => navigate('collection')}>コレクションへ戻る</button></main>
  const currentImage = images[imageIndex] ?? images[0]

  const toggleFavorite = async () => {
    await db.items.update(item.id, { isFavorite: !item.isFavorite, updatedAt: new Date() })
    await markDataChanged()
  }
  const remove = async () => {
    if (!window.confirm('このアイテムをゴミ箱へ移動しますか？')) return
    await moveItemToTrash(item.id)
    setDeleted(true)
  }
  const undo = async () => {
    await restoreItem(item.id)
    setDeleted(false)
  }
  const savings = item.originalPrice !== null && item.purchasePrice !== null && item.originalPrice > item.purchasePrice ? item.originalPrice - item.purchasePrice : null
  const measurements = measurementEntries(item.measurements, measurementKeysForCategory(item.categoryId))
  const beginSwipe = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }
  const finishSwipe = (event: React.TouchEvent) => {
    const start = touchStart.current
    const touch = event.changedTouches[0]
    touchStart.current = null
    if (!start || !touch || images.length < 2) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return
    setImageIndex((current) => dx < 0 ? (current + 1) % images.length : (current - 1 + images.length) % images.length)
  }
  const openAdjacent = async (targetId: string | undefined) => {
    if (!targetId || transitioning.current) return
    const direction = targetId === nextId ? 'next' : 'previous'
    const sequence = ++transitionSequence.current
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    transitioning.current = true
    setItemTransition(`exit-${direction}`)
    try {
      const [nextData] = await Promise.all([
        loadDetailData(targetId),
        new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 170)),
      ])
      if (sequence !== transitionSequence.current) return
      if (!nextData.item) {
        setItemTransition('idle')
        transitioning.current = false
        navigate(`item/${targetId}`, true)
        return
      }
      setImageIndex(0)
      setFullScreen(false)
      setDeleted(false)
      setDisplayData(nextData)
      setItemTransition(`enter-${direction}`)
      navigate(`item/${targetId}`, true)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (sequence !== transitionSequence.current) return
        setItemTransition('idle')
        transitioning.current = false
      }))
    } catch {
      if (sequence !== transitionSequence.current) return
      setItemTransition('idle')
      transitioning.current = false
      navigate(`item/${targetId}`, true)
    }
  }
  const beginItemSwipe = (event: React.TouchEvent) => {
    if (event.target instanceof Element && event.target.closest('button, input, select, textarea, a')) {
      itemTouchStart.current = null
      return
    }
    const touch = event.touches[0]
    itemTouchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }
  const finishItemSwipe = (event: React.TouchEvent) => {
    const start = itemTouchStart.current
    const touch = event.changedTouches[0]
    itemTouchStart.current = null
    if (!start || !touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return
    openAdjacent(dx > 0 ? previousId : nextId)
  }

  return (
    <main className={`screen detail-screen${previousId || nextId ? ' detail-screen--with-item-nav' : ''}`}>
      <AppHeader title={isWanted ? 'キープ詳細' : 'アイテム詳細'} back={() => navigate(isWanted ? 'wishlist' : 'collection')} action={isWanted ? undefined : <button className={item.isFavorite ? 'icon-button active' : 'icon-button'} type="button" onClick={toggleFavorite} aria-label="お気に入り"><Heart fill={item.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>} />
      <div className={`detail-transition ${itemTransition}`}>
        <section className="detail-gallery" onTouchStart={beginSwipe} onTouchEnd={finishSwipe}>
        {images.length > 0 ? <div className="detail-gallery__images">
          {images.map((image, index) => <ItemImage key={image.id} blob={image.imageBlob} imageKey={`${image.id}:full`} className={`detail-gallery__image${index === imageIndex ? ' active' : ''}`} alt={`${item.name}の写真${index + 1}`} fit="cover" position={{ x: image.focusX, y: image.focusY }} />)}
        </div> : <ItemImage alt={item.name} />}
        {images.length > 0 && <button className="gallery-expand" type="button" onClick={() => setFullScreen(true)} aria-label="写真を全画面表示"><Maximize2 aria-hidden="true" /></button>}
        {images.length > 1 && <><button className="gallery-arrow left" type="button" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} aria-label="前の写真"><ChevronLeft aria-hidden="true" /></button><button className="gallery-arrow right" type="button" onClick={() => setImageIndex((imageIndex + 1) % images.length)} aria-label="次の写真"><ChevronRight aria-hidden="true" /></button></>}
        {images.length > 1 && <div className="gallery-dots" aria-label={`${imageIndex + 1} / ${images.length}`}>{images.map((image, index) => <button key={image.id} className={index === imageIndex ? 'active' : ''} onClick={() => setImageIndex(index)} type="button" aria-label={`写真${index + 1}`} />)}</div>}
        </section>

        <section className="detail-content" onTouchStart={beginItemSwipe} onTouchEnd={finishItemSwipe}>
        {item.brand && <span className="detail-brand">{item.brand}</span>}
        <h1>{item.name}</h1>
        {isWanted ? <div className="detail-price"><strong>{item.originalPrice !== null ? formatYen(item.originalPrice) : '価格未登録'}</strong>{item.originalPrice !== null && <small>想定価格</small>}</div> : <div className="detail-price"><strong>{item.purchasePrice !== null ? formatYen(item.purchasePrice) : '価格未登録'}</strong>{item.originalPrice !== null && <span>定価 {formatYen(item.originalPrice)}</span>}{savings !== null && <em>{formatYen(savings)} OFF</em>}</div>}

        <div className="detail-facts">
          {category && <Fact label="CATEGORY" value={category.name} />}
          {item.size && <Fact label="SIZE" value={item.size} />}
          {item.color && <Fact label="COLOR" value={item.color} />}
          {item.purchaseDate && <Fact label="DATE" value={formatDate(item.purchaseDate)} />}
          {item.purchaseMethod && <Fact label="METHOD" value={item.purchaseMethod} />}
          {item.purchaseSource && <Fact label={isWanted ? 'CANDIDATE STORE' : 'STORE'} value={item.purchaseSource} />}
        </div>

        {(item.materials ?? []).length > 0 && <div className="detail-materials"><span>MATERIAL</span><div>{item.materials.map((material) => <p key={material.id}><strong>{material.name}</strong>{material.percentage !== null && <span>{material.percentage}%</span>}</p>)}</div></div>}
        {measurements.length > 0 && <div className="detail-measurements"><span>MEASUREMENTS</span><div>{measurements.map((measurement) => <p key={measurement.key}><span>{measurement.label}</span><strong>{measurement.value} cm</strong></p>)}</div></div>}
        {item.notes && <div className="detail-notes"><span>NOTES</span><p>{item.notes}</p></div>}
        {isWanted && <button className="primary-button block acquire-button" type="button" onClick={() => navigate(`acquire/${item.id}`, true)}>購入済みにする</button>}
        <button className={isWanted ? 'secondary-button block' : 'primary-button block'} type="button" onClick={() => navigate(isWanted ? `edit-wanted/${item.id}` : `edit/${item.id}`, true)}><Pencil aria-hidden="true" />編集する</button>
        <button className="danger-link" type="button" onClick={remove}><Trash2 aria-hidden="true" />ゴミ箱へ移動</button>
        </section>
      </div>

      {(previousId || nextId) && <nav className="detail-item-nav" aria-label="前後のアイテム"><button type="button" disabled={!previousId || itemTransition !== 'idle'} onClick={() => openAdjacent(previousId)}><ChevronLeft aria-hidden="true" />前のアイテム</button><span>{navigationIndex + 1} / {navigationIds.length}</span><button type="button" disabled={!nextId || itemTransition !== 'idle'} onClick={() => openAdjacent(nextId)}>次のアイテム<ChevronRight aria-hidden="true" /></button></nav>}
      {fullScreen && currentImage && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="写真を全画面表示" onTouchStart={beginSwipe} onTouchEnd={finishSwipe}><button type="button" onClick={() => setFullScreen(false)} aria-label="閉じる"><X aria-hidden="true" /></button><ItemImage blob={currentImage.imageBlob} imageKey={`${currentImage.id}:full`} alt={item.name} /></div>}
      {deleted && <div className="undo-bar" role="status"><span>ゴミ箱へ移動しました</span><button type="button" onClick={undo}>元に戻す</button></div>}
    </main>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>
}
