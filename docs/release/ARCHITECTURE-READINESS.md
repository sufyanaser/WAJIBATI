# Architecture Readiness Report — واجباتي PWA

**File written to:** `/home/user/homeworks/.claude/worktrees/wf_f572fce4-766-1/docs/release/ARCHITECTURE-READINESS.md`

---

## Key Findings

### Overall Verdict: NOT READY FOR PRODUCTION

The PWA has progressed well past the stub phase. Guardian UI (Today, Archive, Search, Push, A4 export) and Admin UI (HomeworkEntry with timetable grid + attachments, Notices, CSV Import, PIN reset) are all fully implemented. However, there are three blockers:

---

### CRITICAL BLOCKERS

**C1 — Storage draft-exposure (CRITICAL, unmitigated)**
The `att_guardian` policy on `storage.objects` (in `security_fixes.sql`) checks only that `split_part(name,'/',1)::int IN (select my_section_ids())`. It does **not** join `public.homework` to verify `status = 'published'`. A guardian who learns any storage path `<section_id>/<homework_id>/<file>` can download draft attachments directly. The fix SQL is documented in `docs/ATTACHMENT-RELIABILITY-PR27.md` but the migration file `20261021110000_fix_storage_draft_exposure.sql` does not exist in `supabase/migrations/`.

**C2 — S15 BLOCKED**: `src/hooks/useHomework.ts` not audited to confirm the SELECT query filters `status = 'published'`.

**C3 — S16 BLOCKED**: `my_section_ids()` cross-section storage isolation not verified end-to-end.

---

### HIGH PRIORITY

**H1** — `mark_read` is not wired. `Today.tsx:546` renders a checkmark UI element but never calls `supabase.rpc('mark_read', ...)`.

**H2** — Missing `idx_attachments_homework_id` index (performance for RLS + signed URL lookups).

**H3** — Archive page generates no signed URLs for attachment chips (raw storage paths used).

---

### MEDIUM PRIORITY

**M1** — `publisherName` hardcoded as `'مسؤول المدرسة'` in Today.tsx:247 pending a `published_by` DB migration.

**M2** — `exportA4PDF` is dead code — jsPDF is absent from package.json; silently returns PNG.

**M3** — Demo PINs 111111–555555 in seed migration must be reset by school admin before real enrollment.

---

### Build / Existing Passes

- `npm run build`, `tsc --noEmit`, `vitest` (7/7) all green
- Service worker auth cache isolation fixed (commit `a61ec22`)
- No service-role key or VAPID private key exposed to client bundle
- Five migrations present and ordered; three Edge Functions (send-push, import-guardians, reset-pin) present in code
