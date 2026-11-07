-- Migration: 20261022210000_fix_gotrue_null_tokens.sql
-- Ensures auth.users token columns default to empty string rather than NULL.
-- Resolves GoTrue v2.197+ scan error:
-- "sql: Scan error on column index 3, name \"confirmation_token\": converting NULL to string is unsupported"

UPDATE auth.users
SET confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL;
