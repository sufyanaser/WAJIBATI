-- ── fix(security): patch att_guardian storage RLS — block draft attachment access ──────────────
--
-- VULNERABILITY (CRITICAL):
--   The att_guardian policy on storage.objects only checked that the first path segment
--   (section_id) belongs to the guardian's sections.  It did NOT validate that the homework
--   referenced by the second path segment has status = 'published'.
--
--   A guardian who knows (or guesses) a storage path  <section_id>/<homework_id>/<file>
--   could download files attached to DRAFT homework, bypassing the DB-level g_attach policy
--   on public.attachments (which correctly requires status = 'published').
--
--   Storage API calls are served directly by the Supabase Storage engine; they never go
--   through the attachments table RLS, so the DB policy alone is insufficient.
--
-- FIX:
--   Replace the policy with one that:
--     1. Guards the section_id segment with a numeric regex before casting (prevents cast errors).
--     2. Guards the homework_id segment with a UUID regex before casting (prevents cast errors).
--     3. Verifies section_id is in my_section_ids() (guardian owns the section).
--     4. Joins public.homework to verify status = 'published' AND section_id matches.
--
-- ADDITIONAL FIX (MEDIUM):
--   No index existed on attachments(homework_id).  The g_attach RLS policy and signed-URL
--   lookups both filter by this column.  Added below.
--
-- Migration: 20261021110000_fix_storage_draft_exposure.sql
-- Applies after: 20261021100000_security_fixes.sql

-- 1. Replace att_guardian storage policy with status-aware version
drop policy if exists att_guardian on storage.objects;

create policy att_guardian on storage.objects for select
  using (
    bucket_id = 'attachments'
    -- numeric guard: prevents invalid cast on malformed paths
    and split_part(name, '/', 1) ~ '^[0-9]+$'
    -- UUID guard: prevents invalid cast on malformed homework_id segment
    and split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    -- guardian must own this section
    and (split_part(name, '/', 1))::int in (select my_section_ids())
    -- CRITICAL: homework must be published and belong to the same section
    and exists (
      select 1 from public.homework h
      where h.id      = (split_part(name, '/', 2))::uuid
        and h.status  = 'published'
        and h.section_id = (split_part(name, '/', 1))::int
    )
  );

-- 2. Missing index on attachments(homework_id)
--    Required for efficient execution of both g_attach (DB RLS) and signed-URL lookups.
create index if not exists idx_attachments_homework_id
  on attachments(homework_id);
