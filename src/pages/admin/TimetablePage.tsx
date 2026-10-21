import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Section { id: number; letter: string; stage: { name: string; branch: string } }
interface Subject { id: number; name: string }
interface Teacher { id: number; full_name: string }
interface TimetableRow {
  id: number
  section_id: number
  weekday: number
  period: number
  subject_id: number
  teacher_id: number | null
  subject: Subject | null
  teacher: Teacher | null
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const PERIODS = [1, 2, 3, 4, 5, 6]

const cellStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '6px 8px',
  fontSize: '.78rem',
  minHeight: 52,
  cursor: 'pointer',
  textAlign: 'center',
}

export default function TimetablePage() {
  const [sections, setSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [timetable, setTimetable] = useState<TimetableRow[]>([])
  const [secId, setSecId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ weekday: number; period: number } | null>(null)
  const [eSubject, setESubject] = useState<number | ''>('')
  const [eTeacher, setETeacher] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('sections').select('id, letter, stage:stages(name, branch)').eq('active', true).order('letter'),
      supabase.from('subjects').select('id, name').order('sort'),
      supabase.from('teachers').select('id, full_name').eq('active', true).order('full_name'),
    ]).then(([sec, sub, tch]) => {
      const secs = (sec.data ?? []) as unknown as Section[]
      setSections(secs)
      setSubjects((sub.data ?? []) as Subject[])
      setTeachers((tch.data ?? []) as Teacher[])
      if (secs.length) setSecId(secs[0].id)
    })
  }, [])

  useEffect(() => {
    if (!secId) return
    setLoading(true)
    supabase.from('timetable')
      .select('id, section_id, weekday, period, subject_id, teacher_id, subject:subjects(id, name), teacher:teachers(id, full_name)')
      .eq('section_id', secId)
      .then(({ data }) => {
        setTimetable((data ?? []) as unknown as TimetableRow[])
        setLoading(false)
      })
  }, [secId])

  function getCell(weekday: number, period: number) {
    return timetable.find(r => r.weekday === weekday && r.period === period) ?? null
  }

  function openEdit(weekday: number, period: number) {
    const cell = getCell(weekday, period)
    setEditing({ weekday, period })
    setESubject(cell?.subject_id ?? '')
    setETeacher(cell?.teacher_id ?? '')
  }

  async function saveCell(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !secId) return
    setSaving(true)
    const existing = getCell(editing.weekday, editing.period)
    if (!eSubject) {
      // clear the cell
      if (existing) await supabase.from('timetable').delete().eq('id', existing.id)
    } else {
      const payload = {
        section_id: secId,
        weekday: editing.weekday,
        period: editing.period,
        subject_id: Number(eSubject),
        teacher_id: eTeacher ? Number(eTeacher) : null,
      }
      if (existing) {
        await supabase.from('timetable').update({ subject_id: payload.subject_id, teacher_id: payload.teacher_id }).eq('id', existing.id)
      } else {
        await supabase.from('timetable').insert(payload)
      }
    }
    // reload
    const { data } = await supabase.from('timetable')
      .select('id, section_id, weekday, period, subject_id, teacher_id, subject:subjects(id, name), teacher:teachers(id, full_name)')
      .eq('section_id', secId)
    setTimetable((data ?? []) as unknown as TimetableRow[])
    setEditing(null); setSaving(false)
  }

  const sLabel = (s: Section) => `${s.stage.name} ${s.stage.branch} / ${s.letter}`

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>الجدول الدراسي</h2>

      <select value={secId ?? ''} onChange={e => setSecId(Number(e.target.value))} style={{ maxWidth: 240 }}>
        {sections.map(s => <option key={s.id} value={s.id}>{sLabel(s)}</option>)}
      </select>

      {loading ? <p className="muted">جارٍ التحميل…</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 520, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ fontSize: '.8rem', color: 'var(--muted)', padding: '4px 8px', textAlign: 'right' }}>الحصة</th>
                {DAYS.map(d => (
                  <th key={d} style={{ fontSize: '.8rem', color: 'var(--muted)', padding: '4px 8px', textAlign: 'center' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(p => (
                <tr key={p}>
                  <td style={{ fontSize: '.82rem', color: 'var(--muted)', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                    {p}
                  </td>
                  {DAYS.map((_, wi) => {
                    const cell = getCell(wi, p)
                    return (
                      <td key={wi} style={{ padding: 0 }}>
                        <div
                          style={{
                            ...cellStyle,
                            background: cell ? 'var(--card)' : 'transparent',
                            color: cell ? 'var(--fg)' : 'var(--border)',
                            outline: editing?.weekday === wi && editing?.period === p ? '2px solid var(--accent)' : undefined,
                          }}
                          onClick={() => openEdit(wi, p)}
                        >
                          {cell ? (
                            <>
                              <div style={{ fontWeight: 600 }}>{cell.subject?.name}</div>
                              {cell.teacher && <div style={{ color: 'var(--muted)' }}>{cell.teacher.full_name}</div>}
                            </>
                          ) : <span>+</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <form
            onSubmit={saveCell}
            dir="rtl"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'grid', gap: 12, minWidth: 280 }}
          >
            <h3 style={{ margin: 0 }}>{DAYS[editing.weekday]} · حصة {editing.period}</h3>
            <select value={eSubject} onChange={e => setESubject(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— بدون مادة (حذف) —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={eTeacher} onChange={e => setETeacher(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— بدون مدرس —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? '…' : 'حفظ'}</button>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
