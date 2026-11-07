# WAJIBATI — PHASE 03: WAVE D — CROSS-MODULE OPERATIONAL SCENARIOS
## Verification of End-to-End Operational Lifecycle Invariants

**Document ID:** `PHASE-03-04-CROSS-MODULE-SCENARIOS`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Baseline HEAD:** `e3e3b94`  
**Test Suite:** `src/test/crossModuleScenarios.test.ts` (5 automated tests, 100% pass)  
**Author:** Lead Software Architect & Multi-Agent Orchestrator  
**Status:** COMPLETE (Wave D Gate Passed)

---

### 1. Purpose & Verification Scope

A school is a single live operational ecosystem. Changes in one module (such as enrolling a student or altering a teacher's schedule) immediately affect guardian feeds, timetable lookups, homework authoring, and read receipt tracking.

Wave D verified the 5 core operational journeys under realistic multi-table conditions without mock trivialization.

---

### 2. The 5 Scenarios & Verified Outcomes

#### Scenario 1: Student Onboarding -> Guardian Link -> Timetable -> Homework -> Scoped Visibility
- **Operational Flow:**
  1. Student `علي حسن` is created in Section 1 (الخامس علمي أ).
  2. Guardian `حسن محمد` (`+9647801112233`) is registered and linked to student.
  3. Teacher `أستاذ أحمد` is scheduled for period 1 (Mathematics) in Section 1.
  4. Homework `حل تمارين ص 45` is published for Section 1.
  5. Homework `واجب شعبة ب فقط` is published for Section 2.
- **Verification Result:**
  - Guardian's query for Section 1 returns the published homework.
  - Guardian's query for Section 2 returns empty list (0 records). RLS boundary strictly prevents cross-section leakage.
  - **Verdict:** `PASS`

#### Scenario 2: Multi-Student Guardian across Distinct Sections
- **Operational Flow:**
  1. Guardian `محمود كريم` has two sons: `أحمد محمود` (Section 1) and `ياسر محمود` (Section 2).
  2. Distinct homework is published for Section 1 and Section 2.
  3. Guardian marks Section 1 as read.
- **Verification Result:**
  - `my_section_ids()` dynamically includes both `[1, 2]`. Section 3 remains inaccessible.
  - Read receipt for Section 1 is recorded in `reads(guardian_id, 1, day)`.
  - Section 2 remains unread in `reads(guardian_id, 2, day)`. Co-student read receipts never bleed across sections.
  - **Verdict:** `PASS`

#### Scenario 3: Student Section Transfer
- **Operational Flow:**
  1. Student `عمر خالد` is initially enrolled in Section 1. Historical homework was assigned and read.
  2. Mid-term transfer: admin updates `students.section_id` from 1 to 2.
- **Verification Result:**
  - Guardian's `my_section_ids()` immediately switches to `[2]`.
  - Section 1's historical homework remains preserved in `homework` table with its original section reference.
  - Previous read receipts in `reads` for Section 1 are preserved without foreign key constraint violations.
  - Zero orphan records generated.
  - **Verdict:** `PASS`

#### Scenario 4: Multi-Subject Teacher Assignments & Timetable Auto-Fill
- **Operational Flow:**
  1. Teacher `د. سامر العاني` has primary subject Chemistry, but is assigned to teach Biology in Section 2 via `teaching_assignments`.
  2. Timetable and homework entry queries resolve the teacher for each section.
- **Verification Result:**
  - Chemistry in Section 1 resolves to Teacher `د. سامر العاني`.
  - Biology in Section 2 resolves to Teacher `د. سامر العاني`.
  - Unassigned subjects cleanly return `null` without throwing errors.
  - **Verdict:** `PASS`

#### Scenario 5: Account Deactivation & Security Access Barrier
- **Operational Flow:**
  1. Active student and guardian verify normal access.
  2. Case A: Student is deactivated (`active: false`). Guardian access immediately drops to `[]`.
  3. Case B: Guardian is deactivated (`active: false`). Both `my_guardian_id()` and `my_section_ids()` return empty / null.
  4. Attempting `mark_read()` as a deactivated guardian throws `forbidden`.
- **Verification Result:**
  - Instant cutoff upon deactivation. Re-activation instantly restores proper access.
  - **Verdict:** `PASS`
