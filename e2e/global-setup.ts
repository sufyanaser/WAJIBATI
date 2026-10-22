/**
 * Playwright global setup — verifies pre-seeded admin credentials before test run.
 *
 * SECURITY RULES:
 * - Never creates or mutates auth.users during a test run.
 * - Never uses SERVICE_ROLE_KEY (privilege escalation risk in tests).
 * - Reads all credentials exclusively from environment variables.
 * - Throws (hard FAIL) on missing vars or failed login — no silent skips.
 * - Admin account must be pre-seeded (migration 20261021210000_seed_admin_dev.sql +
 *   bootstrap.sh, or set up manually before the first test run).
 */
import { ProxyAgent, setGlobalDispatcher } from 'undici'
if (process.env.HTTPS_PROXY) {
  setGlobalDispatcher(new ProxyAgent({ uri: process.env.HTTPS_PROXY }))
}

import { createClient } from '@supabase/supabase-js'

// Known dev Supabase project ID — used as a guard against accidentally running
// mutating setup against an unexpected database.
const KNOWN_DEV_PROJECT_ID = 'oconxdrujhjaunvrycdz'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY
const ADMIN_EMAIL  = process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.rumaila.local'
const ADMIN_PASS   = process.env.E2E_ADMIN_PASSWORD

async function globalSetup() {
  // Hard fail — missing required env vars abort the entire test run clearly.
  if (!SUPABASE_URL)  throw new Error('[global-setup] VITE_SUPABASE_URL missing — set it in .env.local')
  if (!ANON_KEY)      throw new Error('[global-setup] VITE_SUPABASE_ANON_KEY missing — set it in .env.local')
  if (!ADMIN_PASS)    throw new Error('[global-setup] E2E_ADMIN_PASSWORD missing — set it in .env.local')

  // Environment guard — warn loudly if URL does not match the known dev project.
  if (!SUPABASE_URL.includes(KNOWN_DEV_PROJECT_ID)) {
    console.error(
      `[global-setup] FATAL: VITE_SUPABASE_URL does not contain the known dev project ID "${KNOWN_DEV_PROJECT_ID}".\n` +
      `  Refusing to run E2E setup against an unknown database.\n` +
      `  Set VITE_SUPABASE_URL correctly in .env.local.`
    )
    throw new Error('[global-setup] Unknown database — aborting to prevent unintended mutations')
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify pre-seeded account with regular auth — no admin API, no DB mutations.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  })

  if (error || !data.session) {
    throw new Error(
      `[global-setup] Admin login failed: ${error?.message ?? 'no session returned'}.\n` +
      `  Email: ${ADMIN_EMAIL}\n` +
      `  Ensure the admin account exists (run bootstrap.sh or apply migration\n` +
      `  20261021210000_seed_admin_dev.sql) and that E2E_ADMIN_PASSWORD matches.`
    )
  }

  // Sign out immediately — each test authenticates independently.
  await supabase.auth.signOut()
  console.log(`[global-setup] Admin credentials verified (${ADMIN_EMAIL}) — ready for test run`)
}

export default globalSetup
