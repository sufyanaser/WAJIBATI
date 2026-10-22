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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)',
      }}
      className="admin-page-header"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#FFFFFF',
              fontFamily: 'var(--font-family-heading)',
            }}
          >
            {title}
          </h1>
          {badgeText && (
            <span
              className={`badge ${BADGE_CLASSES[badgeVariant]}`}
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
            >
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: '0.82rem',
              color: 'var(--muted)',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
          className="admin-page-actions"
        >
          {actions}
        </div>
      )}
    </div>
  )
}
