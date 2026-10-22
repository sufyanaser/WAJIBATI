import { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
  showLogo?: boolean
}

export function PageHeader({ title, subtitle, actions, showLogo = false }: Props) {
  return (
    <header className="top-bar" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      <div className="brand-identity">
        {showLogo && (
          <img src="/icon-192.png" alt="واجباتي" className="brand-logo" width={42} height={42} />
        )}
        <div className="today-header-titles">
          <h1 className="app-title">{title}</h1>
          {subtitle && <p className="school-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </header>
  )
}
