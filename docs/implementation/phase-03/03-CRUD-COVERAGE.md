# WAJIBATI — PHASE 03: WAVE C — COMPLETE SCHOOL CRUD COVERAGE
## Verification & Audit of School Operational Entities

**Document ID:** `PHASE-03-03-CRUD-COVERAGE`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Baseline HEAD:** `e3e3b94`  
**Author:** Lead Software Architect & Multi-Agent Orchestrator  
**Status:** COMPLETE (Wave C Gate Passed)

---

### 1. Overview & Verification Summary

Wave C audited, verified, and closed all operational CRUD gaps across the school management views in `src/pages/admin/` and `src/components/admin/`. Every school entity now possesses end-to-end operational capabilities with strict state guards, error handling, and visual status indicators.

---

### 2. Entity Operations Matrix

| Entity | Create (C) | Read (R) | Update (U) | Delete / Deactivate (D) | UI Location | Audit Status |
|---|---|---|---|---|---|---|
| **Students (الطلاب)** | `startAdd()` -> inserts `students` + auto generates `external_key`. Optional inline guardian link. | Filter by section, search by student name, displays section label and linked guardians. | `startEdit()` -> updates `full_name`, `section_id`, `notes`, and upserts `guardian_students`. | `toggleActive()` -> safely activates/deactivates student record without deleting history. | `StudentsPage.tsx` | **VERIFIED & OPERATIONAL** |
| **Guardians (أولياء الأمور)** | `startAdd()` -> inserts `guardians` with validated Iraqi phone (`+9647XXXXXXXXX`), auto `external_key`, and optional student linking. | Search by guardian name, phone, or child name; displays children and section badges, and `last_seen_at`. | `startEdit()` -> updates `full_name`, `phone`, `alt_phone`, and upserts student link. | `toggleActive()` -> safely toggles `active` status. Blocked from logging in when disabled. | `GuardiansPage.tsx` | **VERIFIED & OPERATIONAL** |
| **Sections (الشعب الدراسية)** | `startAdd()` -> selects `year_id`, `stage_id`, enters `letter` (أ، ب، ج...). Auto `external_key`. | Grid cards showing Stage, Branch, Letter, Academic Year, active count, and student count. | `startEdit()` -> updates year, stage, and letter. | `toggleActive()` -> toggles section status (`فعّالة` / `معطّلة`) without dropping child records. | `SectionsPage.tsx` | **VERIFIED & OPERATIONAL** |
| **Teachers (المعلمون)** | `startAdd()` -> enters `full_name`, selects primary `subject_id`, enters `phone`. Auto `external_key`. | Table listing teacher name, primary subject, all assigned sections, and active state. | `startEdit()` -> updates full name, primary subject, and phone. | `toggleActive()` -> activates or suspends teacher profile. Suspended teachers cannot be assigned. | `TeachersPage.tsx` | **VERIFIED & OPERATIONAL** |
| **Subjects (المواد الدراسية)** | `startAdd()` -> enters name, color picker with hex code, and integer sort order. Auto `external_key`. | Unified `PageHeader` toolbar, table with color indicator dot, subject name, and sort index. | `startEdit()` -> updates name, color, and sort order. | Handled via DB/MasterData (system reference data is preserved to maintain timetable history). | `SubjectsPage.tsx` | **VERIFIED & OPERATIONAL** |
| **Timetable (الجدول الدراسي)** | Clicking cell in Sunday–Thursday grid (periods 1–6) opens cell drawer/modal; auto-selects teacher. | Interactive weekly grid per section with subject colors and teacher names. | Clicking slot updates subject and teacher. Auto-resolution from `teaching_assignments`. | Clearing subject removes the slot cleanly via `supabase.from('timetable').delete()`. | `TimetablePage.tsx` | **VERIFIED & OPERATIONAL** |
| **Homework (الواجبات اليومية)** | `save()` or `publish()` -> saves draft or publishes to guardians. Auto-fills from timetable. | Daily view for section; lists 6 periods with subject, teacher, status badges, and attachments. | In-place text editing with local change detection and autosave/save buttons. | `deleteHomework(period)` deletes homework record and cleans up associated attachments. | `HomeworkEntry.tsx` (`useAdminSection`) | **VERIFIED & OPERATIONAL** |
| **Attachments (المرفقات)** | `uploadAttachment(period, file)` uploads to private `attachments` bucket; paths: `<section_id>/<hw_id>/<file>`. | Signed URL generation with RLS verification (`att_guardian` with draft protection regex). | Re-upload replaces attachment reference cleanly. | `deleteAttachment(period, attachmentId, storagePath)` deletes from storage and database. | `PeriodRow.tsx` (`useAdminSection`) | **VERIFIED & OPERATIONAL** |
| **Notices (الإعلانات والتنبيهات)** | `saveNotice()` -> title, body, priority (normal, important, urgent), target section, expiration. | Lists up to 30 recent notices with priority badges, section scope, and expiration dates. | `startEditNotice()` loads fields into form for modification. | `openDeleteModal()` + `ConfirmDialog` safely deletes notice with user confirmation. | `NoticesPage.tsx` | **VERIFIED & OPERATIONAL** |
| **School Accounts (حسابات المشرفين)** | `MasterDataPage.tsx?entity=accounts` inserts `school_account_profiles` with role `owner`, `editor`, or `viewer`. | Displays account name, email, role, and active status. | Updates account profile, role, and active status. | Toggles active flag. Inactive accounts cannot access admin routes (`AdminShell`). | `SettingsPage.tsx` & `MasterDataPage.tsx` | **VERIFIED & OPERATIONAL** |

---

### 3. Verification Evidence

1. **Guardians Page Enhancements:**
   - Unified with standard `PageHeader` and `StatusBadge`.
   - Added `startAdd()` action: validates phone format (`^\+9647[0-9]{9}$`) and allows linking to a student immediately.
   - Added `toggleActive()` action: allows instant deactivation or reactivation with status toast.
2. **Students Page Enhancements:**
   - Added `toggleActive()` action: allows activating/deactivating student with immediate UI feedback.
   - Added guardian linking dropdown and relation picker directly in the student Add/Edit modal.
3. **Sections Page Enhancements:**
   - Added `toggleActive()` on section cards to enable/disable sections safely.
4. **Subjects Page Enhancements:**
   - Unified header layout using `PageHeader` consistent with the design system.
