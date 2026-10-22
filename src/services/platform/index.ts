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
