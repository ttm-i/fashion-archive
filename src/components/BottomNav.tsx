import { BarChart3, Bookmark, Grid2X2, Settings } from 'lucide-react'
import { navigate } from '../hooks/useRoute'

export function BottomNav({ active }: { active: 'collection' | 'wishlist' | 'insights' | 'settings' }) {
  return (
    <nav className="bottom-nav" aria-label="主要メニュー">
      <button className={active === 'collection' ? 'active' : ''} onClick={() => navigate('collection')} type="button">
        <Grid2X2 aria-hidden="true" />
        <span>コレクション</span>
      </button>
      <button className={active === 'wishlist' ? 'active' : ''} onClick={() => navigate('wishlist')} type="button">
        <Bookmark aria-hidden="true" />
        <span>ほしいもの</span>
      </button>
      <button className={active === 'insights' ? 'active' : ''} onClick={() => navigate('insights')} type="button">
        <BarChart3 aria-hidden="true" />
        <span>インサイト</span>
      </button>
      <button className={active === 'settings' ? 'active' : ''} onClick={() => navigate('settings')} type="button">
        <Settings aria-hidden="true" />
        <span>設定</span>
      </button>
    </nav>
  )
}
