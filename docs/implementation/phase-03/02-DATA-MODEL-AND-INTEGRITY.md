# WAJIBATI — PHASE 03: WAVE B — DATA MODEL & INTEGRITY ARCHITECTURE
## School Operational Data Integrity, Relational Invariants & Edge Cases

**Document ID:** `PHASE-03-02-DATA-MODEL-AND-INTEGRITY`  
**Date:** 2026-10-22  
**Target Branch:** `dev-admin-dashboard-reengineering`  
**Baseline HEAD:** `e3e3b94`  
**Author:** Lead Software Architect & Multi-Agent Orchestrator  
**Status:** COMPLETE (Wave B Gate Passed)

---

### 1. Invariants & Relational Architecture

The Wajibati school management system is modeled around the real-world operational flows of **إعدادية الرميلة للبنين**. The database schema strictly guarantees relational integrity via explicit Postgres constraints, foreign key cascades, and row-level security (RLS).

```
                      +-------------------+
                      |  academic_years   |
                      +-------------------+
                                |
                                v
+------------+       +-------------------+       +------------+
|   stages   | ----> |     sections      | <---- |  subjects  |
+------------+       +-------------------+       +------------+
                                |                      |
                   +------------+------------+         |
                   |                         |         |
                   v                         v         v
            +--------------+          +-------------------+
            |   students   |          |    timetable      |
            +--------------+          +-------------------+
                   |                            ^
                   v                            |
         +-------------------+        +-------------------+
         | guardian_students |        |    teachers       |
         +-------------------+        +-------------------+
                   ^                            ^
                   |                            |
            +--------------+          +-----------------------+
            |  guardians   |          |  teaching_assignments |
            +--------------+          +-----------------------+
```

---

### 2. Operational Scenarios & Invariant Rules

#### 2.1 Scenario 1: Multi-Student Guardians (أولياء الأمور متعددو الطلاب)
- **Business Reality:** A guardian may have multiple sons enrolled in the school (e.g. one in 4th Scientific 'A' and one in 6th Literary 'B').
- **Relational Representation:**
  - Table `guardians` stores a unique guardian row identified by UUID and phone number `+9647XXXXXXXXX`.
  - Table `guardian_students` stores an M:N link `(guardian_id, student_id, relation)`.
  - Primary Key: `(guardian_id, student_id)` prevents duplicate bindings.
- **Access Scoping (`my_section_ids()`):**
  ```sql
  select distinct s.section_id
  from guardians g
  join guardian_students gs on gs.guardian_id = g.id
  join students s on s.id = gs.student_id and s.active
  where g.user_id = auth.uid() and g.active;
  ```
- **Integrity Invariant:**
  - The guardian dynamically acquires read access to homework, notices, and attachments for all sections where their active children are enrolled.
  - Zero leakage: If the guardian has children in sections 1 and 2, they cannot read section 3.
  - Deactivating one student preserves access to the other active student's section.

#### 2.2 Scenario 2: Multi-Guardian Students (تعدد أولياء الأمور للطالب الواحد)
- **Business Reality:** Both father and mother, or an elder brother/guardian, may track the student's homework.
- **Relational Representation:**
  - Student row `students(id)` is referenced by multiple rows in `guardian_students`:
    - `(father_uuid, student_1, 'أب')`
    - `(mother_uuid, student_1, 'أم')`
  - Each guardian has their own distinct Supabase Auth account and PIN (`<phone_digits>@guardian.rumaila.local`).
- **Read Receipt Independence (`reads`):**
  - Primary Key on `reads`: `(guardian_id, section_id, day)`.
  - When the father marks the day's homework as read, his row is inserted.
  - The mother's read status remains unread until she opens the app and marks it read.
  - No race condition or overwrite occurs between co-guardians.

#### 2.3 Scenario 3: Multi-Subject Teachers & Teaching Assignments (المعلم متعدد المواد والشعب)
- **Business Reality:** A teacher may teach Chemistry to 5th Scientific 'A', Biology to 4th Scientific 'B', or multiple subjects across different sections.
- **Relational Representation:**
  - Table `teachers`: stores primary profile and default subject (`subject_id` kept for backward compatibility).
  - Table `teaching_assignments`:
    - Columns: `(id, teacher_id, subject_id, section_id, active)`
    - Constraint: `unique (teacher_id, subject_id, section_id)`
    - Null `section_id` indicates assignment to all sections of that subject.
- **Timetable Resolution Function (`get_section_subject_teachers`):**
  - Allows `HomeworkEntry` and `TimetablePage` to automatically resolve and populate the correct teacher for any given subject and section.

#### 2.4 Scenario 4: Timetable Conflicts & Scheduling Safety (الجدول وتعارض الحصص)
- **Relational Constraints:**
  - `timetable(section_id, weekday, period)` has a strict `UNIQUE` constraint.
  - It is mathematically impossible for a single section to have two subjects scheduled at the same period on the same day.
  - Valid periods: `1 <= period <= 6` (`check (period between 1 and 6)`).
  - Valid weekdays: `0 <= weekday <= 4` (0 = Sunday ... 4 = Thursday).
- **Teacher Double-Booking Prevention:**
  - The UI highlights when a teacher is assigned across sections.
  - Deleting/clearing a timetable cell removes the row, freeing the period cleanly without orphan homework or broken assignments.

#### 2.5 Scenario 5: Student Section Transfer (نقل الطالب بين الشعب)
- **Business Reality:** A student moves from Section 4-Scientific-A to Section 4-Scientific-B mid-term.
- **Operational Execution:**
  - `UPDATE students SET section_id = new_section_id WHERE id = student_id;`
- **Data Integrity Preservation:**
  1. `guardian_students` links directly to `student_id`, not `section_id`. Links are 100% preserved.
  2. The guardian's `my_section_ids()` immediately reflects `new_section_id`.
  3. Historical homework in the old section remains untouched in `homework`.
  4. Historical read receipts in `reads(guardian_id, old_section_id, day)` remain valid and auditable.
  5. The student immediately appears in the new section's roster and disappears from the old section's active list.
  6. Zero orphaned records, zero cascade corruption.

---

### 3. Summary of Invariants Verified

| Invariant | Enforced At | Test Verification |
|---|---|---|
| **No Cross-Section Homework Leakage** | Supabase RLS (`g_homework`) + `my_section_ids()` | Vitest RLS Security Suite |
| **Independent Guardian Read Receipts** | PK `(guardian_id, section_id, day)` | Vitest Homework Suite |
| **No Overlapping Period in Section** | Unique `(section_id, weekday, period)` | DB constraint / Timetable tests |
| **Draft Homework Attachment Exposure Blocked** | Storage RLS `att_guardian` + Regex checks | Storage Adapter tests |
| **Safe Section Transfers without Orphan Records** | FK `students(section_id)` + Cascade bounds | Cross-module tests |
