import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { supabase } from '../../lib/supabase'

/**
 * iOS-only compatibility policy. It is independent of the web and Android versions.
 *
 * Settings keys (table `settings`, read-only for clients):
 *   ios_min_version  e.g. "1.2.0"  — builds below this are out of policy
 *   ios_update_url   https URL     — required before any blocking happens
 *
 * Blocking happens only when BOTH keys are valid and the installed version is below the minimum.
 * Missing keys, network errors, or any other failure leave the app open.
 */
export const IOS_POLICY_KEYS = ['ios_min_version', 'ios_update_url'] as const

export type IosPolicyResult =
  | { status: 'not-applicable' }
  | { status: 'ok' }
  | { status: 'update-required'; minVersion: string; updateUrl: string; currentVersion: string }

const VERSION_RE = /^\d+(\.\d+){0,2}$/

/** Compares dotted numeric versions. Returns negative, zero, or positive. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** Pure decision function. Easy to test without a device or network. */
export function evaluateIosPolicy(
  currentVersion: string,
  settings: { ios_min_version?: unknown; ios_update_url?: unknown },
): IosPolicyResult {
  const { ios_min_version: min, ios_update_url: url } = settings
  if (typeof min !== 'string' || !VERSION_RE.test(min)) return { status: 'ok' }
  if (typeof url !== 'string' || !isSafeUpdateUrl(url)) return { status: 'ok' }
  if (!VERSION_RE.test(currentVersion)) return { status: 'ok' }
  if (compareVersions(currentVersion, min) >= 0) return { status: 'ok' }
  return { status: 'update-required', minVersion: min, updateUrl: url, currentVersion }
}

/** Only https links are accepted as update targets. */
export function isSafeUpdateUrl(raw: string): boolean {
  try {
    return new URL(raw).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Checks the policy on native iOS only. Never throws; any failure returns 'ok'.
 */
export async function checkIosPolicy(): Promise<IosPolicyResult> {
  if (Capacitor.getPlatform() !== 'ios') return { status: 'not-applicable' }
  try {
    const [info, { data, error }] = await Promise.all([
      CapApp.getInfo(),
      supabase.from('settings').select('key,value').in('key', [...IOS_POLICY_KEYS]),
    ])
    if (error || !data) return { status: 'ok' }
    const settings: Record<string, unknown> = {}
    for (const row of data) settings[row.key] = row.value
    return evaluateIosPolicy(info.version, settings)
  } catch {
    return { status: 'ok' }
  }
}
