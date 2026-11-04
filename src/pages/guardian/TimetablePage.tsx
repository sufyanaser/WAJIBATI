import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { BottomNavBar } from '../../components/BottomNavBar'
import { useWeeklyTimetable } from '../../hooks/useWeeklyTimetable'
import { CalendarDaysIcon } from '../../components/Icons'

interface ChildInfo {
  student_id: number
  full_name: string
  section_id: number
  section_label: string
}

const WEEKDAYS = [
  { index: 0, label: 'الأحد' },
  { index: 1, label: 'الاثنين' },
  { index: 2, label: 'الثلاثاء' },
  { index: 3, label: 'الأربعاء' },
  { index: 4, label: 'الخميس' },
]

export default function TimetablePage() {
  const nav = useNavigate()
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [childIdx, setChildIdx] = useState(0)
  const [childrenLoaded, setChildrenLoaded] = useState(false)

  // 1. Fetch authenticated guardian's children
  useEffect(() => {
    async function loadGuardianChildren() {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) {
        nav('/login')
        return
      }

      const uid = sess.session.user.id
      const { data: g } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle()

      if (!g) {
        setChildrenLoaded(true)
        return
      }

      const { data: gs } = await supabase
        .from('guardian_students')
        .select(`
          student:students (
            id,
            full_name,
            section:sections (
              id,
              letter,
              stage:stages (
                name,
                branch
              )
            )
          )
        `)
        .eq('guardian_id', g.id)

      if (gs && gs.length) {
        const mapped: ChildInfo[] = []
        for (const row of gs as any[]) {
          const s = row.student
          if (!s || !s.section) continue
          const stageName = s.section.stage?.name ?? ''
          const stageBranch = s.section.stage?.branch ? ` ${s.section.stage.branch}` : ''
          const letter = s.section.letter ?? ''
          mapped.push({
            student_id: s.id,
            full_name: s.full_name,
            section_id: s.section.id,
            section_label: `${stageName}${stageBranch} - شعبة (${letter})`,
          })
        }
        setChildren(mapped)
      }
      setChildrenLoaded(true)
    }

    loadGuardianChildren()
  }, [nav])

  const currentChild = children[childIdx] ?? null
  const currentSectionId = currentChild?.section_id ?? null

  // 2. Weekly timetable hook for selected section
  const {
    loading,
    error,
    daySchedule,
    selectedDay,
    smartDay,
    selectDay,
    returnToSmartDay,
  } = useWeeklyTimetable(currentSectionId)

  return (
    <main className="screen timetable-page tt-page" dir="rtl">
      {/* ── Unified Header ── */}
      <PageHeader
        title="الجدول الأسبوعي"
        subtitle={currentChild?.section_label || 'جدول الحصص المعتمد للصف والشعبة'}
        onBack={() => nav('/')}
        backLabel="العودة للرئيسية"
      />

      {/* ── Multi-Child Selector ── */}
      {children.length > 1 && (
        <nav className="child-tabs tt-child-tabs" aria-label="اختيار الطالب">
          {children.map((c, i) => (
            <button
              key={c.student_id}
              type="button"
              className={`tab ${i === childIdx ? 'active' : ''}`}
              onClick={() => setChildIdx(i)}
            >
              {c.full_name}
            </button>
          ))}
        </nav>
      )}

      {/* ── Student & Section Bar ── */}
      {currentChild && (
        <div className="student-bar tt-student-bar">
          <div className="student-bar-info">
            <span className="student-bar-name">{currentChild.full_name}</span>
            <span className="student-bar-badge">{currentChild.section_label}</span>
          </div>
        </div>
      )}

      {/* ── 5-Day Selector Bar (Sun - Thu) ── */}
      <div role="tablist" aria-label="أيام الأسبوع الدراسي" className="timetable-day-grid">
        {WEEKDAYS.map(w => {
          const isSelected = selectedDay === w.index
          const isSmart = smartDay === w.index

          return (
            <button
              key={w.index}
              role="tab"
              type="button"
              aria-selected={isSelected}
              onClick={() => selectDay(w.index)}
              className={`timetable-day-btn ${isSelected ? 'active' : ''} ${isSmart ? 'is-smart' : ''}`}
            >
              <span className="timetable-day-label">{w.label}</span>
              {isSmart && <span className="timetable-day-smart-tag">الدوام</span>}
            </button>
          )
        })}
      </div>

      {/* ── Day title, relative badge and return button ── */}
      <div className="tt-section-head">
        <div className="tt-section-title-row">
          <h2 className="tt-section-title">جدول يوم {daySchedule.academicDayName}</h2>
          {daySchedule.relativeBadge && <span className="tt-badge">{daySchedule.relativeBadge}</span>}
        </div>

        {daySchedule.isManualSelection && (
          <button type="button" onClick={returnToSmartDay} className="tt-return-btn">
            العودة لليوم الدراسي ↺
          </button>
        )}
      </div>

      {/* ── Period list (6 canonical periods) ── */}
      {loading ? (
        <div className="tt-list">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="tt-skeleton" />
          ))}
        </div>
      ) : daySchedule.isUnpublished ? (
        /* State 3: لا توجد حصص مسجلة لهذه الشعبة */
        <div className="tt-empty">
          <span className="tt-empty-icon" aria-hidden="true">
            <CalendarDaysIcon size={36} />
          </span>
          <p className="tt-empty-title">لا توجد حصص مسجلة لهذه الشعبة</p>
          <p className="tt-empty-text">سيظهر الجدول الأسبوعي هنا فور اعتماده من إدارة المدرسة.</p>
        </div>
      ) : (
        <div className="tt-list">
          {daySchedule.slots.map(item => {
            if (item.type === 'ASSIGNED') {
              const s = item.slot
              const subColor = s.subject?.color || 'var(--accent)'

              return (
                <div key={s.id} className="tt-row" style={{ '--tt-accent': subColor } as React.CSSProperties}>
                  <div className="tt-row-start">
                    <span className="tt-period">{s.period}</span>
                    <div>
                      <div className="tt-subject">{s.subject?.name ?? 'مادة مسجلة'}</div>
                      <div className="tt-teacher">{s.teacher?.full_name ?? 'المدرس: لم يُحدد'}</div>
                    </div>
                  </div>
                </div>
              )
            }

            if (item.type === 'UNASSIGNED_TEACHER') {
              const s = item.slot
              const subColor = s.subject?.color || 'var(--accent)'

              return (
                <div key={s.id} className="tt-row" style={{ '--tt-accent': subColor } as React.CSSProperties}>
                  <div className="tt-row-start">
                    <span className="tt-period">{s.period}</span>
                    <div>
                      <div className="tt-subject">{s.subject?.name ?? 'مادة مسجلة'}</div>
                      <div className="tt-teacher">المدرس: لم يُحدد</div>
                    </div>
                  </div>
                  <span className="tt-vacant">شاغر</span>
                </div>
              )
            }

            // State 2: NO_RECORD - حصة غير مسجلة
            return (
              <div key={`empty-${item.period}`} className="tt-row tt-row--empty">
                <div className="tt-row-start">
                  <span className="tt-period tt-period--empty">{item.period}</span>
                  <span className="tt-empty-slot-text">حصة غير مسجلة</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Unified Bottom Nav ── */}
      <BottomNavBar />
    </main>
  )
}
