export interface CandidatePreferences {
  favorites: string[]
  custom: string[]
}

export function cleanCandidates(values: unknown) {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  return values.flatMap((value) => {
    if (typeof value !== 'string') return []
    const trimmed = value.trim()
    const key = trimmed.toLocaleLowerCase('ja-JP')
    if (!trimmed || seen.has(key)) return []
    seen.add(key)
    return [trimmed]
  })
}

export function normalizeCandidatePreferences(value: unknown, maximum: number): CandidatePreferences {
  if (!value || typeof value !== 'object') return { favorites: [], custom: [] }
  const candidate = value as Partial<CandidatePreferences>
  return {
    favorites: cleanCandidates(candidate.favorites).slice(0, maximum),
    custom: cleanCandidates(candidate.custom),
  }
}

export function mergeCandidates(values: string[], preferences: CandidatePreferences) {
  const available = cleanCandidates([...values, ...preferences.custom])
  const byKey = new Map(available.map((value) => [value.toLocaleLowerCase('ja-JP'), value]))
  const favorites = preferences.favorites.map((value) => byKey.get(value.toLocaleLowerCase('ja-JP')) ?? value)
  const favoriteKeys = new Set(favorites.map((value) => value.toLocaleLowerCase('ja-JP')))
  return [...favorites, ...available.filter((value) => !favoriteKeys.has(value.toLocaleLowerCase('ja-JP')))]
}

export function renameCandidatePreferences(preferences: CandidatePreferences, previous: string, next: string, maximum: number) {
  const replace = (value: string) => value.toLocaleLowerCase('ja-JP') === previous.toLocaleLowerCase('ja-JP') ? next : value
  return normalizeCandidatePreferences({
    favorites: preferences.favorites.map(replace),
    custom: preferences.custom.map(replace),
  }, maximum)
}
