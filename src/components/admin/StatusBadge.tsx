import React from 'react'

export type StatusBadgeVariant =
  | 'published'
  | 'draft'
  | 'active'
  | 'suspended'
  | 'archived'
  | 'urgent'
  | 'info'
  | 'gold'
  | 'green'
  | 'blue'
  | 'red'

export interface StatusBadgeProps {
  variant: StatusBadgeVariant
  label?: string
  className?: string
}

const DEFAULT_LABELS: Record<StatusBadgeVariant, string> = {
  published: 'منشور',
  draft: 'مسودة',
  active: 'نشط',
  suspended: 'موقوف',
  archived: 'مؤرشف',
  urgent: 'عاجل',
  info: 'معلوماتي',
  gold: 'مهم',
  green: 'مكتمل',
  blue: 'قيد التنفيذ',
  red: 'تنبيه',
}

const BADGE_STYLES: Record<StatusBadgeVariant, React.CSSProperties> = {
  published: { background: 'rgba(34, 197, 139, 0.16)', color: '#22C58B', border: '1px solid rgba(34, 197, 139, 0.3)' },
  draft: { background: 'rgba(232, 176, 74, 0.16)', color: '#E8B04A', border: '1px solid rgba(232, 176, 74, 0.3)' },
  active: { background: 'rgba(34, 197, 139, 0.16)', color: '#22C58B', border: '1px solid rgba(34, 197, 139, 0.3)' },
  suspended: { background: 'rgba(245, 101, 101, 0.16)', color: '#F87171', border: '1px solid rgba(245, 101, 101, 0.3)' },
  archived: { background: 'rgba(124, 153, 184, 0.16)', color: '#94A3B8', border: '1px solid rgba(124, 153, 184, 0.3)' },
  urgent: { background: 'rgba(245, 101, 101, 0.2)', color: '#FCA5A5', border: '1px solid #EF4444' },
  info: { background: 'rgba(61, 132, 200, 0.16)', color: '#60A5FA', border: '1px solid rgba(61, 132, 200, 0.3)' },
  gold: { background: 'rgba(232, 176, 74, 0.16)', color: '#E8B04A', border: '1px solid rgba(232, 176, 74, 0.3)' },
  green: { background: 'rgba(34, 197, 139, 0.16)', color: '#22C58B', border: '1px solid rgba(34, 197, 139, 0.3)' },
  blue: { background: 'rgba(61, 132, 200, 0.16)', color: '#60A5FA', border: '1px solid rgba(61, 132, 200, 0.3)' },
  red: { background: 'rgba(245, 101, 101, 0.16)', color: '#F87171', border: '1px solid rgba(245, 101, 101, 0.3)' },
}

export function StatusBadge({ variant, label, className = '' }: StatusBadgeProps) {
  const displayLabel = label ?? DEFAULT_LABELS[variant] ?? variant
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 9px',
    borderRadius: '9999px',
    fontSize: '0.72rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
    ...BADGE_STYLES[variant],
  }

  return (
    <span style={style} className={`status-badge status-badge-${variant} ${className}`}>
      {displayLabel}
    </span>
  )
}
