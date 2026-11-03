import { ReactNode } from 'react'
import { ChevronRightIcon } from './Icons'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  badge?: ReactNode
  showLogo?: boolean
  onBack?: () => void
  backLabel?: string
  className?: string
  variant?: 'glass' | 'brand'
}

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  showLogo = true,
  onBack,
  backLabel = 'العودة',
  className = '',
  variant = 'glass',
}: PageHeaderProps) {
  return (
    <header className={`guardian-header ${variant === 'brand' ? 'guardian-header--brand' : ''} ${className}`}>
      <div className="guardian-header-start">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="guardian-header-back-btn"
            aria-label={backLabel}
            title={backLabel}
          >
            <ChevronRightIcon size={20} />
          </button>
        )}
        {showLogo && (
          <div className="guardian-header-logo-wrap">
            <img
              src="/icon-192.png"
              alt="واجباتي"
              className="brand-logo guardian-header-logo"
              width={54}
              height={54}
            />
          </div>
        )}
        <div className="guardian-header-titles">
          <div className="guardian-header-title-row">
            <h1 className="guardian-header-title">{title}</h1>
            {badge && <div className="guardian-header-badge">{badge}</div>}
          </div>
          {subtitle && <p className="guardian-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="guardian-header-actions">{actions}</div>}
    </header>
  )
}
