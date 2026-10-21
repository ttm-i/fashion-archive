import { useEffect, useState } from 'react'

export type Route =
  | { name: 'collection' }
  | { name: 'insights' }
  | { name: 'settings' }
  | { name: 'new' }
  | { name: 'detail'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'trash' }
  | { name: 'categories' }
  | { name: 'backup' }

function parseHash(): Route {
  const path = window.location.hash.replace(/^#\/?/, '')
  const [first, second] = path.split('/')
  if (first === 'item' && second) return { name: 'detail', id: second }
  if (first === 'edit' && second) return { name: 'edit', id: second }
  if (first === 'new') return { name: 'new' }
  if (first === 'insights') return { name: 'insights' }
  if (first === 'settings') return { name: 'settings' }
  if (first === 'trash') return { name: 'trash' }
  if (first === 'categories') return { name: 'categories' }
  if (first === 'backup') return { name: 'backup' }
  return { name: 'collection' }
}

export function navigate(path: string, replace = false) {
  const hash = `#/${path.replace(/^\//, '')}`
  if (replace) window.history.replaceState(null, '', hash)
  else window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(parseHash)
  useEffect(() => {
    if (!window.location.hash) navigate('collection', true)
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
