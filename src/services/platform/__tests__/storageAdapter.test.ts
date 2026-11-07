import { describe, it, expect, beforeEach } from 'vitest'
import { WebStorageAdapter } from '../webPlatform'
import { TauriDpapiStorage } from '../tauriPlatform'

describe('Storage Adapters — Supabase Auth SupportedStorage Compliance', () => {
  describe('WebStorageAdapter', () => {
    let adapter: WebStorageAdapter

    beforeEach(() => {
      adapter = new WebStorageAdapter()
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear()
      }
    })

    it('implements getItem, setItem, removeItem correctly', async () => {
      const mockSession = JSON.stringify({
        access_token: 'fake_jwt_token',
        refresh_token: 'fake_refresh_token',
        expires_at: 1730000000,
      })

      await adapter.setItem('sb-test-auth-token', mockSession)
      const fetched = await adapter.getItem('sb-test-auth-token')
      expect(fetched).toBe(mockSession)

      await adapter.removeItem('sb-test-auth-token')
      const deleted = await adapter.getItem('sb-test-auth-token')
      expect(deleted).toBeNull()
    })

    it('returns null for non-existent keys', async () => {
      expect(await adapter.getItem('non_existent')).toBeNull()
    })
  })

  describe('TauriDpapiStorage', () => {
    let adapter: TauriDpapiStorage

    beforeEach(() => {
      adapter = new TauriDpapiStorage()
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear()
      }
    })

    it('caches tokens in-memory and supports async lifecycle', async () => {
      const mockSession = JSON.stringify({
        access_token: 'dpapi_jwt',
        refresh_token: 'dpapi_refresh',
      })

      await adapter.setItem('sb-dpapi-token', mockSession)
      const cached = await adapter.getItem('sb-dpapi-token')
      expect(cached).toBe(mockSession)

      await adapter.removeItem('sb-dpapi-token')
      const afterDelete = await adapter.getItem('sb-dpapi-token')
      expect(afterDelete).toBeNull()
    })
  })
})
