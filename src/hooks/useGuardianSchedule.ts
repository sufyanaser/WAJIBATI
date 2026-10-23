import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface GuardianAttachment {
  id: string
  storage_path: string
  mime: string
}

export interface GuardianHomeworkDetail {
  id: string
  period: number | null
  body: string
  status: 'published' | 'draft' | 'archived'
  created_at?: string
  subject_id: number
  subject_name: string
  subject_color: string | null
  subject_icon: string | null
  teacher_id: number | null
  teacher_name: string | null
  attachments: GuardianAttachment[]
}

export interface GuardianPeriodSlot {
  period: number
  subject_id: number | null
  subject_name: string
  subject_color: string | null
  subject_icon: string | null
  teacher_id: number | null
  teacher_name: string | null
  has_homework: boolean
  homework: GuardianHomeworkDetail | null
}

export type MismatchReason =
  | 'PERIOD_MATCH_SUBJECT_MISMATCH'
  | 'AMBIGUOUS_REPEATED_SUBJECT_NO_PERIOD'
  | 'SUBJECT_NOT_IN_TIMETABLE'
  | 'OFF_TIMETABLE_PERIOD'

export interface UnmatchedHomeworkItem {
  homework: GuardianHomeworkDetail
  mismatch_reason: MismatchReason
}

export interface NoticeItem {
  id: string
  title: string
  body: string | null
  priority: number
}

export interface UseGuardianScheduleResult {
  periods: GuardianPeriodSlot[]
  unmatchedHomework: UnmatchedHomeworkItem[]
  notices: NoticeItem[]
  loading: boolean
  error: string | null
  isWeekend: boolean
  isTimetableAvailable: boolean
  refetch: () => Promise<void>
}

// ── Cache Configuration & Management ──────────────────────────────────────────
export const CACHE_TTL_MS = 120 * 1000 // 120 seconds TTL

export interface ScheduleCacheEntry {
  periods: GuardianPeriodSlot[]
  unmatchedHomework: UnmatchedHomeworkItem[]
  notices: NoticeItem[]
  isTimetableAvailable: boolean
  timestamp: number
}

// In-memory session cache (scoped to browser tab lifecycle only — NEVER stored in localStorage)
const sessionScheduleCache = new Map<string, ScheduleCacheEntry>()

export function clearSessionScheduleCache(): void {
  sessionScheduleCache.clear()
}

export function getSessionScheduleCache(): Map<string, ScheduleCacheEntry> {
  return sessionScheduleCache
}

let currentAuthUserId = 'anonymous'

export function setScheduleAuthScope(scope: string): void {
  currentAuthUserId = scope
}

if (typeof window !== 'undefined' && supabase?.auth) {
  try {
    supabase.auth.getSession?.().then(({ data }: { data: { session: { user?: { id: string } } | null } }) => {
      if (data?.session?.user?.id) {
        currentAuthUserId = data.session.user.id
      }
    }).catch(() => {})

    supabase.auth.onAuthStateChange?.((event: string, session: { user?: { id: string } } | null) => {
      const newUserId = session?.user?.id ?? 'anonymous'
      if (newUserId !== currentAuthUserId || event === 'SIGNED_OUT') {
        clearSessionScheduleCache()
        currentAuthUserId = newUserId
      }
    })
  } catch {
    // Ignore in non-browser or test mock environments
  }
}

/**
 * Hook to retrieve the daily guardian schedule and published homework.
 * Implements strict Quad-Field matching: (section_id, due_date, period, subject_id).
 */
export function useGuardianSchedule(
  sectionId: number | string | null,
  date: string,
  authScope?: string | null,
): UseGuardianScheduleResult {
  const [periods, setPeriods] = useState<GuardianPeriodSlot[]>([])
  const [unmatchedHomework, setUnmatchedHomework] = useState<UnmatchedHomeworkItem[]>([])
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTimetableAvailable, setIsTimetableAvailable] = useState(true)

  // Track active fetch to discard stale responses from race conditions
  const activeFetchIdRef = useRef(0)

  // Official school weekend check: Friday (5) & Saturday (6)
  const isWeekend = (() => {
    if (!date) return false
    const d = new Date(date + 'T00:00:00')
    const w = d.getDay()
    return w === 5 || w === 6
  })()

  const fetchData = useCallback(async (forceBypass = false) => {
    if (sectionId === null || sectionId === undefined || !date) {
      setPeriods([])
      setUnmatchedHomework([])
      setNotices([])
      return
    }

    const sec = Number(sectionId)
    const fetchId = ++activeFetchIdRef.current
    const effectiveAuth = authScope || currentAuthUserId || 'anon'
    const cacheKey = `${effectiveAuth}_${sec}_${date}`

    const cached = sessionScheduleCache.get(cacheKey)
    const isCacheFresh = cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)

    if (forceBypass) {
      sessionScheduleCache.delete(cacheKey)
      setLoading(true)
    } else if (cached) {
      // Optimistically display cached data immediately
      setPeriods(cached.periods)
      setUnmatchedHomework(cached.unmatchedHomework)
      setNotices(cached.notices)
      setIsTimetableAvailable(cached.isTimetableAvailable)
      setError(null)

      if (isCacheFresh) {
        setLoading(false)
        return
      }
      // Stale cache: keep displaying previous data, but revalidate in background
      setLoading(false)
    } else {
      setLoading(true)
    }

    const weekday = new Date(date + 'T00:00:00').getDay()
    const now = new Date().toISOString()

    try {
      // Execute parallel queries: timetable, homework, notices
      const [ttRes, hwRes, nRes] = await Promise.all([
        supabase
          .from('timetable')
          .select('period, subject_id, teacher_id, subject:subjects(id, name, color, icon), teacher:teachers(id, full_name)')
          .eq('section_id', sec)
          .eq('weekday', weekday)
          .order('period'),
        supabase
          .from('homework')
          .select('id, period, body, subject_id, teacher_id, status, created_at, subject:subjects(id, name, color, icon), teacher:teachers(id, full_name), attachments(id, storage_path, mime)')
          .eq('section_id', sec)
          .eq('due_date', date)
          .eq('status', 'published')
          .order('period'),
        supabase
          .from('notices')
          .select('id, title, body, priority')
          .or(`section_id.is.null,section_id.eq.${sec}`)
          .lte('publish_at', now)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('priority', { ascending: false })
          .limit(3),
      ])

      // If a newer request has started, discard this result
      if (fetchId !== activeFetchIdRef.current) return

      if (ttRes.error) throw ttRes.error
      if (hwRes.error) throw hwRes.error

      interface RawSubject {
        id: number
        name: string
        color: string | null
        icon: string | null
      }
      interface RawTeacher {
        id: number
        full_name: string
      }
      interface RawTtSlot {
        period: number
        subject_id: number
        teacher_id: number | null
        subject: RawSubject | null
        teacher: RawTeacher | null
      }
      interface RawHwRow {
        id: string
        period: number | null
        body: string
        subject_id: number
        teacher_id: number | null
        status: 'published' | 'draft' | 'archived'
        created_at?: string
        subject: RawSubject | null
        teacher: RawTeacher | null
        attachments: GuardianAttachment[]
      }

      const ttData = (ttRes.data ?? []) as unknown as RawTtSlot[]
      const hwData = (hwRes.data ?? []) as unknown as RawHwRow[]
      const noticesData = (nRes.data ?? []) as unknown as NoticeItem[]

      // Transform raw homework rows into standardized detail objects
      const allHwDetails: GuardianHomeworkDetail[] = hwData.map(h => ({
        id: h.id,
        period: h.period,
        body: h.body,
        status: h.status,
        created_at: h.created_at,
        subject_id: h.subject_id,
        subject_name: h.subject?.name ?? 'مادة غير محددة',
        subject_color: h.subject?.color ?? null,
        subject_icon: h.subject?.icon ?? null,
        teacher_id: h.teacher_id,
        teacher_name: h.teacher?.full_name ?? null,
        attachments: h.attachments ?? [],
      }))

      const timetableSlots: GuardianPeriodSlot[] = []
      const unmatched: UnmatchedHomeworkItem[] = []
      const assignedHwIds = new Set<string>()

      const hasTimetable = ttData.length > 0
      setIsTimetableAvailable(hasTimetable)

      if (hasTimetable) {
        // Step 1: Initialize slots from timetable
        for (const slot of ttData) {
          timetableSlots.push({
            period: slot.period,
            subject_id: slot.subject_id,
            subject_name: slot.subject?.name ?? 'مادة غير محددة',
            subject_color: slot.subject?.color ?? null,
            subject_icon: slot.subject?.icon ?? null,
            teacher_id: slot.teacher_id,
            teacher_name: slot.teacher?.full_name ?? null,
            has_homework: false,
            homework: null,
          })
        }

        // Step 2: Strict Quad-Matching for homework with non-null period
        for (const hw of allHwDetails) {
          if (hw.period != null) {
            const matchingSlot = timetableSlots.find(s => s.period === hw.period)
            if (matchingSlot) {
              if (matchingSlot.subject_id === hw.subject_id) {
                // Quad-match verified
                matchingSlot.has_homework = true
                matchingSlot.homework = hw
                assignedHwIds.add(hw.id)
              } else {
                // Period matched, but subject differs
                unmatched.push({
                  homework: hw,
                  mismatch_reason: 'PERIOD_MATCH_SUBJECT_MISMATCH',
                })
                assignedHwIds.add(hw.id)
              }
            } else {
              // Period not scheduled in today's timetable
              unmatched.push({
                homework: hw,
                mismatch_reason: 'OFF_TIMETABLE_PERIOD',
              })
              assignedHwIds.add(hw.id)
            }
          }
        }

        // Step 3: Handle legacy / null-period homework
        for (const hw of allHwDetails) {
          if (assignedHwIds.has(hw.id)) continue

          if (hw.period == null) {
            const candidateSlots = timetableSlots.filter(s => s.subject_id === hw.subject_id)
            if (candidateSlots.length === 1) {
              const target = candidateSlots[0]
              if (!target.has_homework) {
                target.has_homework = true
                target.homework = hw
                assignedHwIds.add(hw.id)
              } else {
                unmatched.push({
                  homework: hw,
                  mismatch_reason: 'AMBIGUOUS_REPEATED_SUBJECT_NO_PERIOD',
                })
                assignedHwIds.add(hw.id)
              }
            } else if (candidateSlots.length > 1) {
              // Subject repeated on same day without period number -> do not guess
              unmatched.push({
                homework: hw,
                mismatch_reason: 'AMBIGUOUS_REPEATED_SUBJECT_NO_PERIOD',
              })
              assignedHwIds.add(hw.id)
            } else {
              // Subject not in today's timetable
              unmatched.push({
                homework: hw,
                mismatch_reason: 'SUBJECT_NOT_IN_TIMETABLE',
              })
              assignedHwIds.add(hw.id)
            }
          }
        }
      } else {
        // Fallback: Timetable is not available for this section
        // Turn published homework into fallback cards ordered by period
        for (const hw of allHwDetails) {
          timetableSlots.push({
            period: hw.period ?? 0,
            subject_id: hw.subject_id,
            subject_name: hw.subject_name,
            subject_color: hw.subject_color,
            subject_icon: hw.subject_icon,
            teacher_id: hw.teacher_id,
            teacher_name: hw.teacher_name,
            has_homework: true,
            homework: hw,
          })
        }
      }

      setPeriods(timetableSlots)
      setUnmatchedHomework(unmatched)
      setNotices(noticesData)

      // Store in session cache with fresh timestamp
      sessionScheduleCache.set(cacheKey, {
        periods: timetableSlots,
        unmatchedHomework: unmatched,
        notices: noticesData,
        isTimetableAvailable: hasTimetable,
        timestamp: Date.now(),
      })

      // Mark read side effect (non-critical)
      supabase.rpc('mark_read', { p_section: sec, p_day: date }).then(
        () => {},
        () => {},
      )
    } catch {
      if (fetchId !== activeFetchIdRef.current) return
      // If we don't have existing cached data, clear periods; otherwise preserve previous data
      if (!cached) {
        setPeriods([])
        setUnmatchedHomework([])
        setError('تعذر تحميل الجدول والواجبات — يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً')
      } else {
        setError('تعذر تحديث الجدول والواجبات — يتم عرض آخر بيانات متوفرة')
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [sectionId, date, authScope])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Tab visibility revalidation when returning after TTL (120s)
  useEffect(() => {
    function handleVisibilityChange() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && sectionId != null && date) {
        const sec = Number(sectionId)
        const effectiveAuth = authScope || currentAuthUserId || 'anon'
        const key = `${effectiveAuth}_${sec}_${date}`
        const cached = sessionScheduleCache.get(key)
        if (cached && Date.now() - cached.timestamp >= CACHE_TTL_MS) {
          fetchData(false)
        }
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [fetchData, sectionId, date, authScope])

  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  return {
    periods,
    unmatchedHomework,
    notices,
    loading,
    error,
    isWeekend,
    isTimetableAvailable,
    refetch,
  }
}
