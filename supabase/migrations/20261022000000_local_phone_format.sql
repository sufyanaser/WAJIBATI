-- Migrate guardian phone storage from E164 (+9647XXXXXXXXX) to local Iraqi format (07XXXXXXXXX).
-- Auth emails: 9647XXXXXXXXX@guardian.rumaila.local → 07XXXXXXXXX@guardian.rumaila.local
-- Idempotent: re-running is safe; rows already in local format are left unchanged.
-- Apply to production only after operator approval.

BEGIN;

-- ── 1. Drop existing check constraint first ──────────────────────────────────
-- Must drop constraint before updating rows; otherwise updating to '07...' triggers check violation.
ALTER TABLE guardians
  DROP CONSTRAINT IF EXISTS guardians_phone_check;

-- ── 2. Update phone column in guardians ──────────────────────────────────────
-- Convert +9647XXXXXXXXX → 07XXXXXXXXX  (only rows not already local)
UPDATE guardians
SET phone = regexp_replace(phone, '^\+964', '0')
WHERE phone ~ '^\+9647[0-9]{9}$';

-- ── 3. Add new check constraint for local format (07XXXXXXXXX - 11 digits) ───
ALTER TABLE guardians
  ADD CONSTRAINT guardians_phone_check
    CHECK (phone ~ '^07[0-9]{9}$');

-- ── 4. Migrate auth.users emails ─────────────────────────────────────────────
-- 9647XXXXXXXXX@guardian.rumaila.local → 07XXXXXXXXX@guardian.rumaila.local
UPDATE auth.users
SET email = regexp_replace(email, '^964', '0')
WHERE email ~ '^9647[0-9]{9}@guardian\.rumaila\.local$';

-- ── 5. Migrate auth.identities ───────────────────────────────────────────────
UPDATE auth.identities
SET
  provider_id    = regexp_replace(provider_id, '^964', '0'),
  identity_data  = jsonb_set(
    identity_data,
    '{email}',
    to_jsonb(regexp_replace(identity_data->>'email', '^964', '0'))
  )
WHERE provider_id ~ '^9647[0-9]{9}@guardian\.rumaila\.local$';

COMMIT;
