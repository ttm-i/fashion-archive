import { Image as ImageIcon } from 'lucide-react'
import { useObjectUrl } from '../hooks/useObjectUrl'

export function ItemImage({ blob, alt, className = '' }: { blob?: Blob; alt: string; className?: string }) {
  const url = useObjectUrl(blob)
  if (!url) return <span className={`image-placeholder ${className}`} aria-label="写真なし"><ImageIcon aria-hidden="true" /></span>
  return <img className={className} src={url} alt={alt} />
}
