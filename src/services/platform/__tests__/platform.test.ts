import { describe, it, expect } from 'vitest'
import { isTauri, getPlatform, platform } from '../index'

describe('Platform Service Detection and Integrity', () => {
  it('correctly defaults to web in standard browser/jsdom environment', () => {
    expect(isTauri()).toBe(false)
    const active = getPlatform()
    expect(active.name).toBe('web')
    expect(active.isDesktop).toBe(false)
    expect(platform.name).toBe('web')
  })

  it('provides functioning dialog and notifier services on web', async () => {
    expect(platform.dialog).toBeDefined()
    expect(typeof platform.dialog.saveFile).toBe('function')
    expect(typeof platform.dialog.openFile).toBe('function')

    expect(platform.notifier).toBeDefined()
    expect(typeof platform.notifier.notify).toBe('function')
  })

  it('storage adapter conforms to SupportedStorage interface', () => {
    expect(typeof platform.storage.getItem).toBe('function')
    expect(typeof platform.storage.setItem).toBe('function')
    expect(typeof platform.storage.removeItem).toBe('function')
  })
})
