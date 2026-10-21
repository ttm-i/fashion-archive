import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase } from '../db'
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
})
