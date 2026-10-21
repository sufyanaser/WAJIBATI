# Architecture Readiness Report — واجباتي PWA

**Generated:** 2026-10-21  
**Agent:** AGENT 01 — Release Architect  
**Branch audited:** `main` (HEAD `87dca25`)  
**Session:** https://claude.ai/code/session_01TydCg6tAJRThayQRePGphU

---

## Executive Summary

The WAJIBATI PWA has progressed substantially past the stub phase described in AGENTS.md §8.
Guardian UI is fully implemented (Today, Archive, Search, Push opt-in, A4 export).
Admin UI is implemented (HomeworkEntry with timetable grid + attachments, Notices, CSV Import, PIN reset).
One **CRITICAL** security gap (storage draft-exposure) is documented and unmitigated.
One **TODO** placeholder (publisherName) is present in Today.tsx.
The build is green. Five migrations are present.
The project is NOT production-ready until the storage policy migration is applied and S15/S16
RLS audit items are cleared.

---

## 1. Implemented Features (What Actually Works vs Stub)

### 1.1 Guardian UI — src/pages/Today.tsx
**Status: FULLY IMPLEMENTED** (no longer a stub)

| Feature | Status | Notes |
|---------|--------|-------|
| Auth gate (redirect to /login) | PASS | Checks session on mount |
| Multi-child selector tabs | PASS | guardian_students join |
| Date navigation (skip Fri/Sat) | PASS | DateNavigator component |
| Calendar popup with homework dots | PASS | Inline in Today.tsx |
| Homework list with subject chips + period circles | PASS | hw-card layout |
| Notices (latest 3) | PASS | Via useHomework hook |
| Full-text search (400ms debounce) | PASS | tsvector field |
| Signed URL for attachment chips | PASS | 1-hour TTL, .catch toast |
| Push opt-in banner | PASS | VAPID subscribe + DB upsert |
| A4 PNG export | PASS | exportA4PNG via html-to-image |
| Offline indicator | PASS | offline prop from useHomework |
| Skeleton loading state | PASS | hw-skeleton CSS |
| Empty state | PASS | Arabic copy |
| Logout (clears SW auth cache) | PASS | postMessage CLEAR_AUTH_CACHES |
| mark_read call | **MISSING** | Checkbox renders but no DB write |
| publisherName in A4 export | **TODO** | Hardcoded 'مسؤول المدرسة' (see §4) |

### 1.2 Guardian Archive — src/pages/Archive.tsx
**Status: IMPLEMENTED**

| Feature | Status |
|---------|--------|
| Section dropdown (guardian's own sections) | PASS |
| Paginated homework list (PAGE_SIZE=20) | PASS |
| Full-text search via HomeworkSearch component | PASS |
| Date range display | PASS |
| Attachment chips (no signed URLs, opens blind href) | PARTIAL — no signed URL generation |

### 1.3 Admin UI — src/pages/admin/
**Status: IMPLEMENTED**

| Page / Feature | Status | Notes |
|----------------|--------|-------|
| AdminLogin.tsx — email/password | PASS | Separate from guardian login |
| AdminShell.tsx — tab layout (Homework / Notices / Import) | PASS | |
| HomeworkEntry.tsx — timetable grid 6 periods | PASS | useAdminSection hook |
| HomeworkEntry — draft save | PASS | |
| HomeworkEntry — publish (triggers send-push) | PASS | |
| HomeworkEntry — attachment upload (image/PDF ≤5MB) | PASS | UUID path, race guard |
| HomeworkEntry — attachment delete | PASS | DB + storage |
| HomeworkEntry — retry UI on upload failure | PASS | failedFile state |
| NoticesPage.tsx | PASS | Priority levels |
| ImportPage.tsx — CSV guardian import | PASS | Edge function |
| ImportPage — PIN reset per guardian | PASS | reset-pin edge function |
| Admin.tsx (legacy?) | EXISTS | src/pages/Admin.tsx also present — unclear if orphaned |

### 1.4 Service Worker — src/sw.ts
**Status: IMPLEMENTED**

| Feature | Status | Notes |
|---------|--------|-------|
| Precache (injectManifest) | PASS | workbox-precaching |
| Auth cache isolation on activate | PASS | Deletes supabase-rest cache |
| CLEAR_AUTH_CACHES message handler | PASS | Called on logout |
| Push event → showNotification | PASS | RTL, Arabic, icon |
| notificationclick → openWindow | PASS | data.url |

### 1.5 Edge Functions — supabase/functions/
**Status: IMPLEMENTED**

| Function | Status |
|----------|--------|
| send-push | PASS (code) — prunes dead 404/410 subs |
| import-guardians | PASS (code) |
| reset-pin | PASS (code) |

### 1.6 A4 Export Engine — src/utils/exportA4.ts
**Status: IMPLEMENTED**

| Feature | Status | Notes |
|---------|--------|-------|
| PNG export (1588×2246) | PASS | html-to-image/toPng |
| PDF export (exportA4PDF) | PARTIAL | Falls back to PNG if jsPDF absent; jsPDF not in package.json |
| Subject ordering (SUBJECT_ORDER constant) | PASS | |
| Multi-period accumulation per subject | PASS | Fixed in commit c6324ba |
| XSS escaping (escapeHtml) | PASS | |

---

## 2. Open TODOs in Code

| Location | Line | Text | Severity |
|----------|------|------|----------|
| src/pages/Today.tsx | 247 | `// TODO: replace after published_by migration` — publisherName hardcoded as 'مسؤول المدرسة' | MEDIUM |
| src/pages/Today.tsx | 546 | `<span className="hw-read-check" aria-label="تمت القراءة">✓</span>` — renders checkmark but no `mark_read()` DB call | MEDIUM |
| src/pages/Archive.tsx | attachment chips | No signed URL generation — attachment links are storage paths, not signed URLs | MEDIUM |
| docs/ATTACHMENT-RELIABILITY-PR27.md | — | S15/S16 BLOCKED: `useHomework` hook and `my_section_ids()` not audited for draft row visibility | HIGH |
| supabase/migrations | — | `20261021110000_fix_storage_draft_exposure.sql` proposed in PR27 doc but NOT present in migrations directory | CRITICAL |

---

## 3. Dependency Versions and Security Concerns

### 3.1 Runtime Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| @supabase/supabase-js | ^2.45.0 | Current stable line; no known critical CVEs |
| react | ^18.3.1 | Current stable |
| react-dom | ^18.3.1 | Current stable |
| react-router-dom | ^6.26.0 | Current stable |
| html-to-image | ^1.11.11 | Used for A4 PNG export; no auth tokens in scope |

### 3.2 Dev Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| vite | ^5.4.0 | Current stable |
| vite-plugin-pwa | ^0.20.1 | Current stable |
| typescript | ^5.5.4 | Current stable |
| vitest | ^2.1.9 | Current stable |
| supabase CLI | ^2.121.0 | Current stable |

### 3.3 Security Observations

| Item | Severity | Detail |
|------|----------|--------|
| `att_guardian` storage policy missing `status='published'` join | **CRITICAL** | Guardian with known path `<section_id>/<hw_id>/<file>` can download draft attachments directly from storage API. Documented in docs/ATTACHMENT-RELIABILITY-PR27.md. Migration SQL provided but NOT applied. |
| Missing `idx_attachments_homework_id` index | MEDIUM | RLS policy on attachments table and signed-URL lookup both filter by homework_id; sequential scan on large tables. |
| No service-role key in client bundle | PASS | All `SUPABASE_SERVICE_ROLE_KEY` / `VAPID_PRIVATE_KEY` env vars lack `VITE_` prefix |
| Demo PINs 111111–555555 in seed migration | WARNING | AGENTS.md notes "change before production"; seed file is in git history |
| SW no longer caches Supabase REST responses | PASS | Fixed in commit a61ec22 |
| `exportA4PDF` falls back to PNG | LOW | jsPDF is not in package.json; PDF export silently returns PNG with .pdf extension in fallback |

---

## 4. Missing Features Per AGENTS.md §8 Status

| Item from AGENTS.md | Status | Notes |
|---------------------|--------|-------|
| Guardian UI: Today (by date, per child/section) | **DONE** | Fully implemented |
| Guardian UI: date picker + archive | **DONE** | Calendar popup in Today + Archive page |
| Guardian UI: search | **DONE** | Full-text tsvector search |
| Guardian UI: notices | **DONE** | Renders in Today view |
| Guardian UI: mark_read | **PARTIAL** | UI renders checkmark; no `mark_read()` RPC call |
| Guardian UI: push opt-in | **DONE** | Banner + VAPID subscribe |
| Admin UI: homework CRUD per section/day | **DONE** | HomeworkEntry with timetable grid |
| Admin UI: attachments upload | **DONE** | Per-period upload with race guards |
| Admin UI: notices | **DONE** | NoticesPage |
| Admin UI: publish → call send-push | **DONE** | useAdminSection.publish() |
| `published_by` tracking | **MISSING** | No DB column; Today.tsx has TODO comment referencing this |
| Storage orphan GC | **MISSING** | No scheduled cleanup function for orphan files |
| Production infra verification | **UNVERIFIED** | bootstrap.sh run status unknown; proxy blocks Supabase API from CI |

---

## 5. File Ownership Map for Other Agents

This map assigns primary responsibility per domain for the remaining 7 agents.

### AGENT 02 — RLS / Security
**Critical path files:**
- `supabase/migrations/20261021100000_security_fixes.sql` — current storage policies
- `docs/ATTACHMENT-RELIABILITY-PR27.md` — gap specification
- Proposed: `supabase/migrations/20261021110000_fix_storage_draft_exposure.sql` (must be created)
- `src/hooks/useHomework.ts` — S15 audit target
- `supabase/migrations/20261021000000_init.sql` — `my_section_ids()`, `is_admin()` helpers

### AGENT 03 — Guardian UX Completion
**Primary files:**
- `src/pages/Today.tsx` — mark_read TODO, publisherName TODO
- `src/pages/Archive.tsx` — signed URL generation for attachment chips
- `src/hooks/useHomework.ts` — S15 audit + offline behavior
- `src/components/HomeworkSearch.tsx`

### AGENT 04 — Admin UX
**Primary files:**
- `src/pages/admin/HomeworkEntry.tsx`
- `src/hooks/useAdminSection.ts`
- `src/pages/Admin.tsx` — investigate if this is a duplicate/orphan vs AdminShell route
- `src/pages/admin/AdminShell.tsx`
- `src/pages/admin/NoticesPage.tsx`

### AGENT 05 — Export / PDF
**Primary files:**
- `src/utils/exportA4.ts` — add jsPDF dependency or remove `exportA4PDF` dead code
- `src/components/ExportButton.tsx`
- `package.json` — add jsPDF if PDF export is needed

### AGENT 06 — Push / Notifications
**Primary files:**
- `supabase/functions/send-push/index.ts`
- `src/sw.ts`
- `src/pages/Today.tsx` (enablePush function)
- `src/hooks/usePushSubscription.ts`

### AGENT 07 — Data / Migrations
**Primary files:**
- `supabase/migrations/` — new migration for storage fix + index
- `src/lib/database.types.ts` — regenerate after new migration
- `supabase/migrations/20261021020000_seed_demo.sql` — production PIN cleanup

### AGENT 08 — CI / Infrastructure
**Primary files:**
- `.github/workflows/ci.yml`
- `.github/workflows/supabase.yml`
- `scripts/bootstrap.sh`
- `vercel.json`
- `vite.config.ts`

---

## 6. Critical Blockers vs Minor Issues

### CRITICAL BLOCKERS (must fix before production)

| # | Issue | File(s) | Action |
|---|-------|---------|--------|
| C1 | Storage `att_guardian` policy allows guardian read of draft attachments | `supabase/migrations/` | Create and apply `20261021110000_fix_storage_draft_exposure.sql` (SQL in docs/ATTACHMENT-RELIABILITY-PR27.md) |
| C2 | S15 BLOCKED: `useHomework` hook not audited for draft row exposure at app layer | `src/hooks/useHomework.ts` | Verify SELECT query filters `status = 'published'` |
| C3 | S16 BLOCKED: `my_section_ids()` cross-section isolation not verified end-to-end | `supabase/migrations/20261021000000_init.sql` | Audit helper function and join path |

### HIGH PRIORITY (fix before soft launch)

| # | Issue | File(s) | Action |
|---|-------|---------|--------|
| H1 | `mark_read` not called — read receipts non-functional | `src/pages/Today.tsx:546` | Call `supabase.rpc('mark_read', ...)` after homework renders |
| H2 | Missing `idx_attachments_homework_id` index | migrations | Add in same migration as C1 |
| H3 | Archive page attachment chips use raw storage path (no signed URL) | `src/pages/Archive.tsx` | Add `createSignedUrls` call matching Today.tsx pattern |

### MEDIUM PRIORITY

| # | Issue | File(s) |
|---|-------|---------|
| M1 | `publisherName` hardcoded — A4 export shows 'مسؤول المدرسة' | Today.tsx:247 |
| M2 | `exportA4PDF` dead code — jsPDF not in package.json; silently produces PNG | exportA4.ts |
| M3 | Demo PINs 111111–555555 in seed migration — must inform school admin to reset before real users enroll | seed migration |
| M4 | Storage upload orphans (browser close between storage write and DB insert) — no GC | useAdminSection.ts |
| M5 | `src/pages/Admin.tsx` may be an orphan page (AdminShell architecture replaces it) | Admin.tsx |

### LOW PRIORITY / NICE-TO-HAVE

| # | Issue |
|---|-------|
| L1 | jsPDF not bundled — true PDF export requires adding dependency or CDN load |
| L2 | Calendar weekday headers use abbreviated Arabic without RTL reorder — visual only |
| L3 | No rate-limiting on guardian search queries |
| L4 | No e2e / integration tests (only 7 unit tests) |

---

## 7. Release Checklist

### Build Quality

| Check | Status | Notes |
|-------|--------|-------|
| `npm run lint` (tsc --noEmit) | PASS | Clean as of last build |
| `npm run build` | PASS | Vite + PWA dist generated |
| `npm test` (vitest) | PASS | 7/7 tests (limited coverage) |
| No VITE_ prefixed secrets | PASS | Verified in package.json + src/ |

### Security

| Check | Status | Notes |
|-------|--------|-------|
| SW cache isolation (auth data not cached) | PASS | Fixed commit a61ec22 |
| Guardian cannot read other section data (DB RLS) | PASS (code review) | Unverified against live DB |
| Guardian cannot read draft homework (DB RLS) | BLOCKED | S15 not audited |
| Guardian cannot read draft attachments (Storage) | **FAIL** | att_guardian policy missing status check — C1 above |
| Cross-section attachment isolation (Storage) | BLOCKED | S16 not audited |
| Admin-only write operations | PASS (code review) | is_admin() checks in migrations |

### Infrastructure

| Check | Status | Notes |
|-------|--------|-------|
| 5 migration files present and ordered | PASS | _init, _seed_demo, _fix_guardian_auth, _seed_school_data, _security_fixes |
| Fix-storage migration present | **FAIL** | `20261021110000_fix_storage_draft_exposure.sql` NOT in migrations/ |
| 3 Edge functions code present | PASS | send-push, import-guardians, reset-pin |
| Vercel config (SPA rewrite, SW no-cache) | PASS | vercel.json present |
| GitHub Actions CI files | PASS | ci.yml, supabase.yml |
| Supabase project ACTIVE_HEALTHY | BLOCKED | Cannot verify from CI (proxy 403) |
| Migrations applied to production | BLOCKED | Cannot verify remotely |
| Edge functions deployed | BLOCKED | Cannot verify remotely |

### Functional (from AGENTS.md checklist)

| Check | Status |
|-------|--------|
| Guardian login (phone + PIN) | PASS |
| Guardian Today view renders homework | PASS |
| Guardian archive browse | PASS |
| Guardian full-text search | PASS |
| Guardian notices display | PASS |
| Guardian mark_read | **FAIL** (not wired) |
| Guardian push opt-in | PASS |
| Guardian A4 PNG export | PASS |
| Admin HomeworkEntry save/publish | PASS |
| Admin attachment upload | PASS |
| Admin CSV guardian import | PASS |
| Admin PIN reset | PASS |
| Admin notices CRUD | PASS |

---

## 8. Summary Verdict

| Domain | Verdict |
|--------|---------|
| Build / lint | PASS |
| Guardian UI core | PASS with minor gaps |
| Admin UI | PASS |
| PWA / Service Worker | PASS |
| Security (storage) | **FAIL — C1 blocker** |
| Security (RLS audit) | **BLOCKED — C2/C3** |
| Read receipts | FAIL (not wired) |
| Infrastructure verification | BLOCKED (proxy) |

**Overall: NOT READY FOR PRODUCTION**

Minimum steps to reach GO:
1. Create and apply `supabase/migrations/20261021110000_fix_storage_draft_exposure.sql` (SQL in docs/ATTACHMENT-RELIABILITY-PR27.md).
2. Audit `src/hooks/useHomework.ts` — confirm SELECT filters `status = 'published'` (S15).
3. Audit `my_section_ids()` + storage path join for cross-section isolation (S16).
4. Wire `mark_read` RPC in Today.tsx.
5. School admin: reset demo PINs before real guardian enrollment.
6. Owner confirms Supabase project health + migrations applied + functions deployed.
