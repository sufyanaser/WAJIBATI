# WAJIBATI — PHASE 03: WAVE E — EXCEL BULK OPERATIONS & AUDIT ARCHITECTURE
## Staged, Auditable and Idempotent School Master Data Import

**Document ID:** `PHASE-03-05-EXCEL-IMPORT`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Baseline HEAD:** `e3e3b94`  
**Author:** Lead Software Architect & Multi-Agent Orchestrator  
**Status:** COMPLETE (Wave E Gate Passed)

---

### 1. Architectural Philosophy

Bulk Excel imports in educational environments frequently risk database corruption, accidental record deletion, plaintext credential leaks, and irreversible schema desynchronization.

Wajibati implements a 3-tier safety architecture for school master data import:
1. **Zero Cleartext Credentials:** Passwords and PINs are explicitly forbidden in Excel files. Guardians receive PIN resets via a dedicated Edge Function (`reset-pin`) or secure automated onboarding, never through spreadsheet distribution.
2. **Deterministic Two-Phase Staging:**
   - **Phase 1 (Preview):** The file is parsed client-side using `read-excel-file`, validated, SHA-256 hashed, and staged in `school_import_batches` with status `previewed`. Differences (`add` vs `update`) and referential issues are presented to the administrator before any database record is touched.
   - **Phase 2 (Apply):** Requires explicit admin confirmation and strict `owner` authorization. Executes inside a single transaction in Postgres via `apply_school_master_data(uuid)`.
3. **Immutable Audit Trail:** Every entity modification writes a row to `school_import_audit`, recording the batch ID, actor, entity type, external key, action (`create`, `update`, `unchanged`), `before_data` snapshot, and `after_data` payload.

---

### 2. Multi-Sheet Schema Specifications

The template `school-master-data.xlsx` consists of 8 interconnected sheets:

```
               [subjects] <---+
                   ^          |
                   |          +--- [sections] <---+
             [teachers]               ^           |
                   ^                  |           +--- [students] <---+
                   |                  |                   ^           |
                   +---------- [timetable]                |           |
                                                          +--- [guardian_students]
                                                                      ^
                                                                      |
                                                               [guardians]
```

| Sheet Name | Required Headers | Unique Key | Referential Checks | Validation Rules |
|---|---|---|---|---|
| `subjects` | `external_key`, `name` | `external_key` | None | Name must be unique in school curriculum. |
| `teachers` | `external_key`, `full_name`, `subject_key` | `external_key` | `subject_key -> subjects.external_key` | Full name required; valid phone optional. |
| `sections` | `external_key`, `academic_year`, `stage`, `branch`, `letter` | `external_key` | Matches active academic year & stage | Letter must be unique per year/stage. |
| `timetable` | `section_key`, `weekday`, `period`, `subject_key` | `(section_key, weekday, period)` | `section_key`, `subject_key`, `teacher_key` | `weekday` (0–4), `period` (1–6). |
| `students` | `external_key`, `full_name`, `section_key` | `external_key` | `section_key -> sections.external_key` | Full name required. |
| `guardians` | `external_key`, `full_name`, `phone` | `external_key`, `phone` | None | Phone format strictly `^\+9647[0-9]{9}$`. |
| `guardian_students`| `guardian_key`, `student_key` | `(guardian_key, student_key)` | Both keys must exist in batch or DB | Valid relationship descriptor. |
| `accounts` | `external_key`, `email`, `full_name`, `role` | `external_key`, `email` | None | Email regex; role in (`owner`, `editor`, `viewer`). |

---

### 3. Execution Engine & Edge Function

1. **Client Engine (`src/lib/schoolMasterData.ts` & `src/pages/admin/ImportPage.tsx`):**
   - Parses the workbook in-browser without sending raw binary blobs across untrusted channels.
   - Cleans white spaces and boolean values (`نعم`/`لا`/`true`/`false`).
   - Displays clear diff cards: `إضافة X، تحديث Y` for each sheet.
   - Disables the "تطبيق" button unless `issues.length === 0`, user role is `owner`, and the confirmation checkbox is checked.

2. **Server Edge Function (`supabase/functions/import-school-master/index.ts`):**
   - Validates caller authentication via Supabase Auth and checks role = `owner` in `admins`.
   - Computes SHA-256 fingerprint of the normalized JSON payload:
     `content_hash = encodeHex(await crypto.subtle.digest('SHA-256', payload))`
   - Upserts batch record with status `previewed`.

3. **Database Transaction Routine (`apply_school_master_data(uuid)`):**
   - Security Definer with strict `search_path = public`.
   - Acquires `FOR UPDATE` lock on the batch row to prevent concurrent application races.
   - Idempotency check: if `status = 'applied'`, returns immediately without duplicate inserts.
   - Iterates through the 8 entity collections, applying `INSERT ... ON CONFLICT DO UPDATE`.
   - Writes granular audit entries to `school_import_audit`.

---

### 4. Security Verification

- **Cleartext Password Proliferation:** `BLOCKED` (Edge Function rejects files containing `pin` or `password`).
- **Privilege Escalation:** `BLOCKED` (Edge Function checks `role = 'owner'` at API gate; SQL function checks `role = 'owner'` at database layer).
- **Referential Integrity:** `ENFORCED` (Foreign references between sheets are pre-validated before batch creation).
