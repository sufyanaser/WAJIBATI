# WAJIBATI — PHASE 03: WAVE A — CURRENT STATE MATRIX
## Comprehensive Database, Authorization & Functional Discovery

**Document ID:** `PHASE-03-01-CURRENT-STATE`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Baseline HEAD:** `e3e3b94`  
**Author:** Lead Software Architect & Multi-Agent Orchestrator  
**Status:** COMPLETE (Wave A Gate Passed)

---

### 1. Executive Summary

Phase 03 establishes a fully operational, integrated school management system across Supabase and the React frontend.  
This document proves the exact current state of every database entity, RLS policy, backend function, React page, hook, and service in Wajibati. It maps full CRUD coverage and identifies operational gaps prior to code implementation.

---

### 2. Comprehensive Entity Matrix

| Database Table | Primary Key | Foreign Keys | Unique Constraints | RLS Policies | React Page | Service / Hook | CRUD Coverage | Missing Operations / Gaps |
|---|---|---|---|---|---|---|---|---|
| `academic_years` | `id` (smallserial) | None | `label`, `one_current_year` (`is_current` WHERE is_current = true) | `staff_read`, `admin_write`, `g_years` | Dropdowns in `SectionsPage.tsx`, `MasterDataPage.tsx` | Direct Supabase query | **R** (Read only) | No dedicated UI for adding/editing academic years (seeded via migrations). |
| `stages` | `id` (smallserial) | None | `(name, branch)` | `staff_read`, `admin_write`, `g_stages` | Dropdowns in `SectionsPage.tsx`, `MasterDataPage.tsx` | Direct Supabase query | **R** (Read only) | Fixed Iraqi curriculum stages (seeded via migrations). |
| `sections` | `id` (serial) | `year_id -> academic_years.id`, `stage_id -> stages.id` | `(year_id, stage_id, letter)`, `sections_external_key_uq` | `staff_read`, `admin_write`, `g_sections` (scoped to `my_section_ids()`) | `SectionsPage.tsx`, `MasterDataPage.tsx` | Direct Supabase query | **C, R, U, D\*** (*D is active toggle in MasterData) | `SectionsPage.tsx` lacks a direct toggle active/deactivate button on section cards. |
| `subjects` | `id` (smallserial) | None | `name`, `subjects_external_key_uq` | `staff_read`, `admin_write`, `g_subjects` | `SubjectsPage.tsx`, `MasterDataPage.tsx` | Direct Supabase query | **C, R, U** | Deactivation/deletion not exposed in UI (subjects are reference data). |
| `teachers` | `id` (serial) | `subject_id -> subjects.id` | `teachers_external_key_uq` | `staff_read`, `admin_write`, `g_teachers` (active only) | `TeachersPage.tsx`, `MasterDataPage.tsx` | Direct Supabase query | **C, R, U, D\*** (*D is active toggle) | Fully covered. Supports single specialization and active toggle. |
| `teaching_assignments` | `id` (serial) | `teacher_id -> teachers.id`, `subject_id -> subjects.id`, `section_id -> sections.id` | `(teacher_id, subject_id, section_id)` | `ta_staff_read`, `ta_admin_write` | `MasterDataPage.tsx` (entity: `teaching_assignments`), joined in `TeachersPage.tsx` | `useAdminSection.ts` (RPC lookup), direct Supabase | **C, R, U, D\*** (*D is active toggle) | No dedicated visual assignment matrix in `TeachersPage.tsx` (assignments managed in MasterData). |
| `timetable` | `id` (serial) | `section_id -> sections.id`, `subject_id -> subjects.id`, `teacher_id -> teachers.id` | `(section_id, weekday, period)` | `staff_read`, `admin_write`, `g_timetable` (scoped) | `TimetablePage.tsx`, `MasterDataPage.tsx` | Direct Supabase query | **C, R, U, D** (Full CRUD) | Fully functional interactive grid (Sun–Thu, periods 1–6). Clearing slot deletes record. |
| `students` | `id` (serial) | `section_id -> sections.id` | `students_external_key_uq` | `staff_read`, `admin_write`, `g_students` (scoped to guardian's children) | `StudentsPage.tsx`, `MasterDataPage.tsx` | Direct Supabase query | **C, R, U, D\*** (*D is active toggle in MasterData) | `StudentsPage.tsx` lacks active toggle button; guardian links shown read-only. |
| `guardians` | `id` (uuid) | `user_id -> auth.users.id` | `phone` (`^\+9647[0-9]{9}$`), `guardians_external_key_uq`, `user_id` | `staff_read`, `admin_write`, `g_self` (`user_id = auth.uid()`) | `GuardiansPage.tsx`, `MasterDataPage.tsx` | Direct Supabase query, Edge fn `reset-pin` | **C\*, R, U, D\*** (*C and D via MasterData/Import) | `GuardiansPage.tsx` only has Edit form; lacks "Add Guardian" and toggle active button. |
| `guardian_students` | `(guardian_id, student_id)` | `guardian_id -> guardians.id`, `student_id -> students.id` | PK `(guardian_id, student_id)` | `staff_read`, `admin_write`, `g_links` (`guardian_id = my_guardian_id()`) | `MasterDataPage.tsx` (entity: `guardian_students`), displayed in `StudentsPage.tsx` & `GuardiansPage.tsx` | Direct Supabase query | **C, R, U, D** (in MasterData) | No inline link/unlink modal directly in `StudentsPage.tsx` or `GuardiansPage.tsx`. |
| `admins` | `user_id` (uuid) | `user_id -> auth.users.id` | PK `user_id` | `admins_self` (`user_id = auth.uid() or is_staff()`) | `SettingsPage.tsx` | Direct Supabase query | **R** (Read session) | Admin users created via Auth & SQL / `school_account_profiles`. |
| `school_account_profiles` | `external_key` (text) | `auth_user_id -> auth.users.id` | `email` | `school_accounts_staff_read`, `school_accounts_owner_write` | `SettingsPage.tsx` (links to `MasterDataPage.tsx?entity=accounts`) | Direct Supabase query | **C, R, U, D\*** (*D is active toggle) | Operational for `owner` role. Auth account provisioning requires Edge Function or manual Auth invite. |
| `homework` | `id` (uuid) | `section_id -> sections.id`, `subject_id -> subjects.id`, `teacher_id -> teachers.id`, `created_by -> auth.users.id` | None | `staff_read`, `admin_write`, `g_homework` (status = 'published' AND `my_section_ids()`) | `HomeworkEntry.tsx`, `Today.tsx`, `Archive.tsx` | `useAdminSection.ts`, `useHomework.ts` | **C, R, U, D** (Full CRUD) | Status lifecycle (`draft` -> `published` -> `archived`). Full A4 export and push fan-out. |
| `attachments` | `id` (uuid) | `homework_id -> homework.id` | `storage_path` | `staff_read`, `admin_write`, `g_attach`, storage RLS (`att_admin`, `att_guardian`) | `HomeworkEntry.tsx` (`PeriodRow.tsx`), `Today.tsx` | `useAdminSection.ts` (`uploadAttachment`, `deleteAttachment`) | **C, R, D** | Storage bucket `attachments` (private). Draft exposure patched via migration `20261021110000`. |
| `notices` | `id` (uuid) | `section_id -> sections.id`, `created_by -> auth.users.id` | None | `staff_read`, `admin_write`, `g_notices` (active window & section scope) | `NoticesPage.tsx` | Direct Supabase query | **C, R, U, D** (Full CRUD) | Safe deletion with `ConfirmDialog` verified. Priority and expiration supported. |
| `reads` | `(guardian_id, section_id, day)` | `guardian_id -> guardians.id`, `section_id -> sections.id` | PK `(guardian_id, section_id, day)` | `staff_read`, `admin_write`, `g_reads` | `DashboardHome.tsx` (via `v_section_day_reach`), `Today.tsx` | RPC `mark_read(p_section, p_day)` | **C, R** | Idempotent marking of read status by guardian. |
| `push_subscriptions` | `id` (uuid) | `guardian_id -> guardians.id` | `endpoint` | `staff_read`, `admin_write`, `g_push_all` | `Today.tsx` | `usePushSubscription.ts`, `send-push` | **C, R, D** | Edge Function `send-push` prunes invalid 404/410 subscriptions. |
| `settings` | `key` (text) | None | PK `key` | `staff_read`, `admin_write`, `g_settings` | `SettingsPage.tsx` | Direct Supabase query | **R, U** | School branding, periods configuration, timezone (`Asia/Baghdad`). |
| `school_import_batches` | `id` (uuid) | `created_by -> auth.users.id` | `(created_by, content_hash)` | `school_batches_owner_read`, `school_batches_owner_insert` | `ImportPage.tsx` | `import-school-master` Edge fn | **C, R, U** | Status: `previewed` -> `applied` / `rejected`. |
| `school_import_audit` | `id` (bigint) | `batch_id -> school_import_batches.id`, `actor_id -> auth.users.id` | PK `id` | `school_audit_staff_read` | `ImportPage.tsx` / DB | Audit log trigger/insert | **C, R** | Immutable audit trail for every entity import action. |

---

### 3. Database Functions & Views

| Routine Name | Type | Security | Purpose | Status |
|---|---|---|---|---|
| `is_admin()` | SQL Function | `SECURITY DEFINER` | Checks if `auth.uid()` has `role in ('owner','editor')` in `admins`. | Active & Enforced |
| `is_staff()` | SQL Function | `SECURITY DEFINER` | Checks if `auth.uid()` exists in `admins`. | Active & Enforced |
| `my_guardian_id()` | SQL Function | `SECURITY DEFINER` | Returns active `guardians.id` for current `auth.uid()`. | Active & Enforced |
| `my_section_ids()` | SQL Function | `SECURITY DEFINER` | Returns set of `section_id`s for active children of current guardian. | Active & Enforced |
| `mark_read(p_section, p_day)` | PL/pgSQL Function | `SECURITY DEFINER` | Idempotently inserts into `reads` and touches `guardians.last_seen_at`. | Active & Enforced |
| `get_section_subscriptions(p_section_id)` | SQL Function | `SECURITY DEFINER` | Returns push subscription endpoints and keys for section guardians. | Active (service_role only) |
| `get_section_subject_teachers(p_section_id, p_subject_id)` | SQL Function | `SECURITY DEFINER` | Returns teacher IDs and names from `teaching_assignments`. | Active & Enforced |
| `apply_school_master_data(p_batch_id)` | PL/pgSQL Function | `SECURITY DEFINER` | Idempotently upserts Excel master data batch with full audit logging. | Active (owner only) |
| `v_section_day_reach` | SQL View | `SECURITY INVOKER` | Aggregates daily read counts vs total section guardians. | Used by `DashboardHome.tsx` |
| `v_unread_today` | SQL View | `SECURITY INVOKER` | Lists unread guardians for today's homework per section. | Used by Admin Reports |

---

### 4. Identified Operational Gaps & Remediation Plan

1. **Guardians Management (`GuardiansPage.tsx`):**
   - *Current limitation:* Only allows search and editing existing guardians. Lacks an "Add Guardian" form and active status toggle button.
   - *Target fix:* Add modal/drawer or inline form to create a new guardian with international phone validation (`+9647XXXXXXXXX`), and add an active/deactivate toggle button.

2. **Students Management (`StudentsPage.tsx`):**
   - *Current limitation:* Lacks active/deactivate toggle button; cannot link a student to a guardian from `StudentsPage.tsx` (only in `MasterDataPage.tsx`).
   - *Target fix:* Add active/deactivate toggle button; add guardian selection when creating/editing a student.

3. **Sections Management (`SectionsPage.tsx`):**
   - *Current limitation:* Lacks toggle active/deactivate button.
   - *Target fix:* Add toggle button to activate/deactivate sections safely without cascade deletion.

4. **Teaching Assignments UI Integration (`TeachersPage.tsx`):**
   - *Current limitation:* Teaching assignments are displayed as text badges in `TeachersPage.tsx`, but assignment changes require navigating to `MasterDataPage.tsx?entity=teaching_assignments`.
   - *Target fix:* Add quick link or modal in `TeachersPage.tsx` to assign teacher to section & subject directly.

5. **Cross-Module Consistency & Real Verification:**
   - Implement end-to-end operational integration tests demonstrating the full lifecycle:
     - New student -> Link guardian -> Assign teacher & timetable -> Publish homework -> Verify guardian visibility without leaks.
