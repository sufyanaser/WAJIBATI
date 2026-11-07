import { useState, useEffect } from 'react'
import { getBaghdadParts, computeNextNoonDelayMs, calculateSmartAcademicDay } from '../lib/academicDay'
import { supabase } from '../lib/supabase'

export interface WeeklyPeriodSlot {
  id: number
  section_id: number
  weekday: number // 0=Sunday..4=Thursday
  period: number  // 1..6
  subject_id: number
  teacher_id: number | null
  subject?: {
    id: number
    name: string
    color: string | null
    icon: string | null
  } | null
  teacher?: {
    id: number
    full_name: string
  } | null
}

export type SlotDisplayType =
  | { type: 'ASSIGNED'; slot: WeeklyPeriodSlot }
  | { type: 'UNASSIGNED_TEACHER'; slot: WeeklyPeriodSlot }
  | { type: 'NO_RECORD'; period: number }

export interface DayScheduleState {
  weekday: number
  academicDayName: string
  relativeBadge: 'اليوم التالي' | 'بداية الأسبوع' | null
  isManualSelection: boolean
  slots: SlotDisplayType[]
  isUnpublished: boolean
}

const ACADEMIC_DAY_NAMES: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
}

export function useWeeklyTimetable(sectionId: number | null) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allSlots, setAllSlots] = useState<WeeklyPeriodSlot[]>([])

  // Smart day vs User selected day
  const [smartDay, setSmartDay] = useState<number>(() => {
    const parts = getBaghdadParts()
    return calculateSmartAcademicDay(parts.weekdayIndex, parts.hour, parts.minute)
  })
  const [selectedDay, setSelectedDay] = useState<number>(smartDay)
  const [isManual, setIsManual] = useState<boolean>(false)

  // 1. Fetch entire week grid in one single network query per section
  useEffect(() => {
    if (!sectionId) {
      setAllSlots([])
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    async function fetchTimetable() {
      try {
        const { data, error: err } = await supabase
          .from('timetable')
          .select('id, section_id, weekday, period, subject_id, teacher_id, subject:subjects(id, name, color, icon), teacher:teachers(id, full_name)')
          .eq('section_id', sectionId)
          .order('weekday')
          .order('period')

        if (err) throw err

        if (isMounted) {
          setAllSlots((data as unknown as WeeklyPeriodSlot[]) || [])
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || 'تعذر تحميل الجدول الأسبوعي')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchTimetable()
    return () => {
      isMounted = false
    }
  }, [sectionId])

  // 2. Real-time Baghdad noon transition & visibility wake-up
  useEffect(() => {
    function recompute() {
      const parts = getBaghdadParts()
      const newSmartDay = calculateSmartAcademicDay(parts.weekdayIndex, parts.hour, parts.minute)
      setSmartDay(prev => {
        if (prev !== newSmartDay) {
          if (!isManual) {
            setSelectedDay(newSmartDay)
          }
          return newSmartDay
        }
        return prev
      })
    }

    // Schedule exact noon timeout
    let timerId: NodeJS.Timeout | null = null
    function scheduleNextNoon() {
      const delay = computeNextNoonDelayMs()
      timerId = setTimeout(() => {
        recompute()
        scheduleNextNoon()
      }, delay)
    }

    scheduleNextNoon()

    // Wakeup listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recompute()
      }
    }
    const handleFocus = () => recompute()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      if (timerId) clearTimeout(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isManual])

  // Manual navigation helpers
  const selectDay = (day: number) => {
    setSelectedDay(day)
    setIsManual(day !== smartDay)
  }

  const returnToSmartDay = () => {
    setSelectedDay(smartDay)
    setIsManual(false)
  }

  // Derive 6 standard period slots for selected day
  const daySlotsMap = new Map<number, WeeklyPeriodSlot>()
  for (const s of allSlots) {
    if (s.weekday === selectedDay) {
      daySlotsMap.set(s.period, s)
    }
  }

  const periods: SlotDisplayType[] = []
  for (let p = 1; p <= 6; p++) {
    const existing = daySlotsMap.get(p)
    if (!existing) {
      periods.push({ type: 'NO_RECORD', period: p })
    } else if (existing.teacher_id == null) {
      periods.push({ type: 'UNASSIGNED_TEACHER', slot: existing })
    } else {
      periods.push({ type: 'ASSIGNED', slot: existing })
    }
  }

  // Relative badge logic
  const parts = getBaghdadParts()
  let relativeBadge: 'اليوم التالي' | 'بداية الأسبوع' | null = null
  if (!isManual && selectedDay === smartDay) {
    if (parts.weekdayIndex === 4 && parts.hour >= 12) {
      relativeBadge = 'بداية الأسبوع'
    } else if (parts.weekdayIndex === 5 || parts.weekdayIndex === 6) {
      relativeBadge = 'بداية الأسبوع'
    } else if (parts.hour >= 12 && selectedDay !== parts.weekdayIndex) {
      relativeBadge = 'اليوم التالي'
    }
  }

  const daySchedule: DayScheduleState = {
    weekday: selectedDay,
    academicDayName: ACADEMIC_DAY_NAMES[selectedDay] ?? 'الأحد',
    relativeBadge,
    isManualSelection: isManual,
    slots: periods,
    isUnpublished: allSlots.length === 0 && !loading,
  }

  return {
    loading,
    error,
    daySchedule,
    selectedDay,
    smartDay,
    selectDay,
    returnToSmartDay,
  }
}
