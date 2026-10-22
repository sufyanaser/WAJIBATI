# WAJIBATI — PHASE 03: WAVE F — AUTHORIZATION & RLS VERIFICATION
## Comprehensive Security Audit, Row-Level Security Matrix & Role Governance

**Document ID:** `PHASE-03-06-AUTH-RLS-VERIFICATION`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Baseline HEAD:** `e3e3b94`  
**Author:** Lead Software Architect & Multi-Agent Orchestrator  
**Status:** COMPLETE (Wave F Gate Passed)

---

### 1. Security Architecture & Role Hierarchy

Wajibati enforces a dual-boundary security architecture:
1. **Application Layer (React + Write Barrier):** Guarded routes, role contexts (`useAdmin`), and the execution-level write barrier (`assertCanWrite`) prevent unauthorized actions before network requests occur.
2. **Database Layer (Supabase Postgres + RLS):** 100% of tables enforce Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Zero reliance on client-side security alone.

```
                           +----------------------+
                           |   Supabase Client    |
                           +----------------------+
                                      |
                                      v
    +---------------------------------+---------------------------------+
    |                                                                   |
    v                                                                   v
[Guardian Persona]                                              [School Staff Persona]
Role: authenticated                                             Role: authenticated + public.admins row
Email: <phone>@guardian.rumaila.local                            - viewer (read-only)
Scoped via my_section_ids()                                      - editor (homework CRUD + notices)
                                                                - owner  (accounts + master data import)
```

---

### 2. Comprehensive RLS Evaluation Matrix

| Table | Anonymous | Guardian (Authenticated) | Admin (Viewer) | Admin (Editor) | Admin (Owner) | Security Definer RPC / Service Role |
|---|---|---|---|---|---|---|
| `academic_years` | Denied | **SELECT** (`true`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `stages` | Denied | **SELECT** (`true`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `sections` | Denied | **SELECT** (`my_section_ids()`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `subjects` | Denied | **SELECT** (`true`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `teachers` | Denied | **SELECT** (`active = true`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `teaching_assignments`| Denied | Denied (indirect via timetable) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `timetable` | Denied | **SELECT** (`my_section_ids()`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `students` | Denied | **SELECT** (own children only) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `guardians` | Denied | **SELECT** (`user_id = auth.uid()`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `guardian_students` | Denied | **SELECT** (`my_guardian_id()`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `admins` | Denied | Denied | **SELECT** (`is_staff()`) | **SELECT** (`is_staff()`) | **ALL** (`role = 'owner'`) | Allowed |
| `school_account_profiles` | Denied | Denied | **SELECT** (`is_staff()`) | **SELECT** (`is_staff()`) | **ALL** (`role = 'owner'`) | Allowed |
| `homework` | Denied | **SELECT** (published + `my_section_ids()`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `attachments` | Denied | **SELECT** (published homework only) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `notices` | Denied | **SELECT** (active date window + section) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `reads` | Denied | **SELECT** (`my_guardian_id()`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | `mark_read()` RPC |
| `push_subscriptions`| Denied | **ALL** (`my_guardian_id()`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | `send-push` service_role |
| `settings` | **SELECT** | **SELECT** (`true`) | **SELECT** (`is_staff()`) | **ALL** (`is_admin()`) | **ALL** (`is_admin()`) | Allowed |
| `school_import_batches` | Denied | Denied | Denied | Denied | **SELECT / INSERT** (own batches) | Allowed |
| `school_import_audit` | Denied | Denied | **SELECT** (`is_staff()`) | **SELECT** (`is_staff()`) | **SELECT** (`is_staff()`) | DB trigger / Definer |

---

### 3. Storage Bucket Security

1. **Bucket `attachments` (Private):**
   - **Admins:** Full access (`is_admin()`).
   - **Guardians:** `att_guardian` policy strictly requires:
     - First path segment numeric regex matching section ID in `my_section_ids()`.
     - Second path segment UUID regex matching `homework.id`.
     - Joined verification that `homework.status = 'published'`.
   - **Unpublished Draft Protection:** Bypassing via guessed URLs fails immediately with 403 Forbidden.

2. **Bucket `branding` (Public):**
   - Read access public (`true`).
   - Write access restricted to administrators (`is_admin()`).

---

### 4. Edge Case Security Invariants

- **Viewer Role Barrier:**
  Administrators with role `viewer` can inspect all school records and statistics, but every write operation (`INSERT`, `UPDATE`, `DELETE`) is rejected at the database level by `is_admin()` (`role in ('owner','editor')`).
- **Push Subscription Fan-Out Protection:**
  Function `get_section_subscriptions(int)` is revoked from `public` and granted exclusively to `service_role`. Regular authenticated users cannot scrape push endpoints or VAPID credentials.
- **Guardian Authentication Convention:**
  Guardians have zero access to administrative views (`/admin/*`), locked down via `is_staff()` checks in `AdminShell.tsx` and Supabase RLS policies.
