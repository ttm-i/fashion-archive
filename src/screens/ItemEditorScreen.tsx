import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ChevronLeft, ChevronRight, Heart, ImagePlus, Plus, Star, Trash2 } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { ItemImage } from '../components/ItemImage'
import { SuggestionInput } from '../components/SuggestionInput'
import { db, saveItem } from '../db'
import { navigate } from '../hooks/useRoute'
import type { EditorDraftRecord, ImageRecord, ItemDraft, ItemRecord, PurchaseMethod } from '../types'
import { PURCHASE_METHODS } from '../types'
import { parseOptionalPrice, uniqueSuggestions } from '../utils/format'
import { prepareImage } from '../utils/images'
import { parseMaterials } from '../utils/materials'

const blankDraft: ItemDraft = {
  name: '', brand: '', categoryId: null, size: '', color: '', materials: [], originalPrice: '', purchasePrice: '', purchaseDate: '', purchaseMethod: '', purchaseSource: '', notes: '', isFavorite: false,
}

export function ItemEditorScreen({ id, mode = 'owned' }: { id?: string; mode?: 'owned' | 'wanted' | 'acquire' }) {
  const isWanted = mode === 'wanted'
  const isAcquire = mode === 'acquire'
  const draftKey = id ? `${mode}:${id}` : isWanted ? 'new-wanted' : 'new'
  const editorData = useLiveQuery(async () => id ? {
    item: await db.items.get(id),
    images: await db.images.where('itemId').equals(id).sortBy('sortOrder'),
  } : null, [id])
  const existing = editorData?.item
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [], [])
  const allItems = useLiveQuery(() => db.items.toArray(), [], [])
  const [itemId, setItemId] = useState(() => id ?? crypto.randomUUID())
  const [draft, setDraft] = useState<ItemDraft>(blankDraft)
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loaded, setLoaded] = useState(!id)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [draftChecked, setDraftChecked] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<EditorDraftRecord | null>(null)

  useEffect(() => {
    if (!id || !existing || !editorData || loaded) return
    setDraft({
      name: existing.name,
      brand: existing.brand,
      categoryId: existing.categoryId,
      size: existing.size,
      color: existing.color,
      materials: (existing.materials ?? []).map((material) => ({ ...material, percentage: material.percentage?.toString() ?? '' })),
      originalPrice: existing.originalPrice?.toString() ?? '',
      purchasePrice: existing.purchasePrice?.toString() ?? '',
      purchaseDate: existing.purchaseDate ?? '',
      purchaseMethod: existing.purchaseMethod ?? '',
      purchaseSource: existing.purchaseSource,
      notes: existing.notes,
      isFavorite: existing.isFavorite,
    })
    setImages(editorData.images)
    setLoaded(true)
  }, [id, existing, editorData, loaded])

  useEffect(() => {
    if (!loaded || draftChecked) return
    let cancelled = false
    db.drafts.get(draftKey).then((saved) => {
      if (cancelled) return
      if (saved) setPendingDraft(saved)
      setDraftChecked(true)
    }).catch(() => setDraftChecked(true))
    return () => { cancelled = true }
  }, [draftKey, loaded, draftChecked])

  useEffect(() => {
    if (!loaded || !draftChecked || pendingDraft || !dirty) return
    const timer = window.setTimeout(() => {
      db.drafts.put({ key: draftKey, itemId, draft, images, updatedAt: new Date() }).catch(() => {
        setError('入力内容の自動保存に失敗しました。通常の保存をお試しください。')
      })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [draft, draftChecked, draftKey, dirty, images, itemId, loaded, pendingDraft])

  useEffect(() => {
    if (!dirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])

  const brandSuggestions = useMemo(() => uniqueSuggestions(allItems.map((item) => item.brand)), [allItems])
  const colorSuggestions = useMemo(() => uniqueSuggestions(allItems.map((item) => item.color)), [allItems])
  const sourceSuggestions = useMemo(() => uniqueSuggestions(allItems.map((item) => item.purchaseSource)), [allItems])
  const materialSuggestions = useMemo(() => uniqueSuggestions(allItems.flatMap((item) => (item.materials ?? []).map((material) => material.name))), [allItems])

  const update = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setDirty(true)
    setError('')
  }

  const goBack = async () => {
    if (dirty && !window.confirm('入力中の変更を破棄しますか？')) return
    if (dirty) await db.drafts.delete(draftKey)
    navigate(id ? `item/${id}` : isWanted ? 'wishlist' : 'collection', true)
  }

  const resumeDraft = () => {
    if (!pendingDraft) return
    setItemId(pendingDraft.itemId)
    setDraft({ ...pendingDraft.draft, materials: pendingDraft.draft.materials ?? [] })
    setImages(pendingDraft.images)
    setDirty(true)
    setPendingDraft(null)
  }

  const discardDraft = async () => {
    await db.drafts.delete(draftKey)
    setPendingDraft(null)
    setDirty(false)
  }

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const remaining = 3 - images.length
    if (remaining <= 0) {
      setError('写真は1アイテムにつき3枚までです。既存の写真を削除してから追加してください。')
      return
    }
    setProcessing(true)
    setError('')
    try {
      const selected = Array.from(files).slice(0, remaining)
      const created: ImageRecord[] = []
      for (const file of selected) created.push(await prepareImage(file, itemId, images.length + created.length))
      setImages((current) => [...current, ...created])
      setDirty(true)
      if (files.length > remaining) setError(`写真は3枚までのため、先頭の${remaining}枚を追加しました。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '写真を追加できませんでした。')
    } finally {
      setProcessing(false)
    }
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const copy = [...images]
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
    setImages(copy.map((image, sortOrder) => ({ ...image, sortOrder })))
    setDirty(true)
  }

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index).map((image, sortOrder) => ({ ...image, sortOrder })))
    setDirty(true)
  }

  const addMaterial = () => {
    update('materials', [...draft.materials, { id: crypto.randomUUID(), name: '', percentage: '' }])
  }

  const updateMaterial = (id: string, key: 'name' | 'percentage', value: string) => {
    update('materials', draft.materials.map((material) => material.id === id ? { ...material, [key]: value } : material))
  }

  const removeMaterial = (id: string) => {
    update('materials', draft.materials.filter((material) => material.id !== id))
  }

  const submit = async () => {
    const name = draft.name.trim()
    if (!name) {
      setError('アイテム名を入力してください。')
      document.getElementById('item-name')?.focus()
      return
    }
    setSaving(true)
    setError('')
    try {
      const materials = parseMaterials(draft.materials)
      const now = new Date()
      const item: ItemRecord = {
        id: itemId,
        name,
        brand: draft.brand.trim(),
        categoryId: draft.categoryId,
        size: draft.size.trim(),
        color: draft.color.trim(),
        materials,
        originalPrice: parseOptionalPrice(draft.originalPrice),
        purchasePrice: isWanted ? null : parseOptionalPrice(draft.purchasePrice),
        purchaseDate: isWanted ? null : draft.purchaseDate || null,
        purchaseMethod: isWanted ? null : (draft.purchaseMethod || null) as PurchaseMethod | null,
        purchaseSource: draft.purchaseSource.trim(),
        notes: draft.notes.trim(),
        isFavorite: isWanted ? false : draft.isFavorite,
        ownershipStatus: isWanted ? 'wanted' : 'owned',
        coverImageId: images[0]?.id ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        deletedAt: existing?.deletedAt ?? null,
        schemaVersion: 3,
      }
      await saveItem(item, images.map((image, sortOrder) => ({ ...image, itemId, sortOrder })))
      await db.drafts.delete(draftKey)
      setDirty(false)
      if (isAcquire) {
        navigate('collection', true)
        navigate(`item/${itemId}`)
      } else {
        navigate(`item/${itemId}`, true)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存できませんでした。入力内容はこの画面に残っています。')
    } finally {
      setSaving(false)
    }
  }

  if (id && editorData && !existing) return <main className="screen empty-state"><h1>アイテムが見つかりません</h1><button className="primary-button" type="button" onClick={() => navigate('collection')}>コレクションへ戻る</button></main>
  if (id && !loaded) return <main className="screen loading-screen"><p>読み込んでいます…</p></main>

  return (
    <main className="screen editor-screen">
      <AppHeader title={isAcquire ? '購入済みにする' : isWanted ? (id ? 'ほしいものを編集' : 'ほしいものを追加') : (id ? 'アイテムを編集' : '新しいアイテム')} back={goBack} action={<button className="text-action" type="button" onClick={submit} disabled={saving || processing}>{isAcquire ? '登録' : '保存'}</button>} />
      <form onSubmit={(event) => { event.preventDefault(); submit() }}>
        <section className="editor-intro"><span>{isAcquire ? 'MOVE TO COLLECTION' : isWanted ? 'WISHLIST' : 'NEW RECORD'}</span><h1>{isAcquire ? '購入情報を追加' : isWanted ? (id ? '購入候補を編集' : '気になる一着を記録') : (id ? 'アイテムを編集' : '新しい一着を記録')}</h1><p>{isAcquire ? '保存すると、ほしいものからコレクションへ移動します。' : '写真と名前だけでも保存できます。'}</p></section>

        <section className="editor-section photo-editor">
          <div className="section-heading"><div><span>PHOTOS</span><h2>写真</h2></div><p>{images.length} / 3</p></div>
          <div className="photo-slots">
            {images.map((image, index) => (
              <div className="photo-slot filled" key={image.id}>
                <ItemImage blob={image.thumbnailBlob} alt={`写真${index + 1}`} />
                {index === 0 && <span className="cover-label"><Star aria-hidden="true" />表紙</span>}
                <button className="photo-remove" type="button" onClick={() => removeImage(index)} aria-label={`写真${index + 1}を削除`}><Trash2 aria-hidden="true" /></button>
                <div className="photo-order">
                  <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="左へ移動"><ChevronLeft aria-hidden="true" /></button>
                  <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label="右へ移動"><ChevronRight aria-hidden="true" /></button>
                </div>
              </div>
            ))}
            {Array.from({ length: 3 - images.length }).map((_, index) => (
              <label className="photo-slot empty" key={`empty-${index}`}>
                <ImagePlus aria-hidden="true" /><span>追加</span>
                <input type="file" accept="image/*" multiple onChange={(event) => { addImages(event.target.files); event.target.value = '' }} disabled={processing} />
              </label>
            ))}
          </div>
          <label className="camera-button"><Camera aria-hidden="true" />{processing ? '写真を処理しています…' : `写真を追加（あと${3 - images.length}枚・複数選択可）`}<input type="file" accept="image/*" multiple onChange={(event) => { addImages(event.target.files); event.target.value = '' }} disabled={processing || images.length >= 3} /></label>
        </section>

        <section className="editor-section">
          <div className="section-heading"><div><span>BASIC</span><h2>基本情報</h2></div></div>
          <div className="form-stack">
            <label><span>アイテム名 <b>*</b></span><input id="item-name" value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="例：ウールブレンドジャケット" /></label>
            <SuggestionInput id="item-brand" label="ブランド" value={draft.brand} suggestions={brandSuggestions} onChange={(value) => update('brand', value)} placeholder="例：AURALEE" />
            <label><span>カテゴリー</span><select value={draft.categoryId ?? ''} onChange={(event) => update('categoryId', event.target.value || null)}><option value="">未設定</option>{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <div className="field-pair"><label><span>サイズ</span><input value={draft.size} onChange={(event) => update('size', event.target.value)} placeholder="M / 42 / 27.0" /></label><SuggestionInput id="item-color" label="カラー" value={draft.color} suggestions={colorSuggestions} onChange={(value) => update('color', value)} placeholder="ブラック" /></div>
            {!isWanted && <label className="switch-row"><span><Heart aria-hidden="true" />お気に入り</span><input type="checkbox" checked={draft.isFavorite} onChange={(event) => update('isFavorite', event.target.checked)} /></label>}
          </div>
        </section>

        {isWanted ? <details className="editor-section disclosure" open>
          <summary><span><small>WISHLIST</small>購入候補</span></summary>
          <div className="form-stack">
            <label><span>想定価格</span><div className="money-input"><span>¥</span><input inputMode="numeric" value={draft.originalPrice} onChange={(event) => update('originalPrice', event.target.value.replace(/\D/g, ''))} placeholder="0" /></div></label>
            <SuggestionInput id="purchase-source" label="購入候補先" value={draft.purchaseSource} suggestions={sourceSuggestions} onChange={(value) => update('purchaseSource', value)} placeholder="例：公式オンラインストア" />
          </div>
        </details> : <details className="editor-section disclosure" open>
          <summary><span><small>PURCHASE</small>購入情報</span></summary>
          <div className="form-stack">
            <div className="field-pair"><label><span>購入価格</span><div className="money-input"><span>¥</span><input inputMode="numeric" value={draft.purchasePrice} onChange={(event) => update('purchasePrice', event.target.value.replace(/\D/g, ''))} placeholder="0" /></div></label><label><span>定価</span><div className="money-input"><span>¥</span><input inputMode="numeric" value={draft.originalPrice} onChange={(event) => update('originalPrice', event.target.value.replace(/\D/g, ''))} placeholder="0" /></div></label></div>
            <label><span>購入日</span><div className="date-input-shell"><input type="date" value={draft.purchaseDate} onChange={(event) => update('purchaseDate', event.target.value)} /></div></label>
            <label><span>購入方法</span><select value={draft.purchaseMethod} onChange={(event) => update('purchaseMethod', event.target.value as PurchaseMethod | '')}><option value="">未設定</option>{PURCHASE_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
            <SuggestionInput id="purchase-source" label="購入先" value={draft.purchaseSource} suggestions={sourceSuggestions} onChange={(value) => update('purchaseSource', value)} placeholder="例：公式オンラインストア" />
          </div>
        </details>}

        <details className="editor-section disclosure">
          <summary><span><small>MATERIAL</small>素材・混率</span></summary>
          <div className="form-stack material-editor">
            {draft.materials.map((material, index) => (
              <div className="material-row" key={material.id}>
                <SuggestionInput id={`material-${material.id}`} label={`素材 ${index + 1}`} value={material.name} suggestions={materialSuggestions} onChange={(value) => updateMaterial(material.id, 'name', value)} placeholder="例：ウール" />
                <label><span>混率（%）</span><input inputMode="decimal" value={material.percentage} onChange={(event) => updateMaterial(material.id, 'percentage', event.target.value.replace(/[^0-9.,]/g, ''))} placeholder="100" /></label>
                <button className="material-remove" type="button" onClick={() => removeMaterial(material.id)} aria-label={`${index + 1}件目の素材を削除`}><Trash2 aria-hidden="true" /></button>
              </div>
            ))}
            {draft.materials.length === 0 && <p className="material-empty">素材を記録する場合は、下のボタンから追加してください。</p>}
            {draft.materials.length < 10 && <button className="secondary-button material-add" type="button" onClick={addMaterial}><Plus aria-hidden="true" />素材を追加</button>}
            <p className="field-help">素材名だけでも保存できます。混率を入力する場合は、すべての素材に入力し、合計を100%にしてください。</p>
          </div>
        </details>

        <details className="editor-section disclosure">
          <summary><span><small>NOTES</small>その他</span></summary>
          <div className="form-stack"><label><span>メモ</span><textarea rows={5} value={draft.notes} onChange={(event) => update('notes', event.target.value)} placeholder="購入時のこと、着心地、お手入れ方法など" /></label></div>
        </details>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="editor-save"><button className="primary-button block" type="submit" disabled={saving || processing}>{saving ? '保存しています…' : isAcquire ? 'コレクションへ移す' : '保存する'}</button></div>
      </form>
      {pendingDraft && <div className="sheet-backdrop draft-recovery"><section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="draft-title"><div className="sheet-handle" /><span className="draft-recovery__eyebrow">AUTO SAVED</span><h2 id="draft-title">入力途中の内容があります</h2><p>前回入力していた内容と写真を再開できます。</p><div className="sheet-actions"><button className="secondary-button" type="button" onClick={discardDraft}>破棄する</button><button className="primary-button" type="button" onClick={resumeDraft}>入力を再開</button></div></section></div>}
    </main>
  )
}
