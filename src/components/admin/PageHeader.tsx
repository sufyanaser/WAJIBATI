import React from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  badgeText?: string
  badgeVariant?: 'gold' | 'green' | 'blue' | 'muted'
  actions?: React.ReactNode
}

const BADGE_CLASSES: Record<'gold' | 'green' | 'blue' | 'muted', string> = {
  gold: 'badge-gold',
  green: 'badge-green',
  blue: 'badge-blue',
  muted: 'badge-muted',
}

export function PageHeader({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'gold',
  actions,
}: PageHeaderProps) {
  return (
    <header className="adm-head">
      <div className="adm-head-titles">
        <div className="adm-head-title-row">
          <h1 className="adm-title">{title}</h1>
          {badgeText && <span className={`badge ${BADGE_CLASSES[badgeVariant]} adm-badge`}>{badgeText}</span>}
        </div>
        {subtitle && <p className="adm-sub">{subtitle}</p>}
      </div>

      {actions && <div className="adm-head-actions">{actions}</div>}
    </header>
  )
}
