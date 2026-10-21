import React from 'react'

// ── types ──────────────────────────────────────────────────────────────────────

interface PeriodRowProps {
  period: number
  subject: string
  teacher: string
  value: string
  status: 'draft' | 'published' | 'archived' | null
  onChange: (v: string) => void
}

// ── styles ─────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 14,
    display: 'grid',
    gap: 10,
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    display: 'inline-block',
    background: '#E8B04A22',
    border: '1px solid #E8B04A66',
    borderRadius: 20,
    padding: '3px 12px',
    fontSize: '.82rem',
    fontWeight: 700,
    color: '#E8B04A',
    flexShrink: 0,
  },
  subjectChip: {
    display: 'inline-block',
    background: 'var(--card2)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '3px 12px',
    fontSize: '.83rem',
    fontWeight: 700,
  },
  teacher: {
    fontSize: '.82rem',
    color: 'var(--muted)',
    marginRight: 'auto',
  },
}

// Status badge colours
function statusStyle(status: PeriodRowProps['status']): React.CSSProperties {
  if (status === 'published') return { background: '#1a3a2a', color: '#4caf82', border: '1px solid #1f5a3d', borderRadius: 20, padding: '3px 10px', fontSize: '.78rem', fontWeight: 700 }
  if (status === 'draft') return { background: '#2a3a1a', color: '#8bc34a', border: '1px solid #3d5a1f', borderRadius: 20, padding: '3px 10px', fontSize: '.78rem', fontWeight: 700 }
  return {}
}

const statusLabel = (s: PeriodRowProps['status']) =>
  s === 'published' ? 'منشور' : s === 'draft' ? 'مسودة' : s === 'archived' ? 'مؤرشف' : ''

// ── component ──────────────────────────────────────────────────────────────────

export default function PeriodRow({ period, subject, teacher, value, status, onChange }: PeriodRowProps) {
  const cardStyle: React.CSSProperties = {
    ...S.card,
    ...(status === 'published' ? { borderRight: '3px solid #3ab56a' } : {}),
  }

  return (
    <div style={cardStyle}>
      <div style={S.header}>
        <span style={S.badge}>حصة {period}</span>

        {subject && (
          <span style={S.subjectChip}>{subject}</span>
        )}

        {teacher && (
          <span style={S.teacher}>{teacher}</span>
        )}

        {status && (
          <span style={statusStyle(status)}>{statusLabel(status)}</span>
        )}
      </div>

      <textarea
        className="hw-textarea"
        rows={3}
        placeholder="نص الواجب…"
        value={value}
        onChange={e => onChange(e.target.value)}
        dir="rtl"
      />
    </div>
  )
}
