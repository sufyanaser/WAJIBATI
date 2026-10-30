import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

// Iraqi school week: Sun(0)?"Thu(4); Fri(5) Sat(6) are off
const isSchool = (d: Date) => { const w = d.getDay(); return w !== 5 && w !== 6 }

function stepDay(d: Date, dir: 1 | -1): Date {
  const r = new Date(d)
  do { r.setDate(r.getDate() + dir) } while (!isSchool(r))
  return r
}

const toISO = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD local

// Numeric date formatting strictly in numbers: YYYY/MM/DD
const arNumericDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

interface DateNavigatorProps {
  date: Date
  onChange: (d: Date) => void
  /** Optional: called when the date label is clicked (e.g. to open a calendar picker) */
  onLabelClick?: () => void
}

/**
 * Prev/Next day navigation that skips weekends (Fri/Sat).
 * Displays the date in compact numeric-only format (YYYY/MM/DD).
 * Highlights with accent colour when showing today.
 */
export function DateNavigator({ date, onChange, onLabelClick }: DateNavigatorProps) {
  const todISO = toISO(new Date())
  const selISO = toISO(date)
  const isToday = selISO === todISO

  return (
    <div className="date-nav" dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {/* next (left arrow in RTL) */}
      <button
        className="icon-btn"
        aria-label="يوم تالي"
        onClick={() => onChange(stepDay(date, 1))}
        style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronLeftIcon size={18} />
      </button>

      {/* date label - compact numbers only */}
      <button
        className="date-label"
        onClick={onLabelClick}
        aria-label={isToday ? `اليوم، ${arNumericDate(date)}` : `التاريخ: ${arNumericDate(date)}`}
        style={{
          fontFamily: 'inherit',
          fontSize: '0.88rem',
          fontWeight: 700,
          padding: '6px 14px',
          borderRadius: 8,
          border: '1px solid',
          borderColor: isToday ? 'var(--accent, #007BFE)' : 'rgba(203, 213, 225, 0.85)',
          backgroundColor: isToday ? 'rgba(0, 123, 254, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          color: isToday ? 'var(--accent, #007BFE)' : '#0F172A',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: onLabelClick ? 'pointer' : 'default',
        }}
      >
        {isToday && (
          <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: 4, background: 'linear-gradient(135deg, #007BFE 0%, #00C4FF 100%)', color: '#FFFFFF', fontWeight: 800 }}>
            اليوم
          </span>
        )}
        <span style={{ letterSpacing: '0.5px' }}>{arNumericDate(date)}</span>
      </button>

      {/* prev (right arrow in RTL) */}
      <button
        className="icon-btn"
        aria-label="يوم سابق"
        onClick={() => onChange(stepDay(date, -1))}
        style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  )
}
