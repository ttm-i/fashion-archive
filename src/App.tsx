import { lazy, Suspense } from 'react'
import { BottomNav } from './components/BottomNav'
import { useRoute } from './hooks/useRoute'
import { CollectionScreen } from './screens/CollectionScreen'
import { ItemDetailScreen } from './screens/ItemDetailScreen'
import { ItemEditorScreen } from './screens/ItemEditorScreen'
import { InsightsScreen } from './screens/InsightsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TrashScreen } from './screens/TrashScreen'
import { CategoriesScreen } from './screens/CategoriesScreen'
import { MeasurementsScreen } from './screens/MeasurementsScreen'
import { WishlistScreen } from './screens/WishlistScreen'
import { useRegisterSW } from 'virtual:pwa-register/react'

const BackupScreen = lazy(() => import('./screens/BackupScreen').then((module) => ({ default: module.BackupScreen })))

export function App() {
  const route = useRoute()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  return (
    <div className="app-shell">
      {route.name === 'collection' && <><CollectionScreen /><BottomNav active="collection" /></>}
      {route.name === 'wishlist' && <><WishlistScreen /><BottomNav active="wishlist" /></>}
      {route.name === 'insights' && <><InsightsScreen /><BottomNav active="insights" /></>}
      {route.name === 'settings' && <><SettingsScreen /><BottomNav active="settings" /></>}
      {route.name === 'new' && <ItemEditorScreen />}
      {route.name === 'new-wanted' && <ItemEditorScreen mode="wanted" />}
      {route.name === 'detail' && <ItemDetailScreen id={route.id} />}
      {route.name === 'edit' && <ItemEditorScreen id={route.id} />}
      {route.name === 'edit-wanted' && <ItemEditorScreen id={route.id} mode="wanted" />}
      {route.name === 'acquire' && <ItemEditorScreen id={route.id} mode="acquire" />}
      {route.name === 'trash' && <TrashScreen />}
      {route.name === 'categories' && <CategoriesScreen />}
      {route.name === 'measurements' && <MeasurementsScreen />}
      {route.name === 'backup' && <Suspense fallback={<main className="loading-screen">バックアップ画面を読み込んでいます…</main>}><BackupScreen /></Suspense>}
      {needRefresh && <div className="update-banner" role="status"><span>新しいバージョンがあります</span><button type="button" onClick={() => updateServiceWorker(true)}>更新する</button></div>}
    </div>
  )
}
