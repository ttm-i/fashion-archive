import { useEffect, useState } from 'react'
import { Image as ImageIcon, RefreshCw } from 'lucide-react'
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
  const [autoRecoveryAttempted, setAutoRecoveryAttempted] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setRecoveryUrl('')
    setAutoRecoveryAttempted(false)
    setFailed(false)
  }, [imageKey, blob])

  useEffect(() => () => {
    if (recoveryUrl) URL.revokeObjectURL(recoveryUrl)
  }, [recoveryUrl])

  if (!url) return <span className={`image-placeholder ${className}`} aria-label="写真なし"><ImageIcon aria-hidden="true" /></span>
  if (failed) return <span className={`image-load-error ${className}`} role="status"><ImageIcon aria-hidden="true" /><span>写真を表示できませんでした</span><button type="button" onClick={() => {
    if (!blob) return
    setRecoveryUrl(URL.createObjectURL(blob))
    setFailed(false)
  }}><RefreshCw aria-hidden="true" />写真を再読み込み</button></span>
  return <img className={className} src={recoveryUrl || url} alt={alt} style={{ objectFit: fit, objectPosition: position ? `${position.x}% ${position.y}%` : undefined }} onError={() => {
    if (!blob) return
    if (!autoRecoveryAttempted) {
      setAutoRecoveryAttempted(true)
      setRecoveryUrl(URL.createObjectURL(blob))
      return
    }
    setFailed(true)
  }} />
}
