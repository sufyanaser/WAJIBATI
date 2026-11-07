import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebStorageAdapter } from '../webPlatform'

describe('Supabase Auth Storage Lifecycle Verification', () => {
  let storage: WebStorageAdapter
  const STORAGE_KEY = 'sb-oconxdrujhjaunvrycdz-auth-token'

  beforeEach(() => {
    storage = new WebStorageAdapter()
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  it('verifies complete lifecycle: signIn -> getSession -> tokenRefresh -> signOut -> restart', async () => {
    // 1. Initial State (No session)
    expect(await storage.getItem(STORAGE_KEY)).toBeNull()

    // 2. Sign In (GoTrue persists session object)
    const initialSession = {
      access_token: 'initial_access_jwt',
      refresh_token: 'initial_refresh_token_secret',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'admin-uuid-1234', email: 'admin@admin.rumaila.local' },
    }
    await storage.setItem(STORAGE_KEY, JSON.stringify(initialSession))

    // Verify persisted session
    const stored = await storage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.access_token).toBe('initial_access_jwt')
    expect(parsed.user.email).toBe('admin@admin.rumaila.local')

    // 3. Token Refresh (GoTrue updates tokens in-place)
    const refreshedSession = {
      ...initialSession,
      access_token: 'refreshed_access_jwt',
      refresh_token: 'new_rotated_refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    }
    await storage.setItem(STORAGE_KEY, JSON.stringify(refreshedSession))

    const storedRefreshed = JSON.parse((await storage.getItem(STORAGE_KEY))!)
    expect(storedRefreshed.access_token).toBe('refreshed_access_jwt')
    expect(storedRefreshed.refresh_token).toBe('new_rotated_refresh_token')

    // 4. App Restart Simulation (new instance of storage adapter reading from persistent storage)
    const newSessionStorageInstance = new WebStorageAdapter()
    const recoveredSession = JSON.parse((await newSessionStorageInstance.getItem(STORAGE_KEY))!)
    expect(recoveredSession.refresh_token).toBe('new_rotated_refresh_token')
    expect(recoveredSession.user.id).toBe('admin-uuid-1234')

    // 5. Sign Out (GoTrue removes session)
    await storage.removeItem(STORAGE_KEY)
    expect(await storage.getItem(STORAGE_KEY)).toBeNull()
    expect(await newSessionStorageInstance.getItem(STORAGE_KEY)).toBeNull()
  })
})
