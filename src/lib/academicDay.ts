/**
 * Academic day computation locked strictly to Asia/Baghdad (UTC+03:00 invariant)
 * using standard Intl.DateTimeFormat without synthetic offset mutation on Date.now().
 */

const baghdadFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Baghdad',
  hour12: false,
  weekday: 'short',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

export interface BaghdadParts {
  weekdayIndex: number // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  hour: number         // 0..23
  minute: number       // 0..59
  second: number       // 0..59
  isoDate: string      // YYYY-MM-DD
}

export function getBaghdadParts(date: Date = new Date()): BaghdadParts {
  const parts = baghdadFormatter.formatToParts(date)
  let weekdayStr = '', hour = 0, minute = 0, second = 0, year = '', month = '', day = ''

  for (const p of parts) {
    if (p.type === 'weekday') weekdayStr = p.value
    else if (p.type === 'hour') hour = parseInt(p.value, 10)
    else if (p.type === 'minute') minute = parseInt(p.value, 10)
    else if (p.type === 'second') second = parseInt(p.value, 10)
    else if (p.type === 'year') year = p.value
    else if (p.type === 'month') month = p.value.padStart(2, '0')
    else if (p.type === 'day') day = p.value.padStart(2, '0')
  }

  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const weekdayIndex = map[weekdayStr] ?? 0
  if (hour === 24) hour = 0

  return {
    weekdayIndex,
    hour,
    minute,
    second,
    isoDate: `${year}-${month}-${day}`,
  }
}

/**
 * Calculates the smart academic day index (0=Sunday .. 4=Thursday)
 * based on Baghdad 12:00 PM transition rules.
 */
export function calculateSmartAcademicDay(weekdayIndex: number, hour: number, _minute: number = 0): number {
  const isNoonOrLater = hour >= 12

  // Sun(0) to Wed(3)
  if (weekdayIndex >= 0 && weekdayIndex <= 3) {
    return isNoonOrLater ? weekdayIndex + 1 : weekdayIndex
  }

  // Thu(4)
  if (weekdayIndex === 4) {
    return isNoonOrLater ? 0 : 4 // Roll to next Sunday
  }

  // Fri(5) or Sat(6) - Weekend always displays Sunday opening week
  return 0
}

/**
 * Computes millisecond delay until next 12:00:00 PM Baghdad time.
 */
export function computeNextNoonDelayMs(now: Date = new Date()): number {
  const parts = getBaghdadParts(now)
  let msUntilNoon: number

  if (parts.hour < 12) {
    // Today at 12:00:00 PM
    const remainingHours = 11 - parts.hour
    const remainingMinutes = 59 - parts.minute
    const remainingSeconds = 60 - parts.second
    msUntilNoon = (remainingHours * 3600 + remainingMinutes * 60 + remainingSeconds) * 1000
  } else {
    // Tomorrow at 12:00:00 PM
    const remainingHoursToday = 23 - parts.hour
    const remainingMinutesToday = 59 - parts.minute
    const remainingSecondsToday = 60 - parts.second
    const secondsToMidnight = remainingHoursToday * 3600 + remainingMinutesToday * 60 + remainingSecondsToday
    const secondsFromMidnightToNoon = 12 * 3600
    msUntilNoon = (secondsToMidnight + secondsFromMidnightToNoon) * 1000
  }

  return Math.max(1000, msUntilNoon)
}
