import { CandidateManagementScreen, type CandidateManagementConfig } from './CandidateManagementScreen'
import { BRAND_PREFERENCES_KEY, MAX_FAVORITE_BRANDS, mergeBrands, normalizeBrandPreferences, renameBrandPreferences } from '../utils/brands'

const config: CandidateManagementConfig = {
  field: 'brand',
  settingKey: BRAND_PREFERENCES_KEY,
  maximum: MAX_FAVORITE_BRANDS,
  normalize: normalizeBrandPreferences,
  merge: mergeBrands,
  renamePreferences: renameBrandPreferences,
  overline: 'BRANDS',
  entityLabel: 'ブランド',
  favoriteTitle: 'よく買う',
  favoriteDescription: 'よく買うブランドを、選択画面の上部に固定できます。',
  favoriteActionLabel: 'よく買うブランドに固定',
  example: 'AURALEE',
  searchAlways: true,
}

export function BrandsScreen() {
  return <CandidateManagementScreen config={config} />
}
