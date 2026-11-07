import { describe, it, expect } from 'vitest'
import { WebVersionGuard } from '../webPlatform'
import { VersionGuardState } from '../types'

describe('VersionGuard — 4-State Safety Engine', () => {
  it('allows write when setting is absent in database (safe fallback)', async () => {
    const fetcher = async (_key: string) => ({ data: null, error: null })
    const guard = new WebVersionGuard(fetcher)

    const res = await guard.checkCompatibility('1.0.0')
    expect(res.state).toBe(VersionGuardState.SETTING_ABSENT)
    expect(res.canWrite).toBe(true)
    expect(guard.canPerformWrite()).toBe(true)
  })

  it('strictly blocks write when network connection fails (failsafe)', async () => {
    const fetcher = async (_key: string) => ({
      data: null,
      error: { message: 'Failed to fetch', status: 500 },
    })
    const guard = new WebVersionGuard(fetcher)

    const res = await guard.checkCompatibility('1.0.0')
    expect(res.state).toBe(VersionGuardState.NETWORK_ERROR)
    expect(res.canWrite).toBe(false)
    expect(guard.canPerformWrite()).toBe(false)
  })

  it('strictly blocks write when permissions are denied (RLS/Auth failure)', async () => {
    const fetcher = async (_key: string) => ({
      data: null,
      error: { message: 'JWT expired or forbidden', status: 403, code: 'PGRST301' },
    })
    const guard = new WebVersionGuard(fetcher)

    const res = await guard.checkCompatibility('1.0.0')
    expect(res.state).toBe(VersionGuardState.PERMISSION_DENIED)
    expect(res.canWrite).toBe(false)
    expect(guard.canPerformWrite()).toBe(false)
  })

  it('strictly blocks write and locks app when current version is lower than required', async () => {
    const fetcher = async (_key: string) => ({
      data: { value: '1.2.0' },
      error: null,
    })
    const guard = new WebVersionGuard(fetcher)

    const res = await guard.checkCompatibility('1.1.0')
    expect(res.state).toBe(VersionGuardState.INCOMPATIBLE)
    expect(res.canWrite).toBe(false)
    expect(guard.canPerformWrite()).toBe(false)
    expect(res.requiredVersion).toBe('1.2.0')
  })

  it('allows write when current version meets or exceeds required version', async () => {
    const fetcher = async (_key: string) => ({
      data: { value: '"1.2.0"' },
      error: null,
    })
    const guard = new WebVersionGuard(fetcher)

    // Equal version
    const resEqual = await guard.checkCompatibility('1.2.0')
    expect(resEqual.state).toBe(VersionGuardState.COMPATIBLE)
    expect(resEqual.canWrite).toBe(true)
    expect(guard.canPerformWrite()).toBe(true)

    // Higher version
    const resHigher = await guard.checkCompatibility('2.0.0')
    expect(resHigher.state).toBe(VersionGuardState.COMPATIBLE)
    expect(resHigher.canWrite).toBe(true)
    expect(guard.canPerformWrite()).toBe(true)
  })
})
