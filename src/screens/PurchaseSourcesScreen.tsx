import { CandidateManagementScreen, type CandidateManagementConfig } from './CandidateManagementScreen'
import { MAX_FAVORITE_PURCHASE_SOURCES, PURCHASE_SOURCE_PREFERENCES_KEY, mergePurchaseSources, normalizePurchaseSourcePreferences, renamePurchaseSourcePreferences } from '../utils/purchaseSources'

const config: CandidateManagementConfig = {
  field: 'purchaseSource',
  settingKey: PURCHASE_SOURCE_PREFERENCES_KEY,
  maximum: MAX_FAVORITE_PURCHASE_SOURCES,
  normalize: normalizePurchaseSourcePreferences,
  merge: mergePurchaseSources,
  renamePreferences: renamePurchaseSourcePreferences,
  overline: 'PURCHASE SOURCES',
  entityLabel: '購入先',
  favoriteTitle: 'よく使う',
  favoriteDescription: 'よく使う購入先を、選択画面の上部に固定できます。',
  favoriteActionLabel: 'よく使う購入先に固定',
  example: '公式オンラインストア',
}

export function PurchaseSourcesScreen() {
  return <CandidateManagementScreen config={config} />
}
