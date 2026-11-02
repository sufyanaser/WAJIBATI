import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'
import { CheckIcon, CloseIcon } from '../../components/Icons'

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
  const [editCell, setEditCell] = useState<{ weekday: number; period: number } | null>(null)
  const [eSubject, setESubject] = useState<number | ''>('')
  const [eTeacher, setETeacher] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
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
      const assigned = assignments.find(
        a => a.section_id === sectionId && a.subject_id === subjectId,
      )
      if (assigned) return assigned.teacher_id
    }
    const bySubject = teachers.find(t => t.subject_id === subjectId)
    return bySubject ? bySubject.id : ''
  }

  function handleSubjectChange(nextSubId: number | '') {
    setESubject(nextSubId)
    if (nextSubId !== '') {
      const autoTeacher = resolveTeacherForSubject(secId, nextSubId)
      setETeacher(autoTeacher)
    } else {
      setETeacher('')
    }
  }

  async function handleSaveCell(e: React.FormEvent) {
    e.preventDefault()
    if (!editCell || !secId) return
    setSaving(true)
    const { weekday, period } = editCell
    const key = `${weekday}-${period}`
    const existing = grid.get(key)

    if (!eSubject) {
      // Clear slot if exists
      if (existing?.id) {
        const { error } = await supabase.from('timetable').delete().eq('id', existing.id)
        if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      }
      setEditCell(null)
      await loadTimetable()
      setSaving(false)
      showToast('تم مسح الحصة', 'info')
      return
    }

    const payload = {
      section_id: secId,
      weekday,
      period,
      subject_id: Number(eSubject),
      teacher_id: eTeacher ? Number(eTeacher) : null,
    }

    if (existing?.id) {
      const { error } = await supabase.from('timetable').update(payload).eq('id', existing.id)
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
    } else {
      const { error } = await supabase.from('timetable').insert(payload)
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
    }

    showToast('تم حفظ الحصة ✓', 'success')
    setEditCell(null)
    await loadTimetable()
    setSaving(false)
  }

  if (!ready) return <Spinner />

  return (
    <div className="dash-page" dir="rtl">
      <div className="dash-toolbar">
        <div>
          <h2 className="dash-page-title">الجدول الدراسي الأسبوعي</h2>
          <span className="muted">اختر المادة من الحصة، وسيُحدد المدرس تلقائياً عند توفر إسناد له</span>
        </div>
        <select
          className="admin-select"
          style={{ width: 'auto', minWidth: 180 }}
          value={secId ?? ''}
          onChange={e => { setEditCell(null); setSecId(Number(e.target.value)) }}
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
      {editCell && <p className="tt-edit-hint" role="status">احفظ التعديل أو ألغِه قبل تعديل حصة أخرى.</p>}
      {loading ? <Spinner /> : (
        <div className="tt-grid-wrap">
          <table className="tt-grid">
            <thead>
              <tr>
                <th className="tt-corner">اليوم / الحصة</th>
                {PERIODS.map(p => <th key={p}>الحصة {p}</th>)}
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map(w => (
                <tr key={w.day}>
                  <td className="tt-day-label">{w.label}</td>
                  {PERIODS.map(p => {
                    const cell = grid.get(`${w.day}-${p}`)
                    const editing = editCell?.weekday === w.day && editCell.period === p
                    const otherEdit = editCell !== null && !editing
                    return (
                      <td
                        key={p}
                        className={'tt-cell' + (canEdit ? ' clickable' : '') + (cell?.subject_id ? ' filled' : '')}
                        style={cell?.subject_color ? { borderRightColor: cell.subject_color, borderRightWidth: 3 } : undefined}
                      >
                        {canEdit ? (
                          <form className="tt-inline-edit" onSubmit={handleSaveCell} onKeyDown={e => { if (e.key === 'Escape' && !saving) setEditCell(null) }}>
                            <select className="admin-select tt-inline-select tt-subject-field" aria-label={`مادة ${w.label} الحصة ${p}`}
                              value={editing ? eSubject : (cell?.subject_id ?? '')}
                              onChange={e => { setEditCell({ weekday: w.day, period: p }); handleSubjectChange(e.target.value ? Number(e.target.value) : '') }}
                              disabled={saving || otherEdit}>
                              <option value="">حصة فارغة</option>
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select className="admin-select tt-inline-select tt-teacher-field" aria-label={`مدرس ${w.label} الحصة ${p}`}
                              value={editing ? eTeacher : (cell?.teacher_id ?? '')}
                              onChange={e => { if (!editing) { setEditCell({ weekday: w.day, period: p }); setESubject(cell?.subject_id ?? '') }; setETeacher(e.target.value ? Number(e.target.value) : '') }}
                              disabled={saving || otherEdit || !(editing ? eSubject : cell?.subject_id)}>
                              <option value="">بدون مدرس</option>
                              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                            </select>
                            {editing && <div className="tt-inline-actions">
                              <button type="submit" className="tt-inline-save" disabled={saving} title="حفظ الحصة"><CheckIcon size={16} /> <span>{saving ? '…' : 'حفظ'}</span></button>
                              <button type="button" className="tt-inline-cancel" disabled={saving} onClick={() => setEditCell(null)} title="إلغاء التعديل"><CloseIcon size={16} /><span>إلغاء</span></button>
                            </div>}
                          </form>
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
