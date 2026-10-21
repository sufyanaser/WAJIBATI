import { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div style={{
      background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      paddingTop: '.9rem',
      paddingBottom: '.9rem',
      paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
      paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '.5rem' }}>{actions}</div>}
    </div>
  )
}
