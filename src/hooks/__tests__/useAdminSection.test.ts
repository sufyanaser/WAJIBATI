import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminSection } from '../useAdminSection'
import { platform } from '../../services/platform'
import { VersionGuardState } from '../../services/platform/types'

// ── mock supabase ──────────────────────────────────────────────────────────────

const { mockFrom, mockInvoke, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInvoke: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const mockFunctions = { invoke: mockInvoke }

// ── factory helpers ────────────────────────────────────────────────────────────

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn(),
    ...overrides,
  }
  return chain
}

const timetableRows = [
  { period: 1, subject: { id: 10, name: 'رياضيات', color: '#ff0' }, teacher: { id: 20, full_name: 'أحمد' } },
  { period: 2, subject: { id: 11, name: 'علوم', color: null }, teacher: { id: 21, full_name: 'سارة' } },
]

const homeworkRows = [
  { id: 'hw-1', period: 1, body: 'واجب سابق', status: 'draft' as const },
]

// ── tests ──────────────────────────────────────────────────────────────────────

describe('useAdminSection — load', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        // eq calls chain, final eq resolves
        let callCount = 0
        chain.eq = vi.fn().mockImplementation(() => {
          callCount++
          if (callCount >= 2) return { ...chain, data: timetableRows, error: null }
          return chain
        })
      }
      if (table === 'homework') {
        let callCount = 0
        chain.eq = vi.fn().mockImplementation(() => {
          callCount++
          if (callCount >= 2) return { ...chain, data: homeworkRows, error: null }
          return chain
        })
      }
      return chain
    })
  })

  it('loads 6 periods (1-6) with timetable data merged', async () => {
    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.periods).toHaveLength(6)
    expect(result.current.periods[0].subject).toBe('رياضيات')
    expect(result.current.periods[0].body).toBe('واجب سابق')
    expect(result.current.periods[0].hw_id).toBe('hw-1')
    // periods without timetable entry have empty subject
    expect(result.current.periods[2].subject).toBe('')
  })

  it('auto-assigns teacher via get_section_subject_teachers RPC when timetable slot has null teacher', async () => {
    const ttWithNullTeacher = [
      { period: 1, subject: { id: 15, name: 'الفيزياء', color: '#38B2AC' }, teacher: null },
    ]
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let callCount = 0
        chain.eq = vi.fn().mockImplementation(() => {
          callCount++
          if (callCount >= 2) return { ...chain, data: ttWithNullTeacher, error: null }
          return chain
        })
      }
      if (table === 'homework') {
        let callCount = 0
        chain.eq = vi.fn().mockImplementation(() => {
          callCount++
          if (callCount >= 2) return { ...chain, data: [], error: null }
          return chain
        })
      }
      return chain
    })
    mockRpc.mockResolvedValue({
      data: [{ teacher_id: 99, full_name: 'حسين فاضل زيدان' }],
      error: null,
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockRpc).toHaveBeenCalledWith('get_section_subject_teachers', {
      p_section_id: 1,
      p_subject_id: 15,
    })
    expect(result.current.periods[0].subject).toBe('الفيزياء')
    expect(result.current.periods[0].teacher_id).toBe(99)
    expect(result.current.periods[0].teacher).toBe('حسين فاضل زيدان')
  })

  it('supports manual subject and teacher override via setPeriodSubject', async () => {
    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setPeriodSubject(3, 12, 'الكيمياء', 44, 'أنس طلال')
    })

    expect(result.current.periods[2].subject_id).toBe(12)
    expect(result.current.periods[2].subject).toBe('الكيمياء')
    expect(result.current.periods[2].teacher_id).toBe(44)
    expect(result.current.periods[2].teacher).toBe('أنس طلال')
  })
})

describe('useAdminSection — save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('returns SaveResult with saved count on success', async () => {
    // Setup: timetable has period 1 with subject_id
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++
          if (c >= 2) return { ...chain, data: [], error: null }
          return chain
        })
        chain.single = vi.fn().mockResolvedValue({ data: { id: 'new-hw' }, error: null })
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setBodies({ 1: 'واجب جديد' }))

    let saveResult: Awaited<ReturnType<typeof result.current.save>> | undefined
    await act(async () => {
      saveResult = await result.current.save()
    })

    expect(saveResult).toBeDefined()
    expect(saveResult!.saved).toBe(1)
    expect(saveResult!.failed).toBe(0)
    expect(saveResult!.errors).toHaveLength(0)
  })

  it('reports failure and does NOT update local status on DB error', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [], error: null }; return chain
        })
        // insert fails
        chain.single = vi.fn().mockResolvedValue({
          data: null, error: { message: 'DB error' }
        })
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setBodies({ 1: 'واجب فاشل' }))

    let saveResult: Awaited<ReturnType<typeof result.current.save>> | undefined
    await act(async () => {
      saveResult = await result.current.save()
    })

    expect(saveResult!.saved).toBe(0)
    expect(saveResult!.failed).toBe(1)
    expect(saveResult!.errors[0]).toContain('حصة 1')
    // local status must NOT be updated to 'draft'
    expect(result.current.periods[0].status).toBeNull()
  })

  it('rejects slots with null subject_id without hitting DB', async () => {
    // Period 3 has no timetable entry → subject_id = null
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [timetableRows[0]], error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [], error: null }; return chain
        })
        chain.single = vi.fn().mockResolvedValue({ data: { id: 'new-hw' }, error: null })
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Set body for period 3 (no subject in timetable)
    act(() => result.current.setBodies({ 3: 'واجب بدون مادة' }))

    let saveResult: Awaited<ReturnType<typeof result.current.save>> | undefined
    await act(async () => {
      saveResult = await result.current.save()
    })

    expect(saveResult!.failed).toBe(1)
    expect(saveResult!.errors[0]).toContain('حصة 3')
    expect(saveResult!.errors[0]).toContain('جدول')
  })
})

describe('useAdminSection — deleteHomework', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('archives homework (status=archived) instead of hard-deleting', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const deleteSpy = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: homeworkRows, error: null }; return chain
        })
        chain.update = updateSpy
        chain.delete = deleteSpy
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.periods[0].hw_id).toBe('hw-1')

    let deleteResult: Awaited<ReturnType<typeof result.current.deleteHomework>> | undefined
    await act(async () => {
      deleteResult = await result.current.deleteHomework(1)
    })

    expect(deleteResult!.ok).toBe(true)
    // Must call update with status=archived, NOT delete()
    expect(updateSpy).toHaveBeenCalledWith({ status: 'archived' })
    expect(deleteSpy).not.toHaveBeenCalled()
    // Local status must reflect archived
    expect(result.current.periods[0].status).toBe('archived')
  })

  it('returns error when no hw_id exists for the period', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [], error: null }; return chain
        })
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Period 1 has no homework (empty data)
    let deleteResult: Awaited<ReturnType<typeof result.current.deleteHomework>> | undefined
    await act(async () => {
      deleteResult = await result.current.deleteHomework(1)
    })

    expect(deleteResult!.ok).toBe(false)
    expect(deleteResult!.error).toContain('لا يوجد')
  })
})

describe('useAdminSection — publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('returns pushSent=true when send-push succeeds', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [], error: null }; return chain
        })
        chain.single = vi.fn().mockResolvedValue({ data: { id: 'new-hw' }, error: null })
      }
      return chain
    })
    mockFunctions.invoke.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setBodies({ 1: 'واجب للنشر' }))

    let pubResult: Awaited<ReturnType<typeof result.current.publish>> | undefined
    await act(async () => {
      pubResult = await result.current.publish()
    })

    expect(pubResult!.saved).toBe(1)
    expect(pubResult!.pushSent).toBe(true)
    expect(mockFunctions.invoke).toHaveBeenCalledWith('send-push', expect.objectContaining({
      body: expect.objectContaining({
        section_id: 1,
        title: 'واجباتي',
        url: '/',
      }),
    }))
  })

  it('returns pushSent=false with pushError when send-push fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [], error: null }; return chain
        })
        chain.single = vi.fn().mockResolvedValue({ data: { id: 'new-hw' }, error: null })
      }
      return chain
    })
    mockFunctions.invoke.mockResolvedValue({ data: null, error: { message: 'push failed' } })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setBodies({ 1: 'واجب' }))

    let pubResult: Awaited<ReturnType<typeof result.current.publish>> | undefined
    await act(async () => {
      pubResult = await result.current.publish()
    })

    expect(pubResult!.saved).toBe(1)
    expect(pubResult!.pushSent).toBe(false)
    expect(pubResult!.pushError).toBe('push failed')
  })

  it('does not call send-push when no slots were saved', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [], error: null }; return chain
        })
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // No body set — all slots empty
    let pubResult: Awaited<ReturnType<typeof result.current.publish>> | undefined
    await act(async () => {
      pubResult = await result.current.publish()
    })

    expect(pubResult!.saved).toBe(0)
    expect(pubResult!.pushSent).toBe(false)
    expect(mockFunctions.invoke).not.toHaveBeenCalled()
  })
})

describe('useAdminSection — Version Guard write barrier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('blocks save when Version Guard canPerformWrite is false', async () => {
    vi.spyOn(platform.versionGuard, 'canPerformWrite').mockReturnValue(false)
    vi.spyOn(platform.versionGuard, 'getState').mockReturnValue(VersionGuardState.INCOMPATIBLE)

    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: [], error: null }; return chain
        })
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setBodies({ 1: 'واجب ممنوع' }))

    let saveRes: any
    await act(async () => {
      saveRes = await result.current.save()
    })

    expect(saveRes.saved).toBe(0)
    expect(saveRes.failed).toBeGreaterThan(0)
    expect(saveRes.errors[0]).toContain('[حظر توافق الإصدار]')
  })

  it('blocks deleteHomework when Version Guard canPerformWrite is false', async () => {
    vi.spyOn(platform.versionGuard, 'canPerformWrite').mockReturnValue(false)
    vi.spyOn(platform.versionGuard, 'getState').mockReturnValue(VersionGuardState.NETWORK_ERROR)

    mockFrom.mockImplementation((table: string) => {
      const chain = makeChain()
      if (table === 'timetable') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: timetableRows, error: null }; return chain
        })
      }
      if (table === 'homework') {
        let c = 0
        chain.eq = vi.fn().mockImplementation(() => {
          c++; if (c >= 2) return { ...chain, data: homeworkRows, error: null }; return chain
        })
      }
      return chain
    })

    const { result } = renderHook(() => useAdminSection('1', '2026-10-21'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let delRes: any
    await act(async () => {
      delRes = await result.current.deleteHomework(1)
    })

    expect(delRes.ok).toBe(false)
    expect(delRes.error).toContain('[حظر توافق الإصدار]')
    expect(delRes.error).toContain('NETWORK_ERROR')
  })
})

