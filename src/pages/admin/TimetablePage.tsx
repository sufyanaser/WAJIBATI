import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'

// ── types ──────────────────────────────────────────────────────────────────────

interface Section {
  id: number
  letter: string
  stage: { name: string; branch: string }
}

interface Subject { id: number; name: string; color: string | null }
interface Teacher { id: number; full_name: string; subject_id: number | null }

interface TtCell {
  id?: number
  weekday: number
  period: number
  subject_id: number | null
  teacher_id: number | null
  subject_name: string
  subject_color: string | null
  teacher_name: string
}

interface TeachingAssignment {
  section_id: number
  subject_id: number
  teacher_id: number
}

const WEEKDAYS = [
  { day: 0, label: 'الأحد' },
  { day: 1, label: 'الاثنين' },
  { day: 2, label: 'الثلاثاء' },
  { day: 3, label: 'الأربعاء' },
  { day: 4, label: 'الخميس' },
]

const PERIODS = [1, 2, 3, 4, 5, 6]

// ── component ──────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const { ready, role } = useAdmin()
  const [sections, setSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([])
  const [secId, setSecId] = useState<number | null>(null)
  const [grid, setGrid] = useState<Map<string, TtCell>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<{ key: string; subject: number | ''; teacher: number | '' } | null>(null)
  const savingRef = useRef(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (!ready) return
    void loadRef()
  }, [ready])

  async function loadRef() {
    const [secR, subR, teaR, taR] = await Promise.all([
      supabase.from('sections').select('id, letter, stage:stages(name, branch)').eq('active', true).order('letter'),
      supabase.from('subjects').select('id, name, color').order('sort'),
      supabase.from('teachers').select('id, full_name, subject_id').eq('active', true).order('full_name'),
      supabase.from('teaching_assignments').select('section_id, subject_id, teacher_id').eq('active', true),
    ])
    const secs = (secR.data ?? []) as unknown as Section[]
    setSections(secs)
    setSubjects((subR.data ?? []) as Subject[])
    setTeachers((teaR.data ?? []) as Teacher[])
    setAssignments((taR.data ?? []) as TeachingAssignment[])
    if (secs.length && !secId) setSecId(secs[0].id)
    setLoading(false)
  }

  const loadTimetable = useCallback(async () => {
    if (!secId) return
    setLoading(true)
    const { data } = await supabase
      .from('timetable')
      .select('id, weekday, period, subject_id, teacher_id, subject:subjects(name, color), teacher:teachers(full_name)')
      .eq('section_id', secId)

    type RawRow = {
      id: number; weekday: number; period: number
      subject_id: number | null; teacher_id: number | null
      subject: { name: string; color: string | null } | null
      teacher: { full_name: string } | null
    }
    const rows = (data ?? []) as unknown as RawRow[]
    const map = new Map<string, TtCell>()
    for (const r of rows) {
      map.set(`${r.weekday}-${r.period}`, {
        id: r.id,
        weekday: r.weekday,
        period: r.period,
        subject_id: r.subject_id,
        teacher_id: r.teacher_id,
        subject_name: r.subject?.name ?? '',
        subject_color: r.subject?.color ?? null,
        teacher_name: r.teacher?.full_name ?? '',
      })
    }
    setGrid(map)
    setLoading(false)
  }, [secId])

  useEffect(() => {
    if (secId) void loadTimetable()
  }, [secId, loadTimetable])

  function resolveTeacherForSubject(sectionId: number | null, subjectId: number): number | '' {
    if (sectionId) {
      const assigned = assignments.filter(
        a => a.section_id === sectionId && a.subject_id === subjectId,
      )
      if (assigned.length === 1 && teachers.some(t => t.id === assigned[0].teacher_id)) return assigned[0].teacher_id
      if (assigned.length > 0) return ''
    }
    const bySubject = teachers.filter(t => t.subject_id === subjectId)
    return bySubject.length === 1 ? bySubject[0].id : ''
  }

  async function saveCell(weekday: number, period: number, subject: number | '', teacher: number | '') {
    if (!secId || !canEdit || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const key = `${weekday}-${period}`
    const existing = grid.get(key)
    setPending({ key, subject, teacher })
    try {
      if (!subject) {
        if (existing?.id) {
          const { data, error } = await supabase.from('timetable').delete().eq('id', existing.id).select('id').maybeSingle()
          if (error || !data) throw new Error(error?.message || 'لم يُحذف السجل')
        }
        setGrid(prev => { const next = new Map(prev); next.delete(key); return next })
      } else {
        const payload = { section_id: secId, weekday, period, subject_id: subject, teacher_id: teacher || null }
        const result = existing?.id
          ? await supabase.from('timetable').update(payload).eq('id', existing.id).select('id').maybeSingle()
          : await supabase.from('timetable').insert(payload).select('id').maybeSingle()
        if (result.error || !result.data) throw new Error(result.error?.message || 'لم يُحفظ السجل')
        const savedId = result.data.id
        const chosenSubject = subjects.find(s => s.id === subject)
        const chosenTeacher = teachers.find(t => t.id === teacher)
        setGrid(prev => new Map(prev).set(key, {
          id: savedId, weekday, period, subject_id: subject, teacher_id: teacher || null,
          subject_name: chosenSubject?.name ?? '', subject_color: chosenSubject?.color ?? null,
          teacher_name: chosenTeacher?.full_name ?? '',
        }))
      }
      showToast('تم الحفظ تلقائياً', 'success')
    } catch (error) {
      showToast(`تعذر تأكيد الحفظ. أعد تحميل الجدول للتحقق: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, 'error')
    } finally {
      setPending(null)
      setSaving(false)
      savingRef.current = false
    }
  }

  if (!ready) return <Spinner />

  return (
    <div className="dash-page" dir="rtl">
      {sections.length > 0 && (
        <div className="he-section-pills-scroll" role="tablist" aria-label="أقسام الشعب الدراسية للجدول">
          {sections.map(s => {
            const isSelected = secId === s.id
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`he-section-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSecId(s.id)}
                disabled={saving}
              >
                <span className="he-section-pill-stage">{s.stage.name}</span>
                <span className="he-section-pill-sep">/</span>
                <span className="he-section-pill-letter">{s.letter}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="dash-toolbar">
        <div>
          <h2 className="dash-page-title">الجدول الدراسي الأسبوعي</h2>
          <span className="muted">اختر المادة من الدرس، وسيُحدد المدرس تلقائياً عند توفر إسناد له</span>
        </div>
        <select
          className="admin-select tt-section-select"
          value={secId ?? ''}
          onChange={e => setSecId(Number(e.target.value))}
          disabled={saving}
          aria-label="اختر الشعبة للجدول"
        >
          {sections.map(s => (
            <option key={s.id} value={s.id}>
              {s.stage.name} {s.stage.branch} / {s.letter}
            </option>
          ))}
        </select>
      </div>

      {/* Timetable Grid */}
      <p className="tt-scroll-hint">اسحب الجدول أفقياً لعرض بقية الحصص.</p>
      {saving && <p className="tt-edit-hint" role="status">جارٍ حفظ التغيير…</p>}
      {loading ? <Spinner /> : (
        <div className="tt-grid-wrap">
          <table className="tt-grid">
            <thead>
              <tr>
                <th className="tt-corner">اليوم / الدرس</th>
                {PERIODS.map(p => <th key={p}>الدرس {p}</th>)}
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map(w => (
                <tr key={w.day}>
                  <td className="tt-day-label">{w.label}</td>
                  {PERIODS.map(p => {
                    const cell = grid.get(`${w.day}-${p}`)
                    const active = pending?.key === `${w.day}-${p}` ? pending : null
                    return (
                      <td
                        key={p}
                        className={'tt-cell' + (canEdit ? ' clickable' : '') + (cell?.subject_id ? ' filled' : '')}
                        style={cell?.subject_color ? { borderRightColor: cell.subject_color, borderRightWidth: 3 } : undefined}
                      >
                        {canEdit ? (
                          <div className="tt-inline-edit">
                            <select className="admin-select tt-inline-select tt-subject-field" aria-label={`مادة ${w.label} الحصة ${p}`}
                              value={active ? active.subject : (cell?.subject_id ?? '')}
                              onChange={e => { const subject = e.target.value ? Number(e.target.value) : ''; void saveCell(w.day, p, subject, subject ? resolveTeacherForSubject(secId, subject) : '') }}
                              disabled={saving}>
                              <option value="">حصة فارغة</option>
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select className="admin-select tt-inline-select tt-teacher-field" aria-label={`مدرس ${w.label} الحصة ${p}`}
                              value={active ? active.teacher : (cell?.teacher_id ?? '')}
                              onChange={e => { if (cell?.subject_id) void saveCell(w.day, p, cell.subject_id, e.target.value ? Number(e.target.value) : '') }}
                              disabled={saving || !(active ? active.subject : cell?.subject_id)}>
                              <option value="">بدون مدرس</option>
                              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                            </select>
                          </div>
                        ) : cell?.subject_name ? (
                          <div className="tt-inline-edit">
                            <strong className="tt-readonly-field tt-subject-field">{cell.subject_name}</strong>
                            <span className="tt-readonly-field tt-teacher-field">{cell.teacher_name || 'بدون مدرس'}</span>
                          </div>
                        ) : (
                          <span className="tt-empty">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
