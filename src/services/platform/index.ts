import { IPlatformService } from './types'
import { webPlatform } from './webPlatform'
import { tauriPlatform } from './tauriPlatform'

export * from './types'
export { webPlatform, WebStorageAdapter, WebDialogService, WebNotifierService, WebVersionGuard } from './webPlatform'
export { tauriPlatform, TauriDpapiStorage, TauriDialogService, TauriNotifierService } from './tauriPlatform'

/**
 * Detects whether the current runtime environment is a Tauri Desktop window.
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Returns the active platform service instance (Tauri Desktop or Web Browser).
 */
export function getPlatform(): IPlatformService {
  return isTauri() ? tauriPlatform : webPlatform
}

export const platform: IPlatformService = getPlatform()

/**
 * Enforces execution-level protection against unsafe writes when Version Guard flags
 * network failure, permission denial, or version incompatibility.
 */
export async function assertCanWrite(actionLabel: string = 'العملية'): Promise<{ allowed: boolean; error?: string }> {
  // On web, if no desktop constraints apply, allow operations
  if (!platform.isDesktop && platform.versionGuard.canPerformWrite()) {
    return { allowed: true }
  }

  // Check guard state
  if (!platform.versionGuard.canPerformWrite()) {
    const state = platform.versionGuard.getState()
    const msg = `[حظر توافق الإصدار] تعذر تنفيذ ${actionLabel} نظراً لتعليق صلاحية الكتابة (${state}). يرجى التحقق من اتصال الشبكة وتوافق التطبيق.`
    return { allowed: false, error: msg }
  }

  return { allowed: true }
}
