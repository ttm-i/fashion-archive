import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, initializeDatabase, saveItem } from '../db'
import type { ImageRecord, ItemRecord } from '../types'
import { ItemDetailScreen } from './ItemDetailScreen'

function item(id: string, name: string): ItemRecord {
  const now = new Date('2026-10-21T00:00:00.000Z')
  return { id, name, brand: '', categoryId: null, size: '', color: '', materials: [], measurements: {}, originalPrice: null, purchasePrice: null, purchaseDate: null, purchaseMethod: null, purchaseSource: '', notes: '', isFavorite: false, ownershipStatus: 'owned', coverImageId: null, createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 2 }
}

describe('item detail navigation', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
    await saveItem(item('first', '最初のアイテム'), [])
    await saveItem(item('second', '次のアイテム'), [])
    sessionStorage.setItem('collectionNavigationIds', JSON.stringify(['first', 'second']))
    window.location.hash = '#/item/first'
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('moves to the next item in the current collection order', async () => {
    render(<ItemDetailScreen id="first" />)
    expect(await screen.findByText('最初のアイテム')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '次のアイテム' }))
    expect(screen.getByText('最初のアイテム').closest('.detail-transition')?.classList.contains('exit-next')).toBe(true)
    await waitFor(() => expect(window.location.hash).toBe('#/item/second'))
  })

  it('uses the opposite transition when moving to the previous item', async () => {
    window.location.hash = '#/item/second'
    render(<ItemDetailScreen id="second" />)
    const heading = await screen.findByRole('heading', { name: '次のアイテム' })
    fireEvent.click(screen.getByRole('button', { name: '前のアイテム' }))
    expect(heading.closest('.detail-transition')?.classList.contains('exit-previous')).toBe(true)
    await waitFor(() => expect(window.location.hash).toBe('#/item/first'))
  })

  it('offers a wanted item conversion into the collection', async () => {
    await saveItem({ ...item('wanted', 'ほしいジャケット'), ownershipStatus: 'wanted', originalPrice: 30000 }, [])
    render(<ItemDetailScreen id="wanted" />)
    const replaceState = vi.spyOn(window.history, 'replaceState')
    expect(await screen.findByText('ほしいジャケット')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '購入済みにする' }))
    expect(window.location.hash).toBe('#/acquire/wanted')
    expect(replaceState).toHaveBeenCalledWith(null, '', '#/acquire/wanted')
  })

  it('uses each photo order and framing in the square detail gallery', async () => {
    const now = new Date('2026-10-22T00:00:00.000Z')
    const makeImage = (id: string, focusX: number, focusY: number): ImageRecord => ({
      id, itemId: 'photos', sortOrder: 0, imageBlob: new Blob([id]), thumbnailBlob: new Blob([`${id}-thumb`]),
      mimeType: 'image/webp', width: 1200, height: 700, byteSize: id.length, focusX, focusY, createdAt: now,
    })
    await saveItem(item('photos', '写真付きアイテム'), [
      makeImage('photo-first', 75, 20),
      { ...makeImage('photo-second', 30, 80), sortOrder: 1 },
    ])

    render(<ItemDetailScreen id="photos" />)
    const first = await screen.findByAltText('写真付きアイテムの写真1') as HTMLImageElement
    expect(first.style.objectFit).toBe('cover')
    expect(first.style.objectPosition).toBe('75% 20%')
    expect(first.classList.contains('active')).toBe(true)
    const second = await screen.findByAltText('写真付きアイテムの写真2') as HTMLImageElement
    expect(second.classList.contains('active')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '次の写真' }))
    expect(second.style.objectPosition).toBe('30% 80%')
    expect(second.classList.contains('active')).toBe(true)
    expect(first.classList.contains('active')).toBe(false)
  })
})
