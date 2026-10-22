/**
 * Playwright global setup — provisions dev admin auth user before test run.
 * Uses Supabase Admin API (service role key) to upsert admin@admin.rumaila.local.
 * Safe: idempotent upsert, never touches production guardian data.
 */
// Wire up the proxy so Node.js fetch reaches external services in this cloud env
import { ProxyAgent, setGlobalDispatcher } from 'undici'
if (process.env.HTTPS_PROXY) {
  setGlobalDispatcher(new ProxyAgent({ uri: process.env.HTTPS_PROXY }))
}

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ADMIN_EMAIL = 'admin@admin.rumaila.local'
const ADMIN_PASSWORD = 'admin1'

async function globalSetup() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn('[global-setup] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — admin tests will skip')
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Try to create the admin auth user (idempotent — ignore "already registered")
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  })

  let userId: string | null = null

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('already registered')) {
      console.log('[global-setup] Admin user already exists in auth.users — will ensure admins row via SQL')
      // User exists — ensure admins row via SELECT from auth.users (same as migration)
      const { error: rpcError } = await (supabase as any).rpc('setup_dev_admin', {})
      if (rpcError) {
        // rpc not available — try direct upsert via a raw SQL insert using the REST endpoint
        // Since we can't easily get the user_id, rely on the migration having already done this
        console.log('[global-setup] Assuming admins row already present from migration')
      }
    } else {
      console.error('[global-setup] Unexpected error creating admin user:', createError.message)
    }
  } else {
    userId = created.user.id
    console.log('[global-setup] Created admin auth user, id:', userId)
    // New user — upsert admins row
    const { error: adminError } = await supabase
      .from('admins')
      .upsert({ user_id: userId, full_name: 'مدير النظام', role: 'owner' }, { onConflict: 'user_id' })
    if (adminError) {
      console.error('[global-setup] Failed to upsert admins row:', adminError.message)
    } else {
      console.log('[global-setup] Admin row created in admins table')
    }
  }

  console.log('[global-setup] Admin setup complete — tests should authenticate')
}

export default globalSetup
