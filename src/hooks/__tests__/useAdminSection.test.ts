import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminSection } from '../useAdminSection'

// ── mock supabase ──────────────────────────────────────────────────────────────

const { mockFrom, mockInvoke } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInvoke: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
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
})

describe('useAdminSection — save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

describe('useAdminSection — publish', () => {
  beforeEach(() => vi.clearAllMocks())

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
        title: 'واجبات الرميلة',
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
