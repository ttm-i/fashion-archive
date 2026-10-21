import { useEffect, useMemo } from 'react'

export function useObjectUrl(blob: Blob | undefined) {
  const url = useMemo(() => blob ? URL.createObjectURL(blob) : '', [blob])

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  return url
}
