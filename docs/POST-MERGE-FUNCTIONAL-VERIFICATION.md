# Post-Merge Functional Verification

**Date:** 2026-10-21  
**Commit:** `2eaf8877` (merge of PR #18)  
**Branch:** `main`  
**Verifier:** Claude Code — automated code audit + test run  

---

## Checks

### 1. Vercel Production Deployment — BLOCKED

Vercel MCP returns 403 for scope `nasai` in this session. Cannot confirm
`2eaf8877` is live on production via API.  
**Evidence from PR:** Vercel bot comment on PR #18 showed `nextCommitStatus: DEPLOYED`
for commit `7880b91` (the head commit, now part of `2eaf8877`). Preview URL
`homeworks-git-feat-subjects-attachments-nasai.vercel.app` was `Ready` before merge.  
**Action required:** User should verify `https://vercel.com/nasai/homeworks` shows
production deployment from commit `2eaf8877`.

---

### 2. Code Audit — Attachment Upload/Publish Flow — PASS

| Path | Verified |
|---|---|
| `saveSlot`: creates `hw_id` (insert) BEFORE flushing `pendingFiles` | ✅ line 243–277 |
| `uploadFile`: Storage upload → DB insert → rollback on DB failure | ✅ lines 148–169 |
| `deleteAttachment`: Storage error → returns, DB error → returns, UI only on full success | ✅ lines 193–207 |
| No `tmp-` fallback hw_id anywhere in upload path | ✅ confirmed |

---

### 3. Publish Cannot Fire Before Attachments Complete — FAIL → FIXED

**DEFECT B found:** In the merged code (`2eaf8877`), `send-push` invocation appeared
at lines 251–260, **before** the pending-file flush loop at lines 273–277.
Guardians received push notifications before attachment storage objects existed.

**Fix applied in `fix/post-merge-20261021`:** `send-push` moved to after the
`pendingToUpload` flush loop. Order is now:

1. `insert/update homework` → `newId`
2. `flush pendingFiles` (await each `uploadFile`)
3. `invoke send-push`

---

### 4. Subject Selection Without Timetable — PASS

`src/pages/Admin.tsx` imports and calls `fetchSubjects()` (line 82), which queries
the `subjects` table directly with no timetable dependency. Subject dropdown
populates even when timetable is empty. Timetable only provides a pre-selected hint
via `slot?.subject?.id`.

---

### 5. Subjects Filtered By Academic Stage — PASS (with documented limitation)

`subjects` table confirmed to have **no `stage_id` column** (migration line 34–41).
Columns: `id`, `name`, `color`, `icon`, `sort`. Stage link exists only via
`timetable → section_id → sections(stage_id)`.

`fetchSubjectsForSection(sectionId)` in `src/lib/subjects.ts` correctly queries via
timetable join. Admin.tsx uses `fetchSubjects()` (all subjects) for the dropdown —
no invented stage mapping. Documented in code comments.

---

### 6. RLS Audit — PARTIAL PASS / SECURITY GAP NOTED

| Policy | Status |
|---|---|
| `g_homework`: `status='published' AND section_id IN my_section_ids()` | ✅ |
| `g_attach` (DB): requires published homework AND section in `my_section_ids()` | ✅ |
| `att_admin` (Storage): admin full access | ✅ |
| `att_guardian` (Storage): `split_part(name,'/',1)::int IN my_section_ids()` | ⚠️ |

**Storage RLS gap:** `att_guardian` checks only that the path's section_id prefix is
in the guardian's sections. It does **not** verify that the associated homework's
`status = 'published'`. A guardian in section X who learns a storage path for a
**draft** homework can download the file directly from storage, bypassing the DB
`g_attach` policy.

**Severity:** Low (path must be known; guardians cannot list bucket contents).
**Recommended fix:** New migration adding `homework_id` check to `att_guardian` policy,
or a pre-signed URL approach that validates status server-side before issuing a token.
Filed as a separate concern for a future migration.

---

### 7. Guardian Attachment Access Analysis — PASS (with gap from §6)

**Authorized guardian (section member, homework published):**
- DB policy `g_attach`: ✅ passes `section_id IN my_section_ids()` + `status='published'`
- Storage policy `att_guardian`: ✅ passes `split_part(name,'/',1)::int IN my_section_ids()`
- Can download attachments.

**Unauthorized guardian (different section):**
- DB policy `g_attach`: ✅ blocked — `section_id NOT IN my_section_ids()`
- Storage policy `att_guardian`: ✅ blocked — section_id prefix not in their sections
- Cannot access attachments.

**Draft attachment access (same section):**
- DB policy `g_attach`: ✅ blocked — `status != 'published'`
- Storage policy `att_guardian`: ⚠️ not blocked — only checks section_id prefix
- **Could download if path is known.** (See §6.)

---

### 8. Regression Test Gaps — PASS (gaps documented and covered)

Tests added in `fix/post-merge-20261021` to `src/test/homework.test.ts`:

| Gap | Test added |
|---|---|
| `publishAll` skips slot with `uploading=true` or `pendingFiles.length > 0` | `[FIXED A]` |
| `send-push` fires after pending flush (ordering contract) | `[FIXED B]` |

Previously uncovered by integration (pure unit coverage only):
- Max-5 enforcement: covered by existing unit test `'enforces max 5 (committed + pending)'`
- Pending-files-flushed-after-save: covered by existing integration test `'queues file as pending when card has no hw_id'`
- Unauthorized guardian / RLS: schema-level only; no live DB in test environment — documented in §6

---

### 9. Lint / Tests / Build — PASS

| Step | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | ✅ 0 errors |
| `npx vitest run` | ✅ 36 passed, 0 failed |
| `npm run build` | ✅ built in 2.08s |

---

### 10. Report — DELIVERED

This file: `docs/POST-MERGE-FUNCTIONAL-VERIFICATION.md`

---

## Defects Found

### DEFECT A — publishAll publishes while uploading (FIXED)

**Severity:** Medium  
**Location:** `src/pages/Admin.tsx` `publishAll()` line 281–283 (pre-fix)  
**Description:** Guard was `!slots[i].saving` only. A slot with `uploading=true` or
`pendingFiles.length > 0` was not blocked. `publishAll` could set status='published'
while a file upload was in flight, creating a state where the homework record is
published but attachments may not yet exist in storage.  
**Fix:** Guard expanded to `!sl.saving && !sl.uploading && sl.pendingFiles.length === 0`

---

### DEFECT B — Push notification precedes attachment flush (FIXED)

**Severity:** Medium  
**Location:** `src/pages/Admin.tsx` `saveSlot()` lines 251–260 vs 273–277 (pre-fix)  
**Description:** `send-push` was invoked before the `pendingToUpload` loop.
Guardians received notification before pending attachments were uploaded to storage.
On slow connections or upload failures, guardians would open the homework to find
attachments missing.  
**Fix:** `send-push` moved to after the `pendingToUpload` flush block.

---

### SECURITY NOTE — Storage RLS does not check homework status (NOT FIXED HERE)

**Severity:** Low  
**Location:** `supabase/migrations/20261021000000_init.sql` policy `att_guardian`  
**Description:** Storage SELECT policy checks section_id prefix only, not homework
publish status. Requires a new migration to fix — out of scope for this branch.  
**Recommendation:** New migration to either (a) add a storage policy that validates
via `homework` table, or (b) issue pre-signed URLs only for published homework via
an Edge Function.

---

## Fix Branch

Branch: `fix/post-merge-20261021`  
Files changed:
- `src/pages/Admin.tsx` — flush ordering + publishAll guard
- `src/test/homework.test.ts` — regression tests for DEFECT A and B  
- `docs/POST-MERGE-FUNCTIONAL-VERIFICATION.md` — this report

**Do not merge without review.**

---

## Readiness Verdict

**جاهز لتجربة المستخدم لمدة أسبوع — مشروط**

The merged code is functionally sound for the core guardian read-path (homework list,
attachments for published homework, notices). Two medium-severity defects in the admin
publish flow have been identified and fixed in branch `fix/post-merge-20261021`.

**Merge that branch before user-facing testing begins.** The storage RLS gap (draft
attachment accessible by storage path) is low-risk for an initial pilot (paths are
not guessable without admin access) but should be addressed in a follow-up migration
before public rollout.

| Condition | Met |
|---|---|
| Guardian read path secure | ✅ |
| Attachment upload atomic | ✅ |
| Delete failure safe | ✅ |
| Publish guards correct | ✅ after fix branch |
| Push notification ordering correct | ✅ after fix branch |
| Subject dropdown timetable-independent | ✅ |
| Build green | ✅ |
| Tests green (36/36) | ✅ |
| Storage RLS complete | ⚠️ low-risk gap documented |
| Vercel production confirmed | ⚠️ blocked (Vercel scope) |
