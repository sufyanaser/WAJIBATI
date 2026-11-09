import { createClient } from '@supabase/supabase-js'
import { platform } from '../services/platform'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: platform.storage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

/**
 * Converts Arabic-Indic (٠-٩, U+0660-0669) and Extended Arabic-Indic /
 * Persian (۰-۹, U+06F0-06F9) digits to ASCII 0-9. Leading zeros are kept
 * because the input and output are strings.
 */
export function toWesternDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
}

/** Validates and normalises to local Iraqi format: 07XXXXXXXXX (11 digits). */
export function normalizePhone(raw: string): string {
  const western = toWesternDigits(raw)
  const d = western.replace(/\D/g, '')
  if (/^07\d{9}$/.test(d)) return d           // already local — return as-is
  if (/^9647\d{9}$/.test(d)) return '0' + d.slice(3)  // 9647… → 07…
  if (/^\+9647\d{9}$/.test(western.trim())) return '0' + western.trim().slice(4) // +9647… → 07…
  throw new Error('invalid_phone')
}

export type AuthErrorKind = 'network' | 'rate_limit' | 'server' | 'invalid_credentials'

/**
 * Classifies a Supabase Auth error so the UI never claims "wrong credentials"
 * when the request never reached the server (offline, DNS, rate limit, 5xx).
 */
export function classifyAuthError(err: unknown): AuthErrorKind {
  const e = err as { status?: number; message?: string; name?: string } | null
  if (!e) return 'invalid_credentials'
  const msg = (e.message ?? '').toLowerCase()
  if (
    e.status === 0 ||
    e.name === 'AuthRetryableFetchError' ||
    msg.includes('fetch') ||
    msg.includes('network')
  ) {
    return 'network'
  }
  if (e.status === 429) return 'rate_limit'
  if (typeof e.status === 'number' && e.status >= 500) return 'server'
  return 'invalid_credentials'
}

/** Arabic user-facing message for each auth error class. */
export function authErrorMessage(kind: AuthErrorKind, invalidMessage: string): string {
  switch (kind) {
    case 'network':
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً'
    case 'rate_limit':
      return 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار قليلاً ثم المحاولة مجدداً'
    case 'server':
      return 'حدث خطأ في الخادم. يرجى المحاولة مجدداً بعد قليل'
    default:
      return invalidMessage
  }
}

export const phoneToEmail = (phone: string) =>
  `${normalizePhone(phone)}@guardian.rumaila.local`

/** Returns true if the string is a valid local phone (07XXXXXXXXX). */
export function isValidPhone(phone: string): boolean {
  try { normalizePhone(phone); return true } catch { return false }
}

/** Returns true if the string is a valid 6-digit PIN (leading zeros preserved). */
export function isValidPin(pin: string): boolean {
  return /^[0-9]{6}$/.test(pin)
}

/**
 * Maps an admin login username to its Supabase Auth email.
 * Convention: <username>@admin.rumaila.local
 * Example: 'admin' → 'admin@admin.rumaila.local'
 */
export const usernameToAdminEmail = (username: string): string =>
  `${username.toLowerCase().trim()}@admin.rumaila.local`
