import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

// Iraqi school week: Sun(0)–Thu(4); Fri(5) Sat(6) are off
const isSchool = (d: Date) => { const w = d.getDay(); return w !== 5 && w !== 6 }

function stepDay(d: Date, dir: 1 | -1): Date {
  const r = new Date(d)
  do { r.setDate(r.getDate() + dir) } while (!isSchool(r))
  return r
}

const toISO = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD local

const arDay = (d: Date) =>
  d.toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

interface DateNavigatorProps {
  date: Date
  onChange: (d: Date) => void
  /** Optional: called when the date label is clicked (e.g. to open a calendar picker) */
  onLabelClick?: () => void
}

/**
 * Prev/Next day navigation that skips weekends (Fri/Sat).
 * Displays the date in Arabic (ar-IQ locale).
 * Highlights with accent colour when showing today.
 */
export function DateNavigator({ date, onChange, onLabelClick }: DateNavigatorProps) {
  const todISO = toISO(new Date())
  const selISO = toISO(date)
  const isToday = selISO === todISO

  return (
    <div className="date-nav" dir="rtl">
      {/* next (left arrow in RTL) */}
      <button
        className="icon-btn"
        aria-label="يوم تالٍ"
        onClick={() => onChange(stepDay(date, 1))}
      >
        <ChevronLeftIcon size={18} />
      </button>

      {/* date label — clickable to open a calendar if onLabelClick is provided */}
      <button
        className="date-label"
        onClick={onLabelClick}
        style={
          isToday
            ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
            : undefined
        }
      >
        {isToday ? `اليوم — ${arDay(date)}` : arDay(date)}
      </button>

      {/* prev (right arrow in RTL) */}
      <button
        className="icon-btn"
        aria-label="يوم سابق"
        onClick={() => onChange(stepDay(date, -1))}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  )
}
