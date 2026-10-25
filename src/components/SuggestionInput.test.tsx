import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SuggestionInput } from './SuggestionInput'

describe('SuggestionInput', () => {
  afterEach(() => cleanup())

  it('allows an existing value to be selected without disabling free input', () => {
    const onChange = vi.fn()
    render(<SuggestionInput id="brand" label="ブランド" value="" suggestions={['AURALEE', 'COMOLI']} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'ブランドの候補を表示' }))
    fireEvent.click(screen.getByRole('option', { name: 'COMOLI' }))
    expect(onChange).toHaveBeenCalledWith('COMOLI')
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.change(screen.getByLabelText('ブランド'), { target: { value: '新しいブランド' } })
    expect(onChange).toHaveBeenLastCalledWith('新しいブランド')
  })

  it('keeps filtered candidates available in the keyboard-aware sheet', () => {
    render(<SuggestionInput id="color" label="カラー" value="" suggestions={['ブラック', 'グリーン', 'ブルー']} onChange={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: 'カラーの候補を表示' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'カラーの候補を検索' }), { target: { value: 'グリ' } })

    expect(screen.getByRole('option', { name: 'グリーン' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'ブラック' })).toBeNull()
    expect(screen.getByRole('presentation').style.getPropertyValue('--suggestion-viewport-height')).not.toBe('')
  })
})
