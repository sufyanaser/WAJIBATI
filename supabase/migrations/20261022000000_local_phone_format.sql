-- Migrate guardian phone storage from E164 (+9647XXXXXXXXX) to local Iraqi format (07XXXXXXXXX).
-- Auth emails: 9647XXXXXXXXX@guardian.rumaila.local → 07XXXXXXXXX@guardian.rumaila.local
-- Idempotent: re-running is safe; rows already in local format are left unchanged.
-- Apply to production only after operator approval.

BEGIN;

-- ── 1. Update phone column in guardians ──────────────────────────────────────
-- Convert +9647XXXXXXXXX → 07XXXXXXXXX  (only rows not already local)
UPDATE guardians
SET phone = '0' || substring(phone FROM 4)   -- '+9647...' → '07...'
WHERE phone ~ '^\+9647[0-9]{9}$';

-- ── 2. Replace check constraint ──────────────────────────────────────────────
ALTER TABLE guardians
  DROP CONSTRAINT IF EXISTS guardians_phone_check;

ALTER TABLE guardians
  ADD CONSTRAINT guardians_phone_check
    CHECK (phone ~ '^07[0-9]{9}$');

-- ── 3. Migrate auth.users emails ─────────────────────────────────────────────
-- 9647XXXXXXXXX@guardian.rumaila.local → 07XXXXXXXXX@guardian.rumaila.local
UPDATE auth.users
SET email = '0' || substring(email FROM 5)    -- '9647..@..' → '07..@..'
WHERE email ~ '^9647[0-9]{9}@guardian\.rumaila\.local$';

-- ── 4. Migrate auth.identities ───────────────────────────────────────────────
UPDATE auth.identities
SET
  provider_id    = '0' || substring(provider_id FROM 5),
  identity_data  = jsonb_set(
    identity_data,
    '{email}',
    to_jsonb('0' || substring(identity_data->>'email' FROM 5))
  )
WHERE provider_id ~ '^9647[0-9]{9}@guardian\.rumaila\.local$';

COMMIT;
