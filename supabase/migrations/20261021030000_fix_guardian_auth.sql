-- Fix: ensure demo guardian auth users exist and are fully confirmed
-- Idempotent upsert — safe to re-run

DO $$ DECLARE
  uid1 UUID := 'aa000001-0000-0000-0000-000000000000';
  uid2 UUID := 'aa000002-0000-0000-0000-000000000000';
  uid3 UUID := 'aa000003-0000-0000-0000-000000000000';
  uid4 UUID := 'aa000004-0000-0000-0000-000000000000';
  uid5 UUID := 'aa000005-0000-0000-0000-000000000000';
BEGIN

  -- Upsert auth.users with ON CONFLICT DO UPDATE to guarantee correct state
  INSERT INTO auth.users(
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin
  ) VALUES
    (uid1,'00000000-0000-0000-0000-000000000000','9647801234567@guardian.rumaila.local',
      crypt('111111',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid2,'00000000-0000-0000-0000-000000000000','9647802345678@guardian.rumaila.local',
      crypt('222222',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid3,'00000000-0000-0000-0000-000000000000','9647803456789@guardian.rumaila.local',
      crypt('333333',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid4,'00000000-0000-0000-0000-000000000000','9647804567890@guardian.rumaila.local',
      crypt('444444',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid5,'00000000-0000-0000-0000-000000000000','9647805678901@guardian.rumaila.local',
      crypt('555555',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false)
  ON CONFLICT(id) DO UPDATE SET
    encrypted_password  = EXCLUDED.encrypted_password,
    email_confirmed_at  = COALESCE(auth.users.email_confirmed_at, now()),
    updated_at          = now(),
    raw_app_meta_data   = EXCLUDED.raw_app_meta_data,
    aud                 = EXCLUDED.aud,
    role                = EXCLUDED.role;

  -- Upsert auth.identities
  INSERT INTO auth.identities(id,user_id,identity_data,provider,created_at,updated_at,last_sign_in_at,provider_id)
  VALUES
    (gen_random_uuid(),uid1,jsonb_build_object('sub',uid1::text,'email','9647801234567@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647801234567@guardian.rumaila.local'),
    (gen_random_uuid(),uid2,jsonb_build_object('sub',uid2::text,'email','9647802345678@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647802345678@guardian.rumaila.local'),
    (gen_random_uuid(),uid3,jsonb_build_object('sub',uid3::text,'email','9647803456789@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647803456789@guardian.rumaila.local'),
    (gen_random_uuid(),uid4,jsonb_build_object('sub',uid4::text,'email','9647804567890@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647804567890@guardian.rumaila.local'),
    (gen_random_uuid(),uid5,jsonb_build_object('sub',uid5::text,'email','9647805678901@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647805678901@guardian.rumaila.local')
  ON CONFLICT(provider,provider_id) DO UPDATE SET
    updated_at       = now(),
    last_sign_in_at  = now();

END $$;
