-- DEV ONLY — admin account setup documentation
-- This migration does NOT touch auth.users or auth.identities directly.
-- Direct writes to auth schema tables bypass Supabase Auth policies and are
-- not safe to apply automatically via db push.
--
-- To create the dev admin account, follow these steps ONCE manually:
--
-- 1. Supabase Dashboard → Authentication → Users → Add User
--    Email:    admin@admin.rumaila.local
--    Password: (any password ≥ 6 chars; use 'admin1' for local dev)
--    ✓ Auto confirm email
--
-- 2. Run the SQL below in Supabase Dashboard → SQL Editor:
--    (replace the WHERE clause email if needed)
--
--    INSERT INTO admins (user_id, full_name, role)
--    SELECT id, 'مدير النظام', 'owner'
--    FROM auth.users
--    WHERE email = 'admin@admin.rumaila.local'
--    ON CONFLICT (user_id) DO NOTHING;
--
-- Login: username = admin  |  password = admin1  (dev only)
-- ⚠  Use a strong password in production. Never commit credentials.
--
-- The admin username login convention:
--   'admin'  →  admin@admin.rumaila.local  (via usernameToAdminEmail())
--   Any input containing '@' passes through as-is (backward compat)

-- Idempotent: wire the admin role for any existing admin@admin.rumaila.local user.
-- Safe to run repeatedly; no-ops if the auth user does not exist yet.
DO $$
BEGIN
  INSERT INTO admins (user_id, full_name, role)
  SELECT id, 'مدير النظام', 'owner'
  FROM auth.users
  WHERE email = 'admin@admin.rumaila.local'
  ON CONFLICT (user_id) DO NOTHING;
END $$;
