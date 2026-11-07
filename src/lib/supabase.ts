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

/** Validates and normalises to local Iraqi format: 07XXXXXXXXX (11 digits). */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (/^07\d{9}$/.test(d)) return d           // already local — return as-is
  if (/^9647\d{9}$/.test(d)) return '0' + d.slice(3)  // 9647… → 07…
  if (/^\+9647\d{9}$/.test(raw.trim())) return '0' + raw.trim().slice(4) // +9647… → 07…
  throw new Error('invalid_phone')
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
