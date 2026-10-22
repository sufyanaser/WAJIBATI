import {
  IPlatformService,
  IStorageAdapter,
  IDialogService,
  INotifierService,
  IVersionGuard,
  SaveDialogOptions,
  OpenDialogOptions,
  NotificationOptions,
} from './types'
import { WebDialogService, WebNotifierService, WebVersionGuard } from './webPlatform'

// ── Desktop Secure DPAPI Storage Adapter ──

async function nativeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<T>(cmd, args)
  } catch {
    const inv = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI_INTERNALS__?.invoke
    if (typeof inv === 'function') {
      return await inv(cmd, args)
    }
    return null
  }
}

export class TauriDpapiStorage implements IStorageAdapter {
  private inMemoryCache = new Map<string, string>()

  private isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  }

  async getItem(key: string): Promise<string | null> {
    // 1. Check in-memory transient session cache first
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key)!
    }

    // 2. When running in real Tauri Desktop runtime, call Rust DPAPI IPC
    if (this.isTauriAvailable()) {
      try {
        const decrypted = await nativeInvoke<string | null>('dpapi_read', { key })
        if (decrypted) {
          this.inMemoryCache.set(key, decrypted)
          return decrypted
        }
      } catch (err) {
        console.warn('[TauriDPAPI] Native read fallback:', err)
      }
    }

    // 3. Fallback for testing/emulation environments
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key)
    }
    return null
  }

  async setItem(key: string, value: string): Promise<void> {
    this.inMemoryCache.set(key, value)

    if (this.isTauriAvailable()) {
      try {
        await nativeInvoke<void>('dpapi_write', { key, value })
        return
      } catch (err) {
        console.warn('[TauriDPAPI] Native write fallback:', err)
      }
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value)
    }
  }

  async removeItem(key: string): Promise<void> {
    this.inMemoryCache.delete(key)

    if (this.isTauriAvailable()) {
      try {
        await nativeInvoke<void>('dpapi_delete', { key })
        return
      } catch (err) {
        console.warn('[TauriDPAPI] Native delete fallback:', err)
      }
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key)
    }
  }
}

// ── Desktop Dialog Service (delegates to @tauri-apps/plugin-dialog when in desktop) ──

export class TauriDialogService implements IDialogService {
  private fallback = new WebDialogService()

  private isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  }

  async saveFile(data: Blob | Uint8Array, defaultName: string, options?: SaveDialogOptions): Promise<{ saved: boolean; path?: string }> {
    if (this.isTauriAvailable()) {
      try {
        const { save } = (window as any).__TAURI_PLUGIN_DIALOG__ || {}
        if (typeof save === 'function') {
          const selectedPath = await save({
            title: options?.title ?? 'حفظ الملف',
            defaultPath: defaultName,
            filters: options?.filters,
          })
          if (!selectedPath) return { saved: false }

          // Write bytes to disk using Tauri fs plugin
          const { writeFile } = (window as any).__TAURI_PLUGIN_FS__ || {}
          if (typeof writeFile === 'function') {
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(await (data as Blob).arrayBuffer())
            await writeFile(selectedPath, bytes)
            return { saved: true, path: selectedPath }
          }
        }
      } catch (err) {
        console.warn('[TauriDialog] Native save fallback to web:', err)
      }
    }
    return this.fallback.saveFile(data, defaultName, options)
  }

  async openFile(options?: OpenDialogOptions): Promise<File | File[] | null> {
    if (this.isTauriAvailable()) {
      try {
        const { open } = (window as any).__TAURI_PLUGIN_DIALOG__ || {}
        if (typeof open === 'function') {
          const res = await open({
            title: options?.title ?? 'اختيار ملف',
            multiple: options?.multiple,
            filters: options?.filters,
          })
          if (!res) return null
          // Res returns file path(s); read bytes via fs or forward
        }
      } catch (err) {
        console.warn('[TauriDialog] Native open fallback to web:', err)
      }
    }
    return this.fallback.openFile(options)
  }
}

// ── Desktop Notifier Service (Action Center native toasts) ──

export class TauriNotifierService implements INotifierService {
  private fallback = new WebNotifierService()

  private isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  }

  async notify(options: NotificationOptions): Promise<boolean> {
    if (this.isTauriAvailable()) {
      try {
        const { sendNotification, isPermissionGranted, requestPermission } = (window as any).__TAURI_PLUGIN_NOTIFICATION__ || {}
        if (typeof sendNotification === 'function') {
          let granted = await isPermissionGranted()
          if (!granted && typeof requestPermission === 'function') {
            const perm = await requestPermission()
            granted = perm === 'granted'
          }
          if (granted) {
            sendNotification({ title: options.title, body: options.body })
            return true
          }
        }
      } catch (err) {
        console.warn('[TauriNotifier] Native notification fallback:', err)
      }
    }
    return this.fallback.notify(options)
  }
}

// ── Desktop Platform Service Instance ──

export const tauriPlatform: IPlatformService = {
  name: 'tauri',
  isDesktop: true,
  storage: new TauriDpapiStorage(),
  dialog: new TauriDialogService(),
  notifier: new TauriNotifierService(),
  versionGuard: new WebVersionGuard(),
}
