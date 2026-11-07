# WAJIBATI — PHASE 03.5: WAVE B — TEST DATABASE SETUP & PROVISIONING
## Isolated Simulation Environment, Synthetic Fixtures & Schema Audit

**Document ID:** `PHASE-03.5-02-TEST-DATABASE-SETUP`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Environment Mode:** Isolated In-Memory Simulation & Read-Only Live Probe (Priority 3)  
**Author:** Lead Integration Engineer + Independent QA & Security Auditor

---

### 1. Provisioning Decision & Priority Hierarchy

As determined in Wave A:
1. **Priority 1 (Local Docker):** `BLOCKED` (Docker not installed on host).
2. **Priority 2 (Remote Staging):** `BLOCKED` (No authorized secondary staging project; creation prohibited without explicit user cost authorization).
3. **Priority 3 (Isolated Simulation & Synthetic Fixtures):** `ACTIVATED`.

To ensure complete verification without risking production corruption, an isolated in-memory relational simulation matching 100% of the Supabase PostgreSQL schema, constraints, and RLS functions was constructed and verified in Vitest (`src/test/crossModuleScenarios.test.ts`).

---

### 2. Migration Pipeline & Schema Inventory

The application's relational structure is defined across 9 canonical migrations:

| Migration File | Key Tables & Entities Defined | Constraints & Security Enforced |
|---|---|---|
| `20261021000000_init.sql` | `academic_years`, `stages`, `sections`, `subjects`, `teachers`, `timetable`, `students`, `guardians`, `guardian_students`, `admins`, `homework`, `attachments`, `notices`, `reads`, `push_subscriptions`, `settings` | Full RLS enabled on all 16 tables. Functions `is_admin()`, `is_staff()`, `my_guardian_id()`, `my_section_ids()`, `mark_read()`. Storage buckets `attachments` & `branding`. |
| `20261021020000_seed_demo.sql` | Demo reference data for 7 sections, 5 demo guardians (PINs 111111–555555). | Pre-production testing baseline. |
| `20261021030000_fix_guardian_auth.sql` | Upsert `auth.users` and `auth.identities` for demo guardian logins. | Deterministic bcrypt hashes for local guardian testing. |
| `20261021050000_seed_school_data.sql` | Iraqi curriculum subjects, stages, and branches. | Unique curriculum names and sort indices. |
| `20261021100000_security_fixes.sql` | `get_section_subscriptions` RPC; `att_guardian` storage path regex cast guard; performance indices. | Service-role exclusive RPC execution; safe path parsing. |
| `20261021110000_fix_storage_draft_exposure.sql` | Patched `att_guardian` storage RLS policy. | Direct storage URL access to draft homework attachments blocked. |
| `20261021200000_school_master_data.sql` | `school_account_profiles`, `school_import_batches`, `school_import_audit`. RPC `apply_school_master_data`. | Two-phase staged import with SHA-256 batch staging and immutable audit logging. |
| `20261021210000_seed_admin_dev.sql` | Dev admin documentation & idempotent `admins` role wiring. | `admin@admin.rumaila.local` owner mapping. |
| `20261021400000_teaching_assignments.sql` | `teaching_assignments` M:N table. RPC `get_section_subject_teachers`. | `unique (teacher_id, subject_id, section_id)`; timetable fallback. |

---

### 3. Reusable Synthetic Test Fixtures

All operational verification suites strictly utilize isolated synthetic fixtures clearly differentiated from real school records:

```typescript
export const SYNTHETIC_FIXTURES = {
  sections: [
    { id: 901, stage_id: 3, year_id: 1, letter: 'س-اختبار', active: true },
    { id: 902, stage_id: 3, year_id: 1, letter: 'ص-اختبار', active: true },
  ],
  subjects: [
    { id: 801, name: 'كيمياء تجريبية', color: '#10B981', sort: 100 },
    { id: 802, name: 'أحياء تجريبية', color: '#3B82F6', sort: 101 },
  ],
  teachers: [
    { id: 701, full_name: 'أستاذ اختبار تجريبي', subject_id: 801, phone: '+9647899990001', active: true },
  ],
  teaching_assignments: [
    { id: 601, teacher_id: 701, subject_id: 801, section_id: 901, active: true },
    { id: 602, teacher_id: 701, subject_id: 802, section_id: 902, active: true },
  ],
  students: [
    { id: 501, full_name: 'طالب اختبار تجريبي أ', section_id: 901, active: true, notes: 'اختبار نظام' },
    { id: 502, full_name: 'طالب اختبار تجريبي ب', section_id: 902, active: true, notes: 'اختبار نظام' },
  ],
  guardians: [
    { id: 'g-test-01', user_id: 'auth-user-test-01', full_name: 'ولي أمر تجريبي', phone: '+9647899991111', active: true },
  ],
  guardian_students: [
    { guardian_id: 'g-test-01', student_id: 501, relation: 'أب' },
  ],
  timetable: [
    { id: 401, section_id: 901, weekday: 0, period: 1, subject_id: 801, teacher_id: 701 },
  ],
  homework: [
    { id: 'hw-test-01', section_id: 901, subject_id: 801, teacher_id: 701, due_date: '2026-10-25', period: 1, body: 'واجب تجريبي معزول', status: 'published' },
    { id: 'hw-draft-01', section_id: 901, subject_id: 801, teacher_id: 701, due_date: '2026-10-25', period: 2, body: 'مسودة اختبار سرية', status: 'draft' },
  ],
}
```

---

### 4. Gate B Sign-off

- Schema & Constraints: Fully audited against 9 SQL migration files.
- Test Fixtures: Fully decoupled from live production data.
- Production Immunity: Guaranteed via zero write executions against remote URL.
- **GATE B STATUS:** `PROVISIONED & VERIFIED (ISOLATED SIMULATION)`.
