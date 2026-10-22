/**
 * Wajibati (واجباتي) — Cross-Module Operational Consistency Suite
 *
 * Implements end-to-end integration logic testing for the 5 real school operational scenarios:
 *   1. Student Onboarding -> Guardian Link -> Timetable -> Homework Publication -> Guardian Scoped Read
 *   2. Multi-Student Guardian (multiple children across different sections)
 *   3. Student Section Transfer (preserving history, read receipts, and zero orphan records)
 *   4. Multi-Subject Teacher Assignments & Timetable Auto-Fill
 *   5. Account Deactivation & Security Access Barrier
 */

import { describe, it, expect } from 'vitest'

// ── In-memory simulation of Supabase relational invariants and RLS functions ──

interface Student {
  id: number
  full_name: string
  section_id: number
  active: boolean
}

interface Guardian {
  id: string
  user_id: string
  full_name: string
  phone: string
  active: boolean
}

interface GuardianStudent {
  guardian_id: string
  student_id: number
  relation: string
}

interface Teacher {
  id: number
  full_name: string
  subject_id: number
  active: boolean
}

interface TeachingAssignment {
  id: number
  teacher_id: number
  subject_id: number
  section_id: number | null
  active: boolean
}

interface TimetableSlot {
  id: number
  section_id: number
  weekday: number
  period: number
  subject_id: number
  teacher_id: number | null
}

interface Homework {
  id: string
  section_id: number
  subject_id: number
  teacher_id: number | null
  due_date: string
  period: number
  body: string
  status: 'draft' | 'published' | 'archived'
}

interface ReadReceipt {
  guardian_id: string
  section_id: number
  day: string
}

class SchoolDatabaseSimulator {
  students: Student[] = []
  guardians: Guardian[] = []
  guardian_students: GuardianStudent[] = []
  teachers: Teacher[] = []
  teaching_assignments: TeachingAssignment[] = []
  timetable: TimetableSlot[] = []
  homework: Homework[] = []
  reads: ReadReceipt[] = []

  // Mirrors SQL function my_section_ids(auth.uid())
  my_section_ids(authUserId: string): number[] {
    const guardian = this.guardians.find(g => g.user_id === authUserId && g.active)
    if (!guardian) return []

    const linkedStudentIds = this.guardian_students
      .filter(gs => gs.guardian_id === guardian.id)
      .map(gs => gs.student_id)

    const activeSections = this.students
      .filter(s => linkedStudentIds.includes(s.id) && s.active)
      .map(s => s.section_id)

    return Array.from(new Set(activeSections))
  }

  // Mirrors SQL function my_guardian_id(auth.uid())
  my_guardian_id(authUserId: string): string | null {
    const g = this.guardians.find(x => x.user_id === authUserId && x.active)
    return g ? g.id : null
  }

  // Mirrors SQL RLS policy g_homework on homework table
  queryGuardianHomework(authUserId: string, targetSectionId: number, date: string): Homework[] {
    const authorizedSections = this.my_section_ids(authUserId)
    if (!authorizedSections.includes(targetSectionId)) {
      return [] // RLS blocks access
    }
    return this.homework.filter(
      h => h.section_id === targetSectionId && h.due_date === date && h.status === 'published',
    )
  }

  // Mirrors SQL function mark_read(p_section, p_day)
  mark_read(authUserId: string, sectionId: number, day: string): { ok: boolean; error?: string } {
    const gid = this.my_guardian_id(authUserId)
    const allowedSections = this.my_section_ids(authUserId)
    if (!gid || !allowedSections.includes(sectionId)) {
      return { ok: false, error: 'forbidden' }
    }
    const alreadyRead = this.reads.some(
      r => r.guardian_id === gid && r.section_id === sectionId && r.day === day,
    )
    if (!alreadyRead) {
      this.reads.push({ guardian_id: gid, section_id: sectionId, day })
    }
    return { ok: true }
  }

  // Mirrors SQL function get_section_subject_teachers(p_section_id, p_subject_id)
  resolveTeacher(sectionId: number, subjectId: number): number | null {
    // 1. Check specific assignment
    const specific = this.teaching_assignments.find(
      ta => ta.active && ta.subject_id === subjectId && ta.section_id === sectionId,
    )
    if (specific) return specific.teacher_id

    // 2. Check general assignment (section_id IS NULL)
    const general = this.teaching_assignments.find(
      ta => ta.active && ta.subject_id === subjectId && ta.section_id === null,
    )
    if (general) return general.teacher_id

    // 3. Fallback to teacher's primary subject
    const primary = this.teachers.find(t => t.active && t.subject_id === subjectId)
    return primary ? primary.id : null
  }
}

describe('Phase 03: Cross-Module Operational Consistency Scenarios', () => {
  let db: SchoolDatabaseSimulator

  beforeEach(() => {
    db = new SchoolDatabaseSimulator()
  })

  // ── Scenario 1 ─────────────────────────────────────────────────────────────
  it('Scenario 1: Onboarding -> Link Guardian -> Timetable -> Publish Homework -> Scoped Visibility', () => {
    // 1. Admin creates student in Section 1 (الخامس علمي أ)
    const student: Student = { id: 101, full_name: 'علي حسن', section_id: 1, active: true }
    db.students.push(student)

    // 2. Admin creates and links guardian
    const guardian: Guardian = {
      id: 'g-uuid-1',
      user_id: 'auth-user-1',
      full_name: 'حسن محمد',
      phone: '+9647801112233',
      active: true,
    }
    db.guardians.push(guardian)
    db.guardian_students.push({ guardian_id: 'g-uuid-1', student_id: 101, relation: 'أب' })

    // 3. Timetable setup: Math (subject 1) taught by teacher 10 at period 1
    db.teachers.push({ id: 10, full_name: 'أستاذ أحمد', subject_id: 1, active: true })
    db.timetable.push({ id: 1, section_id: 1, weekday: 0, period: 1, subject_id: 1, teacher_id: 10 })

    // 4. Admin publishes homework for Section 1 and Section 2
    db.homework.push({
      id: 'hw-1',
      section_id: 1,
      subject_id: 1,
      teacher_id: 10,
      due_date: '2026-10-25',
      period: 1,
      body: 'حل تمارين ص 45',
      status: 'published',
    })

    db.homework.push({
      id: 'hw-secret-sec2',
      section_id: 2,
      subject_id: 1,
      teacher_id: 10,
      due_date: '2026-10-25',
      period: 1,
      body: 'واجب شعبة ب فقط',
      status: 'published',
    })

    // 5. Guardian queries:
    // Can access Section 1
    const sec1Hw = db.queryGuardianHomework('auth-user-1', 1, '2026-10-25')
    expect(sec1Hw).toHaveLength(1)
    expect(sec1Hw[0].body).toBe('حل تمارين ص 45')

    // Cannot access Section 2 (leak blocked by RLS simulation)
    const sec2Hw = db.queryGuardianHomework('auth-user-1', 2, '2026-10-25')
    expect(sec2Hw).toHaveLength(0)
  })

  // ── Scenario 2 ─────────────────────────────────────────────────────────────
  it('Scenario 2: Multi-Student Guardian across distinct sections with independent read receipts', () => {
    // Guardian has 2 sons: one in Section 1, one in Section 2
    const guardian: Guardian = {
      id: 'g-multi',
      user_id: 'auth-user-multi',
      full_name: 'محمود كريم',
      phone: '+9647805556677',
      active: true,
    }
    db.guardians.push(guardian)

    db.students.push(
      { id: 201, full_name: 'أحمد محمود', section_id: 1, active: true },
      { id: 202, full_name: 'ياسر محمود', section_id: 2, active: true },
    )

    db.guardian_students.push(
      { guardian_id: 'g-multi', student_id: 201, relation: 'أب' },
      { guardian_id: 'g-multi', student_id: 202, relation: 'أب' },
    )

    // Sections allowed: [1, 2]
    const allowed = db.my_section_ids('auth-user-multi')
    expect(allowed).toContain(1)
    expect(allowed).toContain(2)
    expect(allowed).not.toContain(3)

    // Publish homework in both sections
    db.homework.push(
      { id: 'hw-s1', section_id: 1, subject_id: 1, teacher_id: 1, due_date: '2026-10-25', period: 1, body: 'واجب 1', status: 'published' },
      { id: 'hw-s2', section_id: 2, subject_id: 2, teacher_id: 2, due_date: '2026-10-25', period: 1, body: 'واجب 2', status: 'published' },
    )

    // Guardian marks Section 1 as read
    const markRes = db.mark_read('auth-user-multi', 1, '2026-10-25')
    expect(markRes.ok).toBe(true)

    // Section 1 is read, but Section 2 is still unread
    expect(db.reads.some(r => r.guardian_id === 'g-multi' && r.section_id === 1)).toBe(true)
    expect(db.reads.some(r => r.guardian_id === 'g-multi' && r.section_id === 2)).toBe(false)
  })

  // ── Scenario 3 ─────────────────────────────────────────────────────────────
  it('Scenario 3: Student Section Transfer preserves history and read receipts without orphan records', () => {
    // Student enrolled in Section 1
    const student: Student = { id: 301, full_name: 'عمر خالد', section_id: 1, active: true }
    db.students.push(student)

    const guardian: Guardian = {
      id: 'g-transfer',
      user_id: 'auth-user-transfer',
      full_name: 'خالد عمر',
      phone: '+9647809998877',
      active: true,
    }
    db.guardians.push(guardian)
    db.guardian_students.push({ guardian_id: 'g-transfer', student_id: 301, relation: 'أب' })

    // Historical homework in Section 1 on 2026-10-20
    db.homework.push({
      id: 'hw-past-sec1',
      section_id: 1,
      subject_id: 1,
      teacher_id: 1,
      due_date: '2026-10-20',
      period: 1,
      body: 'واجب تاريخ قديم في شعبة أ',
      status: 'published',
    })

    // Guardian read Section 1 on 2026-10-20
    db.mark_read('auth-user-transfer', 1, '2026-10-20')
    expect(db.reads).toHaveLength(1)

    // Transfer student to Section 2
    student.section_id = 2

    // Now guardian's active section updates to [2]
    const newSections = db.my_section_ids('auth-user-transfer')
    expect(newSections).toEqual([2])

    // Section 1 historical homework is untouched in DB
    const oldHw = db.homework.find(h => h.id === 'hw-past-sec1')
    expect(oldHw).toBeDefined()
    expect(oldHw?.section_id).toBe(1)

    // Read receipts remain intact without orphan errors
    expect(db.reads[0].guardian_id).toBe('g-transfer')
    expect(db.reads[0].section_id).toBe(1)
  })

  // ── Scenario 4 ─────────────────────────────────────────────────────────────
  it('Scenario 4: Multi-Subject Teacher Assignments and Timetable Auto-Fill', () => {
    // Teacher 50 teaches Subject 1 (Chemistry) to Section 1, and Subject 2 (Biology) to Section 2
    db.teachers.push({ id: 50, full_name: 'د. سامر العاني', subject_id: 1, active: true })

    db.teaching_assignments.push(
      { id: 1, teacher_id: 50, subject_id: 1, section_id: 1, active: true },
      { id: 2, teacher_id: 50, subject_id: 2, section_id: 2, active: true },
    )

    // Resolving teacher for Chemistry in Section 1 -> Teacher 50
    expect(db.resolveTeacher(1, 1)).toBe(50)

    // Resolving teacher for Biology in Section 2 -> Teacher 50
    expect(db.resolveTeacher(2, 2)).toBe(50)

    // Resolving teacher for Chemistry in Section 2 (no assignment) -> Fallback to primary subject
    expect(db.resolveTeacher(2, 1)).toBe(50)

    // Resolving unassigned subject -> null
    expect(db.resolveTeacher(1, 999)).toBeNull()
  })

  // ── Scenario 5 ─────────────────────────────────────────────────────────────
  it('Scenario 5: Account and Student Deactivation cuts access immediately', () => {
    const student: Student = { id: 501, full_name: 'حسين علي', section_id: 1, active: true }
    db.students.push(student)

    const guardian: Guardian = {
      id: 'g-deact',
      user_id: 'auth-deact',
      full_name: 'علي حسين',
      phone: '+9647803334455',
      active: true,
    }
    db.guardians.push(guardian)
    db.guardian_students.push({ guardian_id: 'g-deact', student_id: 501, relation: 'أب' })

    // Active guardian can access section 1
    expect(db.my_section_ids('auth-deact')).toEqual([1])

    // Case A: Student is deactivated (e.g. graduated or left school)
    student.active = false
    expect(db.my_section_ids('auth-deact')).toEqual([])

    // Re-activate student
    student.active = true
    expect(db.my_section_ids('auth-deact')).toEqual([1])

    // Case B: Guardian account deactivated by school admin
    guardian.active = false
    expect(db.my_section_ids('auth-deact')).toEqual([])
    expect(db.my_guardian_id('auth-deact')).toBeNull()

    // Cannot mark read when deactivated
    const markAttempt = db.mark_read('auth-deact', 1, '2026-10-25')
    expect(markAttempt.ok).toBe(false)
    expect(markAttempt.error).toBe('forbidden')
  })
})
