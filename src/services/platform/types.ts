/**
 * Platform Abstraction Layer (PAL) Type Definitions
 * Unifies Desktop (Tauri 2 / Windows) and Web (PWA / Browser) capabilities.
 */

// ── Storage Adapter (strictly compatible with @supabase/auth-js SupportedStorage) ──

export interface IStorageAdapter {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

// ── Dialog Service ──

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
}

export interface OpenDialogOptions {
  title?: string
  multiple?: boolean
  filters?: FileFilter[]
}

export interface IDialogService {
  saveFile(data: Blob | Uint8Array, defaultName: string, options?: SaveDialogOptions): Promise<{ saved: boolean; path?: string }>
  openFile(options?: OpenDialogOptions): Promise<File | File[] | null>
}

// ── Notifier Service ──

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
}

export interface INotifierService {
  notify(options: NotificationOptions): Promise<boolean>
}

// ── Version Guard (Protects Database Schema Compatibility) ──

export enum VersionGuardState {
  COMPATIBLE = 'COMPATIBLE',
  SETTING_ABSENT = 'SETTING_ABSENT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INCOMPATIBLE = 'INCOMPATIBLE',
}

export interface VersionGuardResult {
  state: VersionGuardState
  currentVersion: string
  requiredVersion: string | null
  canWrite: boolean
  message: string
}

export interface IVersionGuard {
  checkCompatibility(currentVersion: string): Promise<VersionGuardResult>
  canPerformWrite(): boolean
  getState(): VersionGuardState
}

// ── Unified Platform Interface ──

export interface IPlatformService {
  readonly name: 'web' | 'tauri'
  readonly isDesktop: boolean
  readonly storage: IStorageAdapter
  readonly dialog: IDialogService
  readonly notifier: INotifierService
  readonly versionGuard: IVersionGuard
}
