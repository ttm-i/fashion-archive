import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ItemImage } from './ItemImage'

describe('ItemImage', () => {
  beforeEach(() => {
    let count = 0
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => `blob:test-${++count}`),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('switches to a fresh object URL before revoking the previous image URL', () => {
    const first = new Blob(['first'], { type: 'image/webp' })
    const second = new Blob(['second'], { type: 'image/webp' })
    const view = render(<ItemImage blob={first} alt="写真" />)
    expect(view.getByRole('img').getAttribute('src')).toBe('blob:test-1')

    view.rerender(<ItemImage blob={second} alt="写真" />)
    expect(view.getByRole('img').getAttribute('src')).toBe('blob:test-2')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1')
  })

  it('applies a cover crop position without changing the image source', () => {
    const blob = new Blob(['photo'], { type: 'image/webp' })
    const view = render(<ItemImage blob={blob} alt="写真" fit="cover" position={{ x: 72, y: 31 }} />)
    const image = view.getByRole('img') as HTMLImageElement
    expect(image.style.objectFit).toBe('cover')
    expect(image.style.objectPosition).toBe('72% 31%')
  })
})
