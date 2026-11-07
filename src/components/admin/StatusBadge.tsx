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

export function StatusBadge({ variant, label, className = '' }: StatusBadgeProps) {
  const displayLabel = label ?? DEFAULT_LABELS[variant] ?? variant

  return <span className={`status-badge status-badge-${variant} ${className}`}>{displayLabel}</span>
}
