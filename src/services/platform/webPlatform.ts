import {
  IPlatformService,
  IStorageAdapter,
  IDialogService,
  INotifierService,
  IVersionGuard,
  VersionGuardState,
  VersionGuardResult,
  SaveDialogOptions,
  OpenDialogOptions,
  NotificationOptions,
} from './types'

// ── Web Storage Adapter (localStorage with in-memory fallback) ──

export class WebStorageAdapter implements IStorageAdapter {
  private memoryFallback = new Map<string, string>()

  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false
      const testKey = '__storage_test__'
      window.localStorage.setItem(testKey, testKey)
      window.localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  getItem(key: string): string | null {
    if (this.isLocalStorageAvailable()) {
      return window.localStorage.getItem(key)
    }
    return this.memoryFallback.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.setItem(key, value)
    } else {
      this.memoryFallback.set(key, value)
    }
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.removeItem(key)
    } else {
      this.memoryFallback.delete(key)
    }
  }
}

// ── Web Dialog Service ──

export class WebDialogService implements IDialogService {
  async saveFile(data: Blob | Uint8Array, defaultName: string, _options?: SaveDialogOptions): Promise<{ saved: boolean; path?: string }> {
    try {
      const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return { saved: true, path: defaultName }
    } catch (err) {
      console.error('[WebDialog] Failed to save file:', err)
      return { saved: false }
    }
  }

  async openFile(options?: OpenDialogOptions): Promise<File | File[] | null> {
    return new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = !!options?.multiple

      if (options?.filters?.length) {
        const accept = options.filters
          .flatMap(f => f.extensions.map(ext => (ext.startsWith('.') ? ext : `.${ext}`)))
          .join(',')
        input.accept = accept
      }

      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          resolve(null)
          return
        }
        if (options?.multiple) {
          resolve(Array.from(input.files))
        } else {
          resolve(input.files[0])
        }
      }

      input.oncancel = () => resolve(null)
      input.click()
    })
  }
}

// ── Web Notifier Service ──

export class WebNotifierService implements INotifierService {
  async notify(options: NotificationOptions): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    try {
      if (Notification.permission === 'granted') {
        new Notification(options.title, { body: options.body, icon: options.icon })
        return true
      }
      if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          new Notification(options.title, { body: options.body, icon: options.icon })
          return true
        }
      }
    } catch {
      // Ignore background or permission errors
    }
    return false
  }
}

// ── Web Version Guard (Decoupled, 4-state engine) ──

export type SettingsFetcher = (key: string) => Promise<{ data: any; error: any }>

export class WebVersionGuard implements IVersionGuard {
  private state: VersionGuardState = VersionGuardState.COMPATIBLE
  private fetcher?: SettingsFetcher

  constructor(fetcher?: SettingsFetcher) {
    this.fetcher = fetcher
  }

  setFetcher(fetcher: SettingsFetcher): void {
    this.fetcher = fetcher
  }

  getState(): VersionGuardState {
    return this.state
  }

  canPerformWrite(): boolean {
    // Crucial Safety Rule:
    // If state is COMPATIBLE or SETTING_ABSENT -> allow writes.
    // If NETWORK_ERROR, PERMISSION_DENIED, or INCOMPATIBLE -> BLOCK WRITES!
    return this.state === VersionGuardState.COMPATIBLE || this.state === VersionGuardState.SETTING_ABSENT
  }

  async checkCompatibility(currentVersion: string): Promise<VersionGuardResult> {
    if (!this.fetcher) {
      // If no fetcher configured, default to safe absent state
      this.state = VersionGuardState.SETTING_ABSENT
      return {
        state: this.state,
        currentVersion,
        requiredVersion: null,
        canWrite: true,
        message: 'لا يوجد قيد إصدار مفعل في خادم قاعدة البيانات.',
      }
    }

    try {
      const { data, error } = await this.fetcher('min_desktop_version')

      if (error) {
        // Distinguish permission denied vs network failure
        const isAuthOrForbidden =
          error.code === 'PGRST301' ||
          error.status === 401 ||
          error.status === 403 ||
          error.message?.includes('permission') ||
          error.message?.includes('JWT')

        if (isAuthOrForbidden) {
          this.state = VersionGuardState.PERMISSION_DENIED
          return {
            state: this.state,
            currentVersion,
            requiredVersion: null,
            canWrite: false, // Strict: block write!
            message: 'تعذر التحقق من التوافق: تم رفض الصلاحيات الأمنية.',
          }
        }

        this.state = VersionGuardState.NETWORK_ERROR
        return {
          state: this.state,
          currentVersion,
          requiredVersion: null,
          canWrite: false, // Strict: block write!
          message: 'تعذر التحقق من توافق الإصدار بسبب انقطاع الاتصال بالخادم.',
        }
      }

      if (!data || data.value === null || data.value === undefined) {
        this.state = VersionGuardState.SETTING_ABSENT
        return {
          state: this.state,
          currentVersion,
          requiredVersion: null,
          canWrite: true,
          message: 'إعداد الحد الأدنى للإصدار غير مسجل في قاعدة البيانات؛ تشغيل آمن.',
        }
      }

      const requiredVersion = typeof data.value === 'string' ? data.value.replace(/"/g, '').trim() : String(data.value).trim()

      if (this.isSemverLesser(currentVersion, requiredVersion)) {
        this.state = VersionGuardState.INCOMPATIBLE
        return {
          state: this.state,
          currentVersion,
          requiredVersion,
          canWrite: false, // Strict: block write!
          message: `إصدار التطبيق (${currentVersion}) قديم وغير متوافق مع قاعدة البيانات. الحد الأدنى المطلوب هو (${requiredVersion}).`,
        }
      }

      this.state = VersionGuardState.COMPATIBLE
      return {
        state: this.state,
        currentVersion,
        requiredVersion,
        canWrite: true,
        message: 'إصدار التطبيق متوافق تماماً مع متطلبات النظام.',
      }
    } catch {
      this.state = VersionGuardState.NETWORK_ERROR
      return {
        state: this.state,
        currentVersion,
        requiredVersion: null,
        canWrite: false,
        message: 'حدث خطأ استثنائي أثناء التحقق من التوافق؛ تم تعليق عمليات التعديل.',
      }
    }
  }

  private isSemverLesser(current: string, required: string): boolean {
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0)
    const [cMajor, cMinor, cPatch] = parse(current)
    const [rMajor, rMinor, rPatch] = parse(required)

    if (cMajor !== rMajor) return cMajor < rMajor
    if (cMinor !== rMinor) return cMinor < rMinor
    return cPatch < rPatch
  }
}

// ── Default Web Platform Instance ──

export const webPlatform: IPlatformService = {
  name: 'web',
  isDesktop: false,
  storage: new WebStorageAdapter(),
  dialog: new WebDialogService(),
  notifier: new WebNotifierService(),
  versionGuard: new WebVersionGuard(),
}
