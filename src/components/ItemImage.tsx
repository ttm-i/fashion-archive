import { Image as ImageIcon } from 'lucide-react'
import { useObjectUrl } from '../hooks/useObjectUrl'

interface ItemImageProps {
  blob?: Blob
  alt: string
  className?: string
  fit?: 'contain' | 'cover'
  position?: { x: number; y: number }
}

export function ItemImage({ blob, alt, className = '', fit, position }: ItemImageProps) {
  const url = useObjectUrl(blob)
  if (!url) return <span className={`image-placeholder ${className}`} aria-label="写真なし"><ImageIcon aria-hidden="true" /></span>
  return <img className={className} src={url} alt={alt} style={{ objectFit: fit, objectPosition: position ? `${position.x}% ${position.y}%` : undefined }} />
}
