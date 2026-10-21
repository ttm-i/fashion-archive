import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase, saveItem } from '../db'
import type { ItemRecord } from '../types'
import { ItemEditorScreen } from './ItemEditorScreen'

describe('item editor draft recovery', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await initializeDatabase()
  })

  afterEach(() => cleanup())

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
      id: 'wanted-item', name: '購入候補のコート', brand: 'TEST', categoryId: 'outerwear', size: '', color: '',
      originalPrice: 50000, purchasePrice: null, purchaseDate: null, purchaseMethod: null, purchaseSource: '候補店', notes: '',
      isFavorite: false, ownershipStatus: 'wanted', coverImageId: null, createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 2,
    }
    await saveItem(wanted, [])
    render(<ItemEditorScreen id={wanted.id} mode="acquire" />)

    const price = await screen.findByLabelText(/購入価格/)
    fireEvent.change(price, { target: { value: '42000' } })
    fireEvent.click(screen.getByRole('button', { name: 'コレクションへ移す' }))

    await waitFor(async () => {
      expect(await db.items.get(wanted.id)).toMatchObject({ ownershipStatus: 'owned', purchasePrice: 42000 })
    })
  })
})
