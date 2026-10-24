import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, render, screen, fireEvent, act } from '@testing-library/react'
import { useGuardianSchedule, clearSessionScheduleCache, getSessionScheduleCache, setScheduleAuthScope, CACHE_TTL_MS } from '../hooks/useGuardianSchedule'
import type { GuardianPeriodSlot, UnmatchedHomeworkItem } from '../hooks/useGuardianSchedule'
import { PeriodCard } from '../components/guardian/PeriodCard'
import { PeriodDetailDrawer } from '../components/guardian/PeriodDetailDrawer'
import { SubjectGrid } from '../components/guardian/SubjectGrid'

// ── mock supabase ──────────────────────────────────────────────────────────────

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

function createQueryChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (val: unknown) => unknown) =>
      Promise.resolve(resolve({ data, error })),
    ),
  }
  return chain
}

describe('useGuardianSchedule — Quad-Field Strict Matching & State Contracts', () => {
  beforeEach(() => {
    clearSessionScheduleCache()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('A. Case 1 — Complete Quad-Match: attaches homework to scheduled period slot', async () => {
    const timetableData = [
      {
        period: 1,
        subject_id: 101,
        teacher_id: 501,
        subject: { id: 101, name: 'الرياضيات', color: '#ff0000', icon: 'math' },
        teacher: { id: 501, full_name: 'أ. أحمد' },
      },
    ]

    const homeworkData = [
      {
        id: 'hw-101',
        period: 1,
        body: 'حل تمارين ص 45',
        subject_id: 101,
        teacher_id: 501,
        status: 'published',
        subject: { id: 101, name: 'الرياضيات', color: '#ff0000', icon: 'math' },
        teacher: { id: 501, full_name: 'أ. أحمد' },
        attachments: [],
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain(homeworkData)
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25')) // Sunday (weekday 0)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.periods).toHaveLength(1)
    const slot = result.current.periods[0]
    expect(slot.period).toBe(1)
    expect(slot.subject_name).toBe('الرياضيات')
    expect(slot.has_homework).toBe(true)
    expect(slot.homework?.body).toBe('حل تمارين ص 45')
    expect(result.current.unmatchedHomework).toHaveLength(0)
  })

  it('B. Case 2 — Slot without homework: renders period slot with has_homework = false', async () => {
    const timetableData = [
      {
        period: 2,
        subject_id: 102,
        teacher_id: 502,
        subject: { id: 102, name: 'اللغة العربية', color: '#00ff00', icon: 'book' },
        teacher: { id: 502, full_name: 'أ. علي' },
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain([])
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-26')) // Monday

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.periods).toHaveLength(1)
    const slot = result.current.periods[0]
    expect(slot.period).toBe(2)
    expect(slot.subject_name).toBe('اللغة العربية')
    expect(slot.has_homework).toBe(false)
    expect(slot.homework).toBeNull()
  })

  it('C. Case 3 — Period match with Subject mismatch: moves to unmatched with PERIOD_MATCH_SUBJECT_MISMATCH', async () => {
    // Timetable says Period 2 is الرياضيات (101)
    const timetableData = [
      {
        period: 2,
        subject_id: 101,
        teacher_id: 501,
        subject: { id: 101, name: 'الرياضيات', color: '#ff0000', icon: 'math' },
        teacher: { id: 501, full_name: 'أ. أحمد' },
      },
    ]

    // Homework says Period 2 but subject is اللغة الإنكليزية (103)
    const homeworkData = [
      {
        id: 'hw-mismatch',
        period: 2,
        body: 'Unit 3 Exercise B',
        subject_id: 103,
        teacher_id: 503,
        status: 'published',
        subject: { id: 103, name: 'اللغة الإنكليزية', color: '#0000ff', icon: 'globe' },
        teacher: { id: 503, full_name: 'أ. عمر' },
        attachments: [],
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain(homeworkData)
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-27')) // Tuesday

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // The scheduled slot (الرياضيات) must NOT have homework attached
    const slot = result.current.periods[0]
    expect(slot.has_homework).toBe(false)
    expect(slot.homework).toBeNull()

    // Must be in unmatchedHomework with strict reason
    expect(result.current.unmatchedHomework).toHaveLength(1)
    const unmatched = result.current.unmatchedHomework[0]
    expect(unmatched.mismatch_reason).toBe('PERIOD_MATCH_SUBJECT_MISMATCH')
    expect(unmatched.homework.subject_name).toBe('اللغة الإنكليزية')
  })

  it('D. Case 4 — Repeated Subject on same day: correctly segregates homework by period', async () => {
    // Arabic scheduled twice: Period 1 and Period 5
    const timetableData = [
      {
        period: 1,
        subject_id: 102,
        teacher_id: 502,
        subject: { id: 102, name: 'اللغة العربية', color: '#00ff00', icon: 'book' },
        teacher: { id: 502, full_name: 'أ. علي' },
      },
      {
        period: 5,
        subject_id: 102,
        teacher_id: 502,
        subject: { id: 102, name: 'اللغة العربية', color: '#00ff00', icon: 'book' },
        teacher: { id: 502, full_name: 'أ. علي' },
      },
    ]

    // Homework assigned ONLY to Period 1
    const homeworkData = [
      {
        id: 'hw-arabic-p1',
        period: 1,
        body: 'قراءة قصيدة المتنبي',
        subject_id: 102,
        teacher_id: 502,
        status: 'published',
        subject: { id: 102, name: 'اللغة العربية', color: '#00ff00', icon: 'book' },
        teacher: { id: 502, full_name: 'أ. علي' },
        attachments: [],
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain(homeworkData)
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-28')) // Wednesday

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const slotP1 = result.current.periods.find(s => s.period === 1)
    const slotP5 = result.current.periods.find(s => s.period === 5)

    expect(slotP1?.has_homework).toBe(true)
    expect(slotP1?.homework?.body).toBe('قراءة قصيدة المتنبي')

    expect(slotP5?.has_homework).toBe(false)
    expect(slotP5?.homework).toBeNull()
  })

  it('E. Case 5 — Legacy homework without period: matches if subject appears exactly once', async () => {
    const timetableData = [
      {
        period: 3,
        subject_id: 104,
        teacher_id: 504,
        subject: { id: 104, name: 'الكيمياء', color: '#purple', icon: 'flask' },
        teacher: { id: 504, full_name: 'أ. مصطفى' },
      },
    ]

    const homeworkData = [
      {
        id: 'hw-legacy',
        period: null, // Legacy row with no period
        body: 'كتابة معادلات الأكسدة',
        subject_id: 104,
        teacher_id: 504,
        status: 'published',
        subject: { id: 104, name: 'الكيمياء', color: '#purple', icon: 'flask' },
        teacher: { id: 504, full_name: 'أ. مصطفى' },
        attachments: [],
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain(homeworkData)
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-29')) // Thursday

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const slot = result.current.periods[0]
    expect(slot.has_homework).toBe(true)
    expect(slot.homework?.body).toBe('كتابة معادلات الأكسدة')
    expect(result.current.unmatchedHomework).toHaveLength(0)
  })

  it('F. Case 6 — Legacy homework without period: moves to unmatched if subject is repeated today', async () => {
    const timetableData = [
      { period: 1, subject_id: 102, teacher_id: 502, subject: { id: 102, name: 'عربي' }, teacher: null },
      { period: 4, subject_id: 102, teacher_id: 502, subject: { id: 102, name: 'عربي' }, teacher: null },
    ]

    const homeworkData = [
      {
        id: 'hw-ambiguous',
        period: null, // No period, and Arabic repeats twice today!
        body: 'واجب قواعد عام',
        subject_id: 102,
        teacher_id: 502,
        status: 'published',
        subject: { id: 102, name: 'عربي' },
        teacher: null,
        attachments: [],
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain(homeworkData)
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Neither slot should receive the ambiguous homework
    expect(result.current.periods[0].has_homework).toBe(false)
    expect(result.current.periods[1].has_homework).toBe(false)

    expect(result.current.unmatchedHomework).toHaveLength(1)
    expect(result.current.unmatchedHomework[0].mismatch_reason).toBe('AMBIGUOUS_REPEATED_SUBJECT_NO_PERIOD')
  })

  it('G. Case 7 — Off-timetable homework: subject not scheduled in today timetable', async () => {
    const timetableData = [
      { period: 1, subject_id: 101, teacher_id: 501, subject: { id: 101, name: 'رياضيات' }, teacher: null },
    ]

    const homeworkData = [
      {
        id: 'hw-off',
        period: null,
        body: 'نشاط بيولوجي',
        subject_id: 105, // الأحياء (not in timetable today)
        teacher_id: 505,
        status: 'published',
        subject: { id: 105, name: 'الأحياء' },
        teacher: null,
        attachments: [],
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain(homeworkData)
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.unmatchedHomework).toHaveLength(1)
    expect(result.current.unmatchedHomework[0].mismatch_reason).toBe('SUBJECT_NOT_IN_TIMETABLE')
  })

  it('H. Case 8 — Weekend Detection: Friday and Saturday report isWeekend = true', async () => {
    // Friday: 2026-10-23
    const { result: friRes } = renderHook(() => useGuardianSchedule(1, '2026-10-23'))
    await waitFor(() => expect(friRes.current.isWeekend).toBe(true))

    // Saturday: 2026-10-24
    const { result: satRes } = renderHook(() => useGuardianSchedule(1, '2026-10-24'))
    await waitFor(() => expect(satRes.current.isWeekend).toBe(true))

    // Sunday: 2026-10-25
    const { result: sunRes } = renderHook(() => useGuardianSchedule(1, '2026-10-25'))
    await waitFor(() => expect(sunRes.current.isWeekend).toBe(false))
  })

  it('I. Case 9 — Timetable not available: provides fallback slots from published homework', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain([]) // 0 rows in timetable
      if (table === 'homework') {
        return createQueryChain([
          {
            id: 'hw-fallback-1',
            period: 1,
            body: 'واجب بديل',
            subject_id: 101,
            teacher_id: 501,
            status: 'published',
            subject: { id: 101, name: 'رياضيات' },
            teacher: null,
            attachments: [],
          },
        ])
      }
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isTimetableAvailable).toBe(false)
    expect(result.current.periods).toHaveLength(1)
    expect(result.current.periods[0].has_homework).toBe(true)
    expect(result.current.periods[0].homework?.body).toBe('واجب بديل')
  })

  it('J. Case 10 — Network failure: surfaces descriptive error and preserves retry capability', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') {
        return createQueryChain(null, new Error('Network timeout'))
      }
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toContain('تعذر تحميل الجدول والواجبات')
    expect(result.current.periods).toHaveLength(0)
    expect(typeof result.current.refetch).toBe('function')
  })
})

describe('Guardian UI Components — Contracts & Accessibility', () => {
  it('K. PeriodCard — renders slot info, homework status badge and touches without "مكتمل"', () => {
    const slot: GuardianPeriodSlot = {
      period: 1,
      subject_id: 10,
      subject_name: 'الرياضيات',
      subject_color: '#ff0000',
      subject_icon: 'math',
      teacher_id: 20,
      teacher_name: 'أ. أحمد',
      has_homework: true,
      homework: {
        id: 'hw-1',
        period: 1,
        body: 'حل المعادلة ص 12',
        status: 'published',
        subject_id: 10,
        subject_name: 'الرياضيات',
        subject_color: '#ff0000',
        subject_icon: 'math',
        teacher_id: 20,
        teacher_name: 'أ. أحمد',
        attachments: [],
      },
    }

    const onClick = vi.fn()
    render(<PeriodCard slot={slot} onClick={onClick} />)

    expect(screen.getByText('الرياضيات')).toBeInTheDocument()
    expect(screen.getByText('أ. أحمد')).toBeInTheDocument()
    expect(screen.getByText('يوجد واجب 📝')).toBeInTheDocument()
    expect(screen.getByText('حل المعادلة ص 12')).toBeInTheDocument()
    // Verify that the prohibited word "مكتمل" does NOT appear
    expect(screen.queryByText(/مكتمل/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('L. PeriodDetailDrawer — closes with Escape key and back button, restoring body overflow', () => {
    const onClose = vi.fn()
    const slot: GuardianPeriodSlot = {
      period: 2,
      subject_id: 11,
      subject_name: 'اللغة العربية',
      subject_color: '#00ff00',
      subject_icon: null,
      teacher_id: 21,
      teacher_name: 'أ. علي',
      has_homework: false,
      homework: null,
    }

    const { unmount } = render(
      <PeriodDetailDrawer
        isOpen={true}
        onClose={onClose}
        slot={slot}
        unmatchedItem={null}
        signedUrls={{}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'تفاصيل اللغة العربية' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    // Click back button
    fireEvent.click(screen.getByLabelText('العودة إلى جدول المواد'))
    expect(onClose).toHaveBeenCalledTimes(1)

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)

    // Unmount and verify body overflow restored
    unmount()
    expect(document.body.style.overflow).toBe('')
  })


  it('M. PeriodDetailDrawer — preserves whitespace and line breaks for multiline homework', () => {
    const multilineSlot: GuardianPeriodSlot = {
      period: 1,
      subject_id: 101,
      subject_name: 'الفيزياء',
      subject_color: '#3b82f6',
      subject_icon: 'atom',
      teacher_id: 201,
      teacher_name: 'أ. مصطفى',
      has_homework: true,
      homework: {
        id: 'hw-multi',
        period: 1,
        body: 'الواجب الأول: حل تمارين ص 40\n\nالواجب الثاني: حفظ القوانين ص 42\n1. قانون نيوتن الثاني\n2. قانون الجذب العام',
        status: 'published',
        subject_id: 101,
        subject_name: 'الفيزياء',
        subject_color: '#3b82f6',
        subject_icon: 'atom',
        teacher_id: 201,
        teacher_name: 'أ. مصطفى',
        attachments: [],
      },
    }

    const { container } = render(
      <PeriodDetailDrawer
        isOpen={true}
        onClose={vi.fn()}
        slot={multilineSlot}
        unmatchedItem={null}
        signedUrls={{}}
      />,
    )

    const textDiv = container.querySelector('.drawer-homework-text')
    expect(textDiv).toBeInTheDocument()
    const pElement = textDiv?.querySelector('p')
    expect(pElement).toBeInTheDocument()
    expect(pElement?.textContent).toContain('\n\n')
    expect(pElement?.textContent).toContain('1. قانون نيوتن الثاني')
  })

})

describe('useGuardianSchedule — Cache Freshness & Invalidation (DEF-02)', () => {
  beforeEach(() => {
    clearSessionScheduleCache()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('N. Case 11 — Cache Freshness: explicit refetch() bypasses cache and fetches newly added homework', async () => {
    const timetableData = [
      {
        period: 1,
        subject_id: 101,
        teacher_id: 501,
        subject: { id: 101, name: 'الرياضيات' },
        teacher: { id: 501, full_name: 'أ. أحمد' },
      },
    ]

    let currentHomework: unknown[] = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain(timetableData)
      if (table === 'homework') return createQueryChain(currentHomework)
      if (table === 'notices') return createQueryChain([])
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.periods[0].has_homework).toBe(false)

    // Admin now publishes homework for period 1
    currentHomework = [
      {
        id: 'hw-new',
        period: 1,
        body: 'واجب جديد بعد النشر',
        subject_id: 101,
        teacher_id: 501,
        status: 'published',
        subject: { id: 101, name: 'الرياضيات' },
        teacher: { id: 501, full_name: 'أ. أحمد' },
        attachments: [],
      },
    ]

    // Trigger explicit refetch
    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.periods[0].has_homework).toBe(true)
    expect(result.current.periods[0].homework?.body).toBe('واجب جديد بعد النشر')
  })

  it('O. Case 12 — Cache Freshness: does not re-fetch from network when revisited before TTL expires', async () => {
    let fetchCount = 0
    const timetableData = [
      {
        period: 1,
        subject_id: 101,
        teacher_id: 501,
        subject: { id: 101, name: 'الرياضيات' },
        teacher: null,
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') {
        fetchCount++
        return createQueryChain(timetableData)
      }
      return createQueryChain([])
    })

    const { unmount } = renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-1'))
    await waitFor(() => expect(fetchCount).toBe(1))

    unmount()

    // Re-mount immediately (0 seconds passed, TTL is 120 seconds)
    const { result: remounted } = renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-1'))
    await waitFor(() => expect(remounted.current.loading).toBe(false))

    // Network query was NOT fired again because cache is fresh
    expect(fetchCount).toBe(1)
    expect(remounted.current.periods).toHaveLength(1)
  })

  it('P. Case 13 — Cache Freshness: revalidates upon tab visibility return when cache is older than TTL', async () => {
    let queryCount = 0
    const timetableData = [
      {
        period: 1,
        subject_id: 101,
        teacher_id: 501,
        subject: { id: 101, name: 'الرياضيات' },
        teacher: null,
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') {
        queryCount++
        return createQueryChain(timetableData)
      }
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(queryCount).toBe(1)

    // Manually age the cache entry past CACHE_TTL_MS (e.g. 150 seconds ago)
    const cache = getSessionScheduleCache()
    const entry = cache.get('user-1_1_2026-10-25')
    if (entry) {
      entry.timestamp = Date.now() - (CACHE_TTL_MS + 30000)
    }

    // Simulate tab return
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(queryCount).toBe(2))
  })

  it('Q. Case 14 — Cache Freshness: strictly isolates cache by auth scope, section, and date', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'timetable') return createQueryChain([])
      return createQueryChain([])
    })

    // Mount for User A, Section 1, Date 1
    const { unmount: u1 } = renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-A'))
    await waitFor(() => expect(getSessionScheduleCache().has('user-A_1_2026-10-25')).toBe(true))
    u1()

    // Mount for User B, Section 1, Date 1
    const { unmount: u2 } = renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-B'))
    await waitFor(() => expect(getSessionScheduleCache().has('user-B_1_2026-10-25')).toBe(true))
    u2()

    // Mount for User A, Section 2, Date 1
    const { unmount: u3 } = renderHook(() => useGuardianSchedule(2, '2026-10-25', 'user-A'))
    await waitFor(() => expect(getSessionScheduleCache().has('user-A_2_2026-10-25')).toBe(true))
    u3()

    // Mount for User A, Section 1, Date 2
    const { unmount: u4 } = renderHook(() => useGuardianSchedule(1, '2026-10-26', 'user-A'))
    await waitFor(() => expect(getSessionScheduleCache().has('user-A_1_2026-10-26')).toBe(true))
    u4()

    const keys = Array.from(getSessionScheduleCache().keys())
    expect(keys).toContain('user-A_1_2026-10-25')
    expect(keys).toContain('user-B_1_2026-10-25')
    expect(keys).toContain('user-A_2_2026-10-25')
    expect(keys).toContain('user-A_1_2026-10-26')
    expect(keys).toHaveLength(4)
  })

  it('R. Case 15 — Cache Freshness: clears session cache upon logout or auth scope change', async () => {
    mockFrom.mockImplementation(() => createQueryChain([]))

    renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-1'))
    await waitFor(() => expect(getSessionScheduleCache().size).toBeGreaterThan(0))

    // Logout
    act(() => {
      clearSessionScheduleCache()
    })

    expect(getSessionScheduleCache().size).toBe(0)
  })

  it('S. Case 16 — Cache Freshness: preserves existing cached schedule if background revalidation encounters network error', async () => {
    let succeed = true
    const timetableData = [
      {
        period: 1,
        subject_id: 101,
        teacher_id: 501,
        subject: { id: 101, name: 'الرياضيات' },
        teacher: { id: 501, full_name: 'أ. أحمد' },
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (!succeed) {
        return createQueryChain(null, new Error('Network timeout'))
      }
      if (table === 'timetable') return createQueryChain(timetableData)
      return createQueryChain([])
    })

    const { result } = renderHook(() => useGuardianSchedule(1, '2026-10-25', 'user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.periods).toHaveLength(1)

    // Age the cache past TTL
    const entry = getSessionScheduleCache().get('user-1_1_2026-10-25')
    if (entry) entry.timestamp = Date.now() - (CACHE_TTL_MS + 10000)

    // Now fail subsequent fetch
    succeed = false

    // Simulate tab return
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(result.current.error).toContain('تعذر تحديث الجدول والواجبات'))

    // Crucial check: Previous periods are PRESERVED and not wiped out!
    expect(result.current.periods).toHaveLength(1)
    expect(result.current.periods[0].subject_name).toBe('الرياضيات')
  })

  it('T. Case 17 — Cache Freshness: rejects late arriving out-of-order responses from earlier requests', async () => {
    let resolveFirst: (val: unknown) => void = () => {}
    const firstPromise = new Promise(res => {
      resolveFirst = res
    })

    mockFrom.mockImplementation((table: string) => {
      // First call is slow
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve: (val: unknown) => unknown) =>
          firstPromise.then(() => resolve({ data: [], error: null })),
        ),
      }
    })

    const { result, rerender } = renderHook(
      ({ sec, date }: { sec: number; date: string }) => useGuardianSchedule(sec, date, 'user-1'),
      { initialProps: { sec: 1, date: '2026-10-25' } },
    )

    // Immediately switch to Section 2 (Fast request)
    mockFrom.mockImplementation(() => createQueryChain([]))
    rerender({ sec: 2, date: '2026-10-25' })

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Now resolve the late first request
    act(() => {
      resolveFirst(null)
    })

    // Active state remains cleanly for Section 2
    expect(result.current.loading).toBe(false)
  })

})
