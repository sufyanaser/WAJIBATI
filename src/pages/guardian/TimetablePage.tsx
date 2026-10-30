import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { BottomNavBar } from '../../components/BottomNavBar'
import { useWeeklyTimetable } from '../../hooks/useWeeklyTimetable'
import { CalendarDaysIcon, ChevronRightIcon, ChevronLeftIcon } from '../../components/Icons'

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
    <main
      className="screen timetable-page"
      dir="rtl"
      style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        maxWidth: 600,
        margin: '0 auto',
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      {/* ? Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 4px 8px 4px',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(0, 123, 254, 0.1)', color: 'var(--accent, #007BFE)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarDaysIcon size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, color: '#0F172A', lineHeight: 1.2 }}>
              الجدول الأسبوعي
            </h1>
            <p style={{ fontSize: '0.78rem', margin: 0, color: 'var(--fg-secondary, #64748B)' }}>
              جدول الحصص المعتمد للصف والشعبة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => nav('/')}
          className="icon-btn"
          aria-label="العودة للرئيسية"
          style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeftIcon size={20} />
        </button>
      </header>

      {/* ? Multi-Child Selector */}
      {children.length > 1 && (
        <nav
          className="child-tabs"
          aria-label="اختيار الطالب"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}
        >
          {children.map((c, i) => (
            <button
              key={c.student_id}
              type="button"
              className={`tab ${i === childIdx ? 'active' : ''}`}
              onClick={() => setChildIdx(i)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: i === childIdx ? 'var(--accent, #007BFE)' : 'rgba(203, 213, 225, 0.75)',
                backgroundColor: i === childIdx ? 'rgba(0, 123, 254, 0.1)' : 'rgba(255, 255, 255, 0.85)',
                color: i === childIdx ? 'var(--accent, #007BFE)' : '#64748B',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.full_name}
            </button>
          ))}
        </nav>
      )}

      {/* ? Student & Section Bar */}
      {currentChild && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(203, 213, 225, 0.85)',
            borderRadius: 10,
            marginBottom: 12,
            fontSize: '0.86rem',
          }}
        >
          <span style={{ fontWeight: 700, color: '#0F172A' }}>{currentChild.full_name}</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              backgroundColor: 'rgba(0, 123, 254, 0.08)',
              border: '1px solid rgba(0, 123, 254, 0.25)',
              color: '#007BFE',
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            {currentChild.section_label}
          </span>
        </div>
      )}

      {/* ? 5-Day Selector Bar (Sun - Thu) */}
      <div
        role="tablist"
        aria-label="أيام الأسبوع الدراسي"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
          marginBottom: 14,
        }}
      >
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
              style={{
                padding: '8px 4px',
                borderRadius: 10,
                border: '1px solid',
                borderColor: isSelected ? 'var(--accent, #007BFE)' : isSmart ? 'rgba(0, 123, 254, 0.4)' : 'rgba(203, 213, 225, 0.8)',
                background: isSelected ? 'linear-gradient(135deg, #007BFE 0%, #00B4D8 100%)' : isSmart ? 'rgba(0, 123, 254, 0.06)' : 'rgba(255, 255, 255, 0.85)',
                color: isSelected ? '#FFFFFF' : isSmart ? '#007BFE' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                fontFamily: 'inherit',
                minHeight: 44,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 800 : 600 }}>{w.label}</span>
              {isSmart && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: isSelected ? 'var(--accent, #38bdf8)' : 'rgba(56, 189, 248, 0.8)',
                  }}
                >
                  الدوام
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ? Day Title & Relative Badge & Return Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
            جدول يوم {daySchedule.academicDayName}
          </h2>
          {daySchedule.relativeBadge && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: 'rgba(0, 123, 254, 0.1)',
                color: 'var(--accent, #007BFE)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              {daySchedule.relativeBadge}
            </span>
          )}
        </div>

        {daySchedule.isManualSelection && (
          <button
            type="button"
            onClick={returnToSmartDay}
            style={{
              background: 'none',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              color: '#38bdf8',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            العودة لليوم الدراسي ↺
          </button>
        )}
      </div>

      {/* ? Period Cards List (6 Canonical Periods) */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              style={{
                height: 58,
                borderRadius: 10,
                backgroundColor: 'rgba(24, 42, 69, 0.5)',
                border: '1px solid rgba(38, 59, 92, 0.4)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : daySchedule.isUnpublished ? (
        /* State 3: لا توجد حصص مسجلة لهذه الشعبة */
        <div
          style={{
            backgroundColor: 'rgba(10, 15, 29, 0.6)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            padding: '28px 16px',
            textAlign: 'center',
            color: 'var(--fg-secondary, #64748B)',
            margin: '20px 0',
          }}
        >
          <CalendarDaysIcon size={36} style={{ color: 'var(--muted, #64748b)', margin: '0 auto 10px auto' }} />
          <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
            لا توجد حصص مسجلة لهذه الشعبة
          </p>
          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--muted, #64748b)' }}>
            سيظهر الجدول الأسبوعي هنا فور اعتماده من إدارة المدرسة.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {daySchedule.slots.map((item, idx) => {
            if (item.type === 'ASSIGNED') {
              const s = item.slot
              const subColor = s.subject?.color || '#38bdf8'

              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    border: '1px solid rgba(226, 232, 240, 0.9)',
                    borderInlineStartWidth: 4,
                    borderInlineStartColor: subColor,
                    borderInlineStartStyle: 'solid',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--fg-secondary, #64748B)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {s.period}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A' }}>
                        {s.subject?.name ?? 'مادة مسجلة'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--fg-secondary, #64748B)', marginTop: 2 }}>
                        {s.teacher?.full_name ?? 'المدرس: لم يُحدد'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            if (item.type === 'UNASSIGNED_TEACHER') {
              const s = item.slot
              const subColor = s.subject?.color || '#38bdf8'

              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    border: '1px solid rgba(226, 232, 240, 0.9)',
                    borderInlineStartWidth: 4,
                    borderInlineStartColor: subColor,
                    borderInlineStartStyle: 'solid',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--fg-secondary, #64748B)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {s.period}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A' }}>
                        {s.subject?.name ?? 'مادة مسجلة'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--muted, #64748b)', marginTop: 2 }}>
                        المدرس: لم يُحدد
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--muted, #64748b)',
                    }}
                  >
                    شاغر
                  </span>
                </div>
              )
            }

            // State 2: NO_RECORD - حصة غير مسجلة
            return (
              <div
                key={`empty-${item.period}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(10, 15, 29, 0.4)',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--muted, #64748b)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.period}
                  </span>
                  <span style={{ fontSize: '0.86rem', color: 'var(--muted, #64748b)', fontStyle: 'italic' }}>
                    حصة غير مسجلة
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ? Unified Bottom Nav */}
      <BottomNavBar />
    </main>
  )
}
