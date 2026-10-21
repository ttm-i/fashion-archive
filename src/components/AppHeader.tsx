import { ChevronLeft } from 'lucide-react'

interface Props {
  title: string
  eyebrow?: string
  back?: () => void
  action?: React.ReactNode
}

export function AppHeader({ title, eyebrow, back, action }: Props) {
  return (
    <header className="page-header">
      <div className="page-header__side">
        {back ? (
          <button className="icon-button" type="button" onClick={back} aria-label="戻る">
            <ChevronLeft aria-hidden="true" />
          </button>
        ) : (
          <div className="brand-lockup" aria-label="Fashion Archive">
            <span>FASHION</span>
            <b>Archive</b>
          </div>
        )}
      </div>
      <div className="page-header__title">
        {eyebrow && <span>{eyebrow}</span>}
        {back && <strong>{title}</strong>}
      </div>
      <div className="page-header__side page-header__side--right">{action}</div>
    </header>
  )
}
