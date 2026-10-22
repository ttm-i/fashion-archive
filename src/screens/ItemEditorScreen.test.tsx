import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, initializeDatabase, saveItem } from '../db'
import type { ImageRecord, ItemRecord } from '../types'
import { ItemEditorScreen } from './ItemEditorScreen'

describe('item editor draft recovery', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('auto-saves an unfinished item and restores it after reopening', async () => {
    const first = render(<ItemEditorScreen />)
    const name = await screen.findByLabelText(/アイテム名/)
    fireEvent.change(name, { target: { value: '入力途中のジャケット' } })

    await waitFor(async () => {
      expect((await db.drafts.get('new'))?.draft.name).toBe('入力途中のジャケット')
    }, { timeout: 2500 })

    first.unmount()
    render(<ItemEditorScreen />)
    expect(await screen.findByRole('dialog', { name: '入力途中の内容があります' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '入力を再開' }))
    expect((screen.getByLabelText(/アイテム名/) as HTMLInputElement).value).toBe('入力途中のジャケット')
  })

  it('moves a wanted item into the owned collection after purchase details are saved', async () => {
    const now = new Date('2026-10-22T00:00:00.000Z')
    const wanted: ItemRecord = {
      id: 'wanted-item', name: '購入候補のコート', brand: 'TEST', categoryId: 'outerwear', size: '', color: '', materials: [], measurements: {},
      originalPrice: 50000, purchasePrice: null, purchaseDate: null, purchaseMethod: null, purchaseSource: '候補店', notes: '',
      isFavorite: false, ownershipStatus: 'wanted', coverImageId: null, createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 2,
    }
    await saveItem(wanted, [])
    render(<ItemEditorScreen id={wanted.id} mode="acquire" />)
    const replaceState = vi.spyOn(window.history, 'replaceState')

    const price = await screen.findByLabelText(/購入価格/)
    fireEvent.change(price, { target: { value: '42000' } })
    fireEvent.click(screen.getByRole('button', { name: 'コレクションへ移す' }))

    await waitFor(() => expect(replaceState).toHaveBeenCalledWith(null, '', '#/collection'))
    expect(await db.items.get(wanted.id)).toMatchObject({ ownershipStatus: 'owned', purchasePrice: 42000 })
  })

  it('replaces the registration screen in browser history after saving', async () => {
    render(<ItemEditorScreen />)
    const replaceState = vi.spyOn(window.history, 'replaceState')
    fireEvent.change(await screen.findByLabelText(/アイテム名/), { target: { value: '新しいシャツ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(replaceState).toHaveBeenCalled())
    expect(replaceState.mock.calls.at(-1)?.[2]).toMatch(/^#\/item\//)
  })

  it('records a material blend whose percentages total 100', async () => {
    render(<ItemEditorScreen />)
    fireEvent.change(await screen.findByLabelText(/アイテム名/), { target: { value: '素材テスト' } })
    fireEvent.click(screen.getByRole('button', { name: '素材を追加' }))
    fireEvent.change(await screen.findByLabelText('素材 1'), { target: { value: 'ウール' } })
    fireEvent.change(screen.getByLabelText('混率（%）'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(async () => {
      const saved = await db.items.where('name').equals('素材テスト').first()
      expect(saved?.materials).toEqual([{ id: expect.any(String), name: 'ウール', percentage: 100 }])
    })
  })

  it('records optional measurements for a supported category', async () => {
    render(<ItemEditorScreen />)
    fireEvent.change(await screen.findByLabelText(/アイテム名/), { target: { value: '採寸テスト' } })
    await screen.findByRole('option', { name: 'トップス' })
    fireEvent.change(screen.getByLabelText('カテゴリー'), { target: { value: 'tops' } })
    fireEvent.change(await screen.findByLabelText('肩幅（cm）'), { target: { value: '47.5' } })
    fireEvent.change(screen.getByLabelText('着丈（cm）'), { target: { value: '72' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(async () => {
      const saved = await db.items.where('name').equals('採寸テスト').first()
      expect(saved?.measurements).toEqual({ shoulderWidth: 47.5, bodyLength: 72 })
    })
  })

  it('discards measurements that do not belong to the final category', async () => {
    render(<ItemEditorScreen />)
    fireEvent.change(await screen.findByLabelText(/アイテム名/), { target: { value: 'カテゴリー変更テスト' } })
    await screen.findByRole('option', { name: 'トップス' })
    fireEvent.change(screen.getByLabelText('カテゴリー'), { target: { value: 'tops' } })
    fireEvent.change(await screen.findByLabelText('肩幅（cm）'), { target: { value: '48' } })
    fireEvent.change(screen.getByLabelText('カテゴリー'), { target: { value: 'bottoms' } })
    fireEvent.change(await screen.findByLabelText('ウエスト（cm）'), { target: { value: '82' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(async () => {
      const saved = await db.items.where('name').equals('カテゴリー変更テスト').first()
      expect(saved?.measurements).toEqual({ waist: 82 })
    })
  })

  it('adjusts a non-cover photo without replacing either photo blob', async () => {
    const now = new Date('2026-10-22T00:00:00.000Z')
    const item: ItemRecord = {
      id: 'focus-item', name: '表示位置テスト', brand: '', categoryId: null, size: '', color: '', materials: [], measurements: {},
      originalPrice: null, purchasePrice: null, purchaseDate: null, purchaseMethod: null, purchaseSource: '', notes: '',
      isFavorite: false, ownershipStatus: 'owned', coverImageId: 'focus-image', createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 5,
    }
    const fullBlob = new Blob(['unchanged-photo'], { type: 'image/webp' })
    const image: ImageRecord = {
      id: 'focus-image', itemId: item.id, sortOrder: 0, imageBlob: fullBlob, thumbnailBlob: new Blob(['thumb'], { type: 'image/webp' }),
      mimeType: 'image/webp', width: 1200, height: 1600, byteSize: fullBlob.size, focusX: 50, focusY: 50, createdAt: now,
    }
    const secondBlob = new Blob(['unchanged-second-photo'], { type: 'image/webp' })
    const secondImage: ImageRecord = {
      ...image, id: 'focus-image-2', sortOrder: 1, imageBlob: secondBlob, thumbnailBlob: new Blob(['thumb-2'], { type: 'image/webp' }), byteSize: secondBlob.size,
    }
    await saveItem(item, [image, secondImage])
    render(<ItemEditorScreen id={item.id} />)

    fireEvent.click(await screen.findByRole('button', { name: '写真2の表示位置を調整' }))
    fireEvent.change(screen.getByLabelText('左右'), { target: { value: '73' } })
    fireEvent.change(screen.getByLabelText('上下'), { target: { value: '28' } })
    fireEvent.click(screen.getByRole('button', { name: 'この位置に決定' }))
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(async () => expect(await db.items.get(item.id)).toMatchObject({ imageLayout: [
      { imageId: image.id, focusX: 50, focusY: 50 },
      { imageId: secondImage.id, focusX: 73, focusY: 28 },
    ] }))
    expect(await (await db.images.get(image.id))?.imageBlob.text()).toBe('unchanged-photo')
    expect(await (await db.images.get(secondImage.id))?.imageBlob.text()).toBe('unchanged-second-photo')
  })
})
