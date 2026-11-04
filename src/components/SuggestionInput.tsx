import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { List, Search, Star, X } from 'lucide-react'

type SuggestionInputProps = {
  id: string
  label: string
  value: string
  suggestions: string[]
  placeholder?: string
  onChange: (value: string) => void
  favoriteSuggestions?: string[]
  onFavoriteChange?: (suggestion: string, favorite: boolean) => void | Promise<void>
}

export function SuggestionInput({ id, label, value, suggestions, placeholder, onChange, favoriteSuggestions = [], onFavoriteChange }: SuggestionInputProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [viewport, setViewport] = useState(() => ({ height: window.innerHeight, top: 0 }))
  const listRef = useRef<HTMLDivElement>(null)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ja-JP')
    return normalized
      ? suggestions.filter((suggestion) => suggestion.toLocaleLowerCase('ja-JP').includes(normalized))
      : suggestions
  }, [query, suggestions])
  const favoriteKeys = useMemo(() => new Set(favoriteSuggestions.map((suggestion) => suggestion.toLocaleLowerCase('ja-JP'))), [favoriteSuggestions])
  const favoriteFiltered = filtered.filter((suggestion) => favoriteKeys.has(suggestion.toLocaleLowerCase('ja-JP')))
  const otherFiltered = filtered.filter((suggestion) => !favoriteKeys.has(suggestion.toLocaleLowerCase('ja-JP')))

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const visualViewport = window.visualViewport
    const updateViewport = () => setViewport({
      height: Math.round(visualViewport?.height ?? window.innerHeight),
      top: Math.round(visualViewport?.offsetTop ?? 0),
    })
    updateViewport()
    visualViewport?.addEventListener('resize', updateViewport)
    visualViewport?.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)
    return () => {
      visualViewport?.removeEventListener('resize', updateViewport)
      visualViewport?.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [open])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [query])

  const viewportStyle = {
    '--suggestion-viewport-height': `${viewport.height}px`,
    '--suggestion-viewport-top': `${viewport.top}px`,
  } as CSSProperties

  return (
    <div className="suggestion-field">
      <label htmlFor={id}><span>{label}</span></label>
      <div className="suggestion-input-shell">
        <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
        {suggestions.length > 0 && <button type="button" onClick={() => setOpen(true)} aria-label={`${label}の候補を表示`}><List aria-hidden="true" /><span>候補</span></button>}
      </div>
      {open && (
        <div className="sheet-backdrop suggestion-backdrop" style={viewportStyle} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="bottom-sheet suggestion-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-suggestion-title`}>
            <div className="sheet-handle" />
            <header><h2 id={`${id}-suggestion-title`}>{label}を選択</h2><button className="icon-button" type="button" onClick={close} aria-label="候補を閉じる"><X aria-hidden="true" /></button></header>
            <div className="suggestion-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="候補を検索" aria-label={`${label}の候補を検索`} /></div>
            <div ref={listRef} className="suggestion-list" role="listbox" aria-label={`${label}の候補一覧`}>
              {favoriteFiltered.length > 0 && <p className="suggestion-section-title">よく使う</p>}
              {favoriteFiltered.map((suggestion) => <SuggestionRow key={suggestion} suggestion={suggestion} selected={suggestion === value} favorite onSelect={() => { onChange(suggestion); close() }} onFavoriteChange={onFavoriteChange} />)}
              {otherFiltered.length > 0 && favoriteFiltered.length > 0 && <p className="suggestion-section-title">その他</p>}
              {otherFiltered.map((suggestion) => <SuggestionRow key={suggestion} suggestion={suggestion} selected={suggestion === value} favorite={false} onSelect={() => { onChange(suggestion); close() }} onFavoriteChange={onFavoriteChange} />)}
              {filtered.length === 0 && <p>一致する候補はありません。入力欄には新しい内容を自由に入力できます。</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SuggestionRow({ suggestion, selected, favorite, onSelect, onFavoriteChange }: { suggestion: string; selected: boolean; favorite: boolean; onSelect: () => void; onFavoriteChange?: (suggestion: string, favorite: boolean) => void | Promise<void> }) {
  return <div className={selected ? 'suggestion-row active' : 'suggestion-row'}>
    <button className="suggestion-row__select" type="button" role="option" aria-selected={selected} onClick={onSelect}>{suggestion}</button>
    {onFavoriteChange && <button className={favorite ? 'suggestion-row__favorite active' : 'suggestion-row__favorite'} type="button" onClick={() => onFavoriteChange(suggestion, !favorite)} aria-label={`${suggestion}をよく使う購入先${favorite ? 'から外す' : 'に追加'}`} aria-pressed={favorite}><Star aria-hidden="true" /></button>}
  </div>
}
