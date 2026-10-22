import { useEffect, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { useObjectUrl } from '../hooks/useObjectUrl'

interface ItemImageProps {
  blob?: Blob
  alt: string
  className?: string
  imageKey?: string
  fit?: 'contain' | 'cover'
  position?: { x: number; y: number }
}

export function ItemImage({ blob, alt, className = '', imageKey, fit, position }: ItemImageProps) {
  const url = useObjectUrl(blob, blob ? imageKey : undefined)
  const [recoveryUrl, setRecoveryUrl] = useState('')

  useEffect(() => {
    setRecoveryUrl('')
  }, [imageKey])

  useEffect(() => () => {
    if (recoveryUrl) URL.revokeObjectURL(recoveryUrl)
  }, [recoveryUrl])

  if (!url) return <span className={`image-placeholder ${className}`} aria-label="写真なし"><ImageIcon aria-hidden="true" /></span>
  return <img className={className} src={recoveryUrl || url} alt={alt} style={{ objectFit: fit, objectPosition: position ? `${position.x}% ${position.y}%` : undefined }} onError={() => {
    if (blob && !recoveryUrl) setRecoveryUrl(URL.createObjectURL(blob))
  }} />
}
