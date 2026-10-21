# Attachment Reliability Report — PR #27

## Executive Summary

This PR hardens attachment upload and delete operations in the admin homework-entry panel, eliminating duplicate-upload race conditions, improving storage-orphan logging, replacing alert() dialogs with toasts, and adding per-file retry UI. The build and lint pass cleanly. The QA pass found 16 of 18 scenarios PASS; two scenarios (S15, S16) are BLOCKED pending a deeper RLS audit, and a critical draft-exposure gap was found in the Storage bucket policy that requires a new migration before production deployment.

## Storage & RLS Audit Findings

### att_guardian storage policy (CRITICAL gap)

The current `att_guardian` policy on `storage.objects` (after `security_fixes.sql`) checks only that the first path segment (section_id) belongs to the guardian's sections:

```sql
create policy att_guardian on storage.objects for select
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) ~ '^[0-9]+$'
    and (split_part(name, '/', 1))::int in (select my_section_ids())
  );
```

It does **not** join to `public.homework` to verify `status = 'published'`. A guardian who knows the storage path `<section_id>/<homework_id>/<file>` can download files attached to **draft** homework.

The DB-level `g_attach` policy on `public.attachments` correctly requires `h.status = 'published'`, but direct storage API calls bypass that table.

### Proposed corrective storage policy (new migration required)

```sql
-- supabase/migrations/20261021110000_fix_storage_draft_exposure.sql
drop policy if exists att_guardian on storage.objects;
create policy att_guardian on storage.objects for select
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) ~ '^[0-9]+$'
    and split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (split_part(name, '/', 1))::int in (select my_section_ids())
    and exists (
      select 1 from public.homework h
      where h.id = (split_part(name, '/', 2))::uuid
        and h.status = 'published'
        and h.section_id = (split_part(name, '/', 1))::int
    )
  );
```

### Missing index

No index exists on `attachments(homework_id)`. The `g_attach` RLS policy and signed-URL lookups both filter by this column. A `create index if not exists idx_attachments_homework_id on attachments(homework_id)` should be added in the same migration.

### Other risks

| Risk | Severity | Summary |
|------|----------|---------|
| A — Cross-section access | LOW | Both DB and storage policies correctly scope to guardian's own sections. |
| B — Draft exposure via storage | CRITICAL | Storage policy lacks `status='published'` join. See above. |
| C — Upload orphan on tab close | MEDIUM | If browser closes after storage upload but before DB insert, cleanup never runs. Mitigated by logging; requires periodic GC. |
| D — Delete storage orphan | MEDIUM | `storage.remove()` failure is now logged; DB row already gone. Orphan file requires manual GC. |
| E — Date.now() path collision | LOW | Replaced with `crypto.randomUUID()` in this PR; effectively eliminated. |

## Files Changed

| File | What Changed |
|------|-------------|
| `src/hooks/useAdminSection.ts` | Added `uploadingPeriodsRef` and `deletingIdsRef` (useRef Sets) to prevent concurrent duplicate calls. Replaced `Date.now()` storage path suffix with `crypto.randomUUID()`. Added `console.error` logging before orphan cleanup attempt on DB insert failure. Captured `remove()` result and logs if cleanup itself fails. In `deleteAttachment`: added per-ID concurrency guard; captured `storage.remove()` error, logs orphan and returns `{ ok: true }` so UI stays consistent. |
| `src/pages/admin/HomeworkEntry.tsx` | Added `showToast` prop to `AttachmentChipsProps`. Added `failedFile` state. Replaced `alert()` with `showToast(…, 'error')`. Added input value clear after every upload attempt. Added retry button (`he-retry-btn`) that appears when `failedFile` is set, calls `onUpload` again, and clears state on success. |
| `src/pages/Today.tsx` | Added `.catch(e => { console.error(…); showToast('فشل تحميل المرفقات — حاول مجدداً', 'error') })` to the `createSignedUrls` promise chain to surface network errors via toast. |
| `src/styles.css` | Added `.he-attach-chip--uploading`, `.he-attach-chip--error`, and `.he-retry-btn` CSS rules. |
| `docs/ATTACHMENT-RELIABILITY-PR27.md` | This file — full audit + QA report. |

## QA Scenarios

| Scenario | Result | Notes |
|----------|--------|-------|
| S01: publish() does not trigger uploads | PASS | `publish()` calls `upsertAll()` only; `uploadAttachment` not referenced inside it. |
| S02: Happy path — image upload (JPEG) | PASS | Type/size checks pass, UUID path generated, storage + DB both succeed. |
| S03: Happy path — PDF upload | PASS | Same happy-path flow as S02. |
| S04: File too large | PASS | Returns `{ ok: false, error: 'حجم الملف يتجاوز 5MB' }` before storage call. |
| S05: Unsupported MIME type | PASS | Returns `{ ok: false, error: 'نوع الملف غير مدعوم' }` before storage call. |
| S06: Storage upload failure | PASS | `if (upErr) return { ok: false, error: upErr.message }`. |
| S07: DB insert failure + orphan cleanup | PASS | `console.error` logged for orphan; `storage.remove()` attempted; `rmErr` logged if cleanup fails. |
| S08: Retry button renders on failure | PASS | `failedFile` state set on failure; retry button renders; clears on success. |
| S09: Concurrent upload same period blocked | PASS | `uploadingPeriodsRef.current.has(period)` returns early with `ok:false` if in flight. |
| S10: Unique storage paths for same hw_id | PASS | `crypto.randomUUID()` generates distinct paths per call. |
| S11: Delete happy path (DB + storage both ok) | PASS | `setPeriods` filters out attachment by id in both success branches. |
| S12: Storage delete failure → UI consistent | PASS | `storErr` branch logs orphan, calls `setPeriods`, returns `{ ok: true }`. |
| S13: DB delete failure → chip stays | PASS | `dbErr` branch returns `{ ok: false }` before any `setPeriods` call. |
| S14: Guardian view renders attachment chips | PASS | `Today.tsx` renders with signed URLs; `.catch()` handles URL generation errors. |
| S15: Draft homework not shown to guardians (useHomework) | BLOCKED | Requires audit of `useHomework.ts` and homework SELECT RLS. |
| S16: Cross-section isolation via storage | BLOCKED | Requires full DB-level audit of `my_section_ids()` and storage policy join. |
| S17: upsertAll does not touch attachments array | PASS | Upsert payload contains only homework-row fields; attachments untouched. |
| S18: send-push not called during upload | PASS | `uploadAttachment` contains no reference to `supabase.functions.invoke`. |

## Proposed Migration

```sql
-- supabase/migrations/20261021110000_fix_storage_draft_exposure.sql

-- Fix CRITICAL: storage att_guardian policy lacked homework.status check
drop policy if exists att_guardian on storage.objects;
create policy att_guardian on storage.objects for select
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) ~ '^[0-9]+$'
    and split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (split_part(name, '/', 1))::int in (select my_section_ids())
    and exists (
      select 1 from public.homework h
      where h.id = (split_part(name, '/', 2))::uuid
        and h.status = 'published'
        and h.section_id = (split_part(name, '/', 1))::int
    )
  );

-- Fix MEDIUM: missing index for g_attach RLS and signed-URL lookups
create index if not exists idx_attachments_homework_id on attachments(homework_id);
```

**Do not apply to production without first confirming the existing policy name and that RLS is enabled on `attachments`.**

## Remaining Risks

- **Storage orphans (upload race):** If the browser/tab closes between storage upload completing and the DB insert being attempted, no cleanup runs and the orphan file persists. Requires periodic GC (e.g., a scheduled function that prunes storage files with no matching DB row).
- **Storage orphans (delete):** `storage.remove()` failure is now logged to console, but there is no retry or alerting mechanism. A logged orphan requires manual GC.
- **Draft exposure (CRITICAL, unmitigated until migration applied):** The `att_guardian` storage policy does not check `homework.status`. The proposed migration above closes this gap but has not been applied to production.
- **S15/S16 BLOCKED:** The `useHomework` hook and `my_section_ids()` helper have not been audited in this pass. Draft homework rows and cross-section access via the guardian view remain unverified at the application layer.

## Readiness Decision

**NO-GO** — pending:
1. Resolution of S15 and S16 (RLS/hook audit).
2. Application and verification of `20261021110000_fix_storage_draft_exposure.sql` on a staging Supabase project.

All 16 other scenarios PASS and all code-level fixes are confirmed present. Once the migration is applied and S15/S16 are verified, re-run this QA pass and flip to GO.
