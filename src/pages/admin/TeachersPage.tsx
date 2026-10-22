import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'

interface TeacherRow {
  id: number
  external_key: string | null
  full_name: string
  phone: string | null
  active: boolean
  subject: { id: number; name: string } | null
  assignments: { section_label: string; subject_name: string }[]
}

interface SubjectOpt { id: number; name: string }

export default function TeachersPage() {
  const { ready, role } = useAdmin()
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [subjects, setSubjects] = useState<SubjectOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TeacherRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (!ready) return
    void load()
  }, [ready])

  async function load() {
    setLoading(true)
    const [tR, sR, taR] = await Promise.all([
      supabase.from('teachers').select('id, external_key, full_name, phone, active, subject:subjects(id, name)').order('full_name'),
      supabase.from('subjects').select('id, name').order('sort'),
      supabase.from('teaching_assignments')
        .select('teacher_id, subject:subjects(name), section:sections(letter, stage:stages(name, branch))')
        .eq('active', true),
    ])

    setSubjects((sR.data ?? []) as SubjectOpt[])

    type RawTA = {
      teacher_id: number
      subject: { name: string } | null
      section: { letter: string; stage: { name: string; branch: string } } | null
    }
    const taList = (taR.data ?? []) as unknown as RawTA[]
    const taByTeacher = new Map<number, { section_label: string; subject_name: string }[]>()
    for (const ta of taList) {
      if (!ta.section || !ta.subject) continue
      const label = `${ta.section.stage.name} ${ta.section.stage.branch}/${ta.section.letter}`
      const arr = taByTeacher.get(ta.teacher_id) ?? []
      arr.push({ section_label: label, subject_name: ta.subject.name })
      taByTeacher.set(ta.teacher_id, arr)
    }

    type RawT = {
      id: number; external_key: string | null; full_name: string
      phone: string | null; active: boolean
      subject: { id: number; name: string } | null
    }
    const rawTeachers = (tR.data ?? []) as unknown as RawT[]
    setTeachers(rawTeachers.map(t => ({
      ...t,
      assignments: taByTeacher.get(t.id) ?? [],
    })))
    setLoading(false)
  }

  function startAdd() {
    setEditing(null)
    setFullName('')
    setSubjectId(subjects[0]?.id ?? '')
    setPhone('')
    setShowForm(true)
  }

  function startEdit(t: TeacherRow) {
    setEditing(t)
    setFullName(t.full_name)
    setSubjectId(t.subject?.id ?? '')
    setPhone(t.phone ?? '')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !subjectId) return
    setSaving(true)

    const payload = {
      full_name: fullName.trim(),
      subject_id: Number(subjectId),
      phone: phone.trim() || null,
      active: true,
    }

    if (editing) {
      const { error } = await supabase.from('teachers').update(payload).eq('id', editing.id)
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تم تعديل بيانات المدرس ✓', 'success')
    } else {
      const extKey = `TEA-${Date.now().toString(36).toUpperCase()}`
      const { error } = await supabase.from('teachers').insert({ ...payload, external_key: extKey })
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تمت إضافة المدرس ✓', 'success')
    }

    setShowForm(false)
    setEditing(null)
    await load()
    setSaving(false)
  }

  async function toggleActive(t: TeacherRow) {
    const newActive = !t.active
    const { error } = await supabase.from('teachers').update({ active: newActive }).eq('id', t.id)
    if (error) { showToast(`خطأ: ${error.message}`, 'error'); return }
    showToast(newActive ? 'تم تفعيل المدرس' : 'تم تعطيل المدرس', 'info')
    await load()
  }

  if (!ready || loading) return <Spinner />

  const activeCount = teachers.filter(t => t.active).length

  return (
    <div className="dash-page" dir="rtl">
      <div className="dash-toolbar">
        <div>
          <h2 className="dash-page-title">المدرسون</h2>
          <span className="muted">{activeCount} مدرس فعّال من أصل {teachers.length}</span>
        </div>
        {canEdit && (
          <button type="button" className="btn-publish-all" style={{ width: 'auto' }} onClick={startAdd}>
            + إضافة مدرس
          </button>
        )}
      </div>

      {showForm && (
        <form className="dash-form" onSubmit={handleSave}>
          <h3 className="dash-form-title">{editing ? 'تعديل بيانات المدرس' : 'إضافة مدرس جديد'}</h3>
          <div className="dash-form-grid">
            <label>
              <span>الاسم الكامل *</span>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="الاسم الثلاثي" />
            </label>
            <label>
              <span>الاختصاص (المادة الأساسية) *</span>
              <select className="admin-select" value={subjectId} onChange={e => setSubjectId(Number(e.target.value))} required>
                <option value="">اختر المادة…</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>
              <span>رقم الهاتف</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="+96478XXXXXXXX" />
            </label>
          </div>
          <div className="dash-form-actions">
            <button type="submit" disabled={saving}>{saving ? '…' : 'حفظ'}</button>
            <button type="button" className="icon-btn" onClick={() => { setShowForm(false); setEditing(null) }}>إلغاء</button>
          </div>
        </form>
      )}

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم الكامل</th>
              <th>الاختصاص</th>
              <th>الشعب المسندة</th>
              <th>الحالة</th>
              {canEdit && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, i) => (
              <tr key={t.id} className={!t.active ? 'dash-row-inactive' : ''}>
                <td className="muted">{i + 1}</td>
                <td><strong>{t.full_name}</strong></td>
                <td>{t.subject?.name ?? '—'}</td>
                <td className="muted">
                  {t.assignments.length > 0
                    ? [...new Set(t.assignments.map(a => a.section_label))].join(' ، ')
                    : '—'}
                </td>
                <td>
                  <span className={`dash-badge ${t.active ? 'dash-badge--ok' : 'dash-badge--off'}`}>
                    {t.active ? 'فعّال' : 'معطّل'}
                  </span>
                </td>
                {canEdit && (
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="icon-btn" onClick={() => startEdit(t)}>تعديل</button>
                    <button type="button" className="icon-btn" onClick={() => void toggleActive(t)}>
                      {t.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
