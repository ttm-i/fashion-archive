import { cleanup, fireEvent, render } from '@testing-library/react'
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

  it('keeps one object URL for the same photo across blob refreshes and remounts', () => {
    const firstBlobReference = new Blob(['same-photo'], { type: 'image/webp' })
    const refreshedBlobReference = new Blob(['same-photo'], { type: 'image/webp' })
    const first = render(<ItemImage blob={firstBlobReference} imageKey="stable-photo:full" alt="写真" />)
    const firstUrl = first.getByRole('img').getAttribute('src')

    first.rerender(<ItemImage blob={refreshedBlobReference} imageKey="stable-photo:full" alt="写真" />)
    expect(first.getByRole('img').getAttribute('src')).toBe(firstUrl)
    first.unmount()

    const second = render(<ItemImage blob={refreshedBlobReference} imageKey="stable-photo:full" alt="写真" />)
    expect(second.getByRole('img').getAttribute('src')).toBe(firstUrl)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('tries one fresh object URL when iOS reports a display error', () => {
    const blob = new Blob(['photo'], { type: 'image/webp' })
    const view = render(<ItemImage blob={blob} imageKey="recover-photo:full" alt="写真" />)
    expect(view.getByRole('img').getAttribute('src')).toBe('blob:test-1')

    fireEvent.error(view.getByRole('img'))
    expect(view.getByRole('img').getAttribute('src')).toBe('blob:test-2')
    fireEvent.error(view.getByRole('img'))
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
  })
})
