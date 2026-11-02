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
  const weekdayName = date.toLocaleDateString('ar-IQ', { weekday: 'long' })

  return (
    <div className="date-nav" dir="rtl">
      {/* right arrow (prev day in RTL) */}
      <button
        type="button"
        className="date-nav-btn"
        aria-label="يوم سابق"
        onClick={() => onChange(stepDay(date, -1))}
      >
        <ChevronRightIcon size={18} />
      </button>

      {/* date label - 2 lines: date on top, weekday below */}
      <button
        type="button"
        className="date-nav-center"
        onClick={onLabelClick}
        aria-label={isToday ? `اليوم ${weekdayName}، ${arNumericDate(date)}` : `${weekdayName}، ${arNumericDate(date)}`}
      >
        <span className="date-nav-num">{arNumericDate(date)}</span>
        <span className="date-nav-day">
          {isToday ? `اليوم (${weekdayName})` : weekdayName}
        </span>
      </button>

      {/* left arrow (next day in RTL) */}
      <button
        type="button"
        className="date-nav-btn"
        aria-label="يوم تالي"
        onClick={() => onChange(stepDay(date, 1))}
      >
        <ChevronLeftIcon size={18} />
      </button>
    </div>
  )
}
