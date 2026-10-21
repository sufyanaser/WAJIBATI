-- DEV ONLY — admin seed for local development
-- Creates (or updates) auth user: admin@admin.rumaila.local  |  password: admin
-- ⚠  CHANGE PASSWORD BEFORE PRODUCTION — never use 'admin' as a production password.
-- Production setup: create the account via Supabase Dashboard → Authentication → Users
--   Email: admin@admin.rumaila.local
--   Password: <strong password>  (do not commit it)
--   Then insert into public.admins: (user_id, 'مدير النظام', 'owner')
--
-- NOTE: Supabase Auth API enforces a 6-char minimum at the HTTP layer.
-- This migration writes crypt('admin',...) directly to auth.users, bypassing that check.
-- The ON CONFLICT ... DO UPDATE ensures that if a user was already created via the API
-- (with a temporary password), this migration corrects the password to 'admin'.

DO $$ DECLARE
  uid         UUID := 'cc000001-0000-0000-0000-000000000000';
  admin_email TEXT := 'admin@admin.rumaila.local';
  existing_id UUID;
BEGIN
  -- If a user already exists with this email (e.g. created via Admin API), update their
  -- password directly so 'admin' works, and record their actual UUID for the admin row.
  SELECT id INTO existing_id FROM auth.users WHERE email = admin_email;

  IF existing_id IS NOT NULL THEN
    -- User exists — update the password hash directly (bypasses API length policy)
    UPDATE auth.users
    SET encrypted_password = crypt('admin', gen_salt('bf')),
        updated_at = now()
    WHERE id = existing_id;
    uid := existing_id;
  ELSE
    -- No existing user — insert with deterministic UUID
    INSERT INTO auth.users(
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      crypt('admin', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated', 'authenticated', false
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- identity (idempotent)
  INSERT INTO auth.identities(
    id, user_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at, provider_id
  ) VALUES (
    gen_random_uuid(),
    uid,
    jsonb_build_object('sub', uid::text, 'email', admin_email),
    'email',
    now(), now(), now(),
    admin_email
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- admin row — owner role (idempotent, handles UUID change)
  INSERT INTO admins(user_id, full_name, role)
  VALUES (uid, 'مدير النظام', 'owner')
  ON CONFLICT (user_id) DO NOTHING;
END $$;
