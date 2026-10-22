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

export const phoneToEmail = (phone: string) =>
  `${normalizePhone(phone).replace('+', '')}@guardian.rumaila.local`

export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (/^07\d{9}$/.test(d)) return '+964' + d.slice(1)
  if (/^9647\d{9}$/.test(d)) return '+' + d
  if (/^7\d{9}$/.test(d)) return '+964' + d
  throw new Error('invalid_phone')
}

/**
 * Maps an admin login username to its Supabase Auth email.
 * Convention: <username>@admin.rumaila.local
 * Example: 'admin' → 'admin@admin.rumaila.local'
 */
export const usernameToAdminEmail = (username: string): string =>
  `${username.toLowerCase().trim()}@admin.rumaila.local`
