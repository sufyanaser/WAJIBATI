# WAJIBATI — PHASE 03.5: WAVE G — DATA INTEGRITY & RECOVERY
## Invariant Resilience, Cascade Boundaries, Network Tolerance & Auditability

**Document ID:** `PHASE-03.5-07-DATA-INTEGRITY-RECOVERY`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Author:** Lead Integration Engineer + Independent QA & Security Auditor  
**Standard:** Fault Tolerance & Data Loss Prevention

---

### 1. Relational Invariants & Constraint Enforcement

| Constraint Type | Database Implementation | Operational Purpose | Resilience Verdict |
|---|---|---|---|
| **One Current Year** | `create unique index one_current_year on academic_years(is_current) where is_current;` | Prevents multiple academic years from being flagged active simultaneously. | **PASS** |
| **Section Uniqueness** | `unique (year_id, stage_id, letter)` on `sections` | Prevents creating two '5th Scientific A' sections in the same school year. | **PASS** |
| **Timetable Period Exclusivity** | `unique (section_id, weekday, period)` on `timetable` | Mathematically prevents double-booking multiple subjects in one period. | **PASS** |
| **Guardian Phone Uniqueness** | `phone text not null unique check (phone ~ '^\+9647[0-9]{9}$')` | Enforces single phone identity conforming to Iraqi E.164 standards. | **PASS** |
| **Homework Storage Isolation** | `storage_path text not null unique` on `attachments` | Prevents overwriting or path collision across homework attachments. | **PASS** |
| **Read Receipt Idempotency** | `primary key (guardian_id, section_id, day)` on `reads` | Guardian marking homework read repeatedly performs an idempotent no-op. | **PASS** |
| **Section Deletion Restrict** | `students(section_id) references sections(id)` (no cascade) | Prevents deleting populated sections and corrupting student enrollment history. | **PASS** |
| **Cascade Bounds** | `attachments.homework_id ON DELETE CASCADE`, `reads.section_id ON DELETE CASCADE` | Prevents orphan attachment records when homework is purged. | **PASS** |

---

### 2. Network Tolerance, Write Barriers & Recovery

1. **Version Guard Write Barrier (`assertCanWrite`):**
   - Every mutation in `useAdminSection` (saving homework, uploading attachment, deleting homework) is guarded by `assertCanWrite(operationName)`.
   - If network drops or version guard enters `INCOMPATIBLE`, `NETWORK_ERROR`, or `PERMISSION_DENIED`, mutations are halted before corrupting remote state.
2. **Session Expiration & Token Auto-Refresh:**
   - Supabase client configured with `autoRefreshToken: true` and persistent storage via `platform.storage` (`WebStorageAdapter` / `TauriDpapiStorage`).
   - Expired tokens refresh silently in the background without losing unsaved form state.
3. **Historical Homework Preservation:**
   - Past homework is never automatically deleted.
   - Transitions from `published` to `archived` remain reachable via `/archive` and date pickers.
   - Search indexing via generated `tsvector simple` column remains permanently queryable.
4. **Audit Trail Immutability:**
   - `school_import_audit` records are protected by `ON DELETE RESTRICT` on the batch foreign key.
   - Deleting an import batch is impossible while audit entries exist, preventing historical cover-ups.

---

### 3. Gate G Sign-off

- Constraints and cascade rules prevent orphan or corrupted records.
- Version Guard write barrier protects against stale state and network errors.
- Read receipts, import batches, and historical homework remain fully auditable.
- **GATE G STATUS:** `VERIFIED & PASSED`.
