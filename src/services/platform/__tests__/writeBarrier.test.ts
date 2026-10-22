import { describe, it, expect, beforeEach, vi } from 'vitest'
import { platform, assertCanWrite } from '../index'
import { VersionGuardState } from '../types'

describe('Execution-level Write Barrier (assertCanWrite)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows write when versionGuard is COMPATIBLE', async () => {
    vi.spyOn(platform.versionGuard, 'canPerformWrite').mockReturnValue(true)
    vi.spyOn(platform.versionGuard, 'getState').mockReturnValue(VersionGuardState.COMPATIBLE)

    const res = await assertCanWrite('حفظ الواجب')
    expect(res.allowed).toBe(true)
    expect(res.error).toBeUndefined()
  })

  it('blocks write when versionGuard is INCOMPATIBLE', async () => {
    vi.spyOn(platform.versionGuard, 'canPerformWrite').mockReturnValue(false)
    vi.spyOn(platform.versionGuard, 'getState').mockReturnValue(VersionGuardState.INCOMPATIBLE)

    const res = await assertCanWrite('نشر الواجب')
    expect(res.allowed).toBe(false)
    expect(res.error).toContain('[حظر توافق الإصدار]')
    expect(res.error).toContain('نشر الواجب')
    expect(res.error).toContain('INCOMPATIBLE')
  })

  it('blocks write when versionGuard reports NETWORK_ERROR', async () => {
    vi.spyOn(platform.versionGuard, 'canPerformWrite').mockReturnValue(false)
    vi.spyOn(platform.versionGuard, 'getState').mockReturnValue(VersionGuardState.NETWORK_ERROR)

    const res = await assertCanWrite('رفع المرفق')
    expect(res.allowed).toBe(false)
    expect(res.error).toContain('[حظر توافق الإصدار]')
    expect(res.error).toContain('NETWORK_ERROR')
  })

  it('blocks write when versionGuard reports PERMISSION_DENIED', async () => {
    vi.spyOn(platform.versionGuard, 'canPerformWrite').mockReturnValue(false)
    vi.spyOn(platform.versionGuard, 'getState').mockReturnValue(VersionGuardState.PERMISSION_DENIED)

    const res = await assertCanWrite('حذف الواجب')
    expect(res.allowed).toBe(false)
    expect(res.error).toContain('[حظر توافق الإصدار]')
    expect(res.error).toContain('PERMISSION_DENIED')
  })
})
