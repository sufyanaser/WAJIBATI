import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'
import { PageHeader } from '../../components/admin/PageHeader'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { PlusIcon, EditIcon, CheckIcon, CloseIcon } from '../../components/Icons'

interface StudentRow {
  id: number
  full_name: string
  notes: string | null
  active: boolean
  section_id: number
  section_label: string
  guardians: { full_name: string | null; phone: string; relation: string | null }[]
}

interface SectionOpt { id: number; label: string }

export default function StudentsPage() {
  const { ready, role } = useAdmin()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [sections, setSections] = useState<SectionOpt[]>([])
  const [filterSec, setFilterSec] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StudentRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [sectionId, setSectionId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (!ready) return
    void load()
  }, [ready])

  async function load() {
    setLoading(true)
    const [stuR, secR, gsR] = await Promise.all([
      supabase.from('students')
        .select('id, full_name, notes, active, section_id, section:sections(letter, stage:stages(name, branch))')
        .order('full_name'),
      supabase.from('sections')
        .select('id, letter, stage:stages(name, branch)')
        .eq('active', true)
        .order('letter'),
      supabase.from('guardian_students')
        .select('student_id, relation, guardian:guardians(full_name, phone)'),
    ])

    type RawSec = { id: number; letter: string; stage: { name: string; branch: string } }
    const secs = (secR.data ?? []) as unknown as RawSec[]
    setSections(secs.map(s => ({ id: s.id, label: `${s.stage.name} ${s.stage.branch} / ${s.letter}` })))

    type RawGS = { student_id: number; relation: string | null; guardian: { full_name: string | null; phone: string } | null }
    const gsByStu = new Map<number, { full_name: string | null; phone: string; relation: string | null }[]>()
    for (const g of (gsR.data ?? []) as unknown as RawGS[]) {
      if (!g.guardian) continue
      const arr = gsByStu.get(g.student_id) ?? []
      arr.push({ full_name: g.guardian.full_name, phone: g.guardian.phone, relation: g.relation })
      gsByStu.set(g.student_id, arr)
    }

    type RawStu = {
      id: number; full_name: string; notes: string | null; active: boolean; section_id: number
      section: { letter: string; stage: { name: string; branch: string } } | null
    }
    const rawStudents = (stuR.data ?? []) as unknown as RawStu[]
    setStudents(rawStudents.map(s => ({
      id: s.id,
      full_name: s.full_name,
      notes: s.notes,
      active: s.active,
      section_id: s.section_id,
      section_label: s.section ? `${s.section.stage.name} ${s.section.stage.branch} / ${s.section.letter}` : '',
      guardians: gsByStu.get(s.id) ?? [],
    })))
    setLoading(false)
  }

  function startAdd() {
    setEditing(null)
    setFullName('')
    setSectionId(filterSec || sections[0]?.id || '')
    setNotes('')
    setShowForm(true)
  }

  function startEdit(s: StudentRow) {
    setEditing(s)
    setFullName(s.full_name)
    setSectionId(s.section_id)
    setNotes(s.notes ?? '')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !sectionId) return
    setSaving(true)

    const payload = {
      full_name: fullName.trim(),
      section_id: Number(sectionId),
      notes: notes.trim() || null,
      active: true,
    }

    if (editing) {
      const { error } = await supabase.from('students').update(payload).eq('id', editing.id)
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تم تعديل بيانات الطالب ✓', 'success')
    } else {
      const extKey = `STU-${Date.now().toString(36).toUpperCase()}`
      const { error } = await supabase.from('students').insert({ ...payload, external_key: extKey })
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تمت إضافة الطالب ✓', 'success')
    }

    setShowForm(false)
    setEditing(null)
    await load()
    setSaving(false)
  }

  if (!ready || loading) return <Spinner />

  const filtered = students.filter(s => {
    if (filterSec && s.section_id !== filterSec) return false
    if (search.trim() && !s.full_name.includes(search.trim())) return false
    return true
  })

  return (
    <div className="dash-page" dir="rtl">
      <PageHeader
        title="دليل الطلاب وقوائم الفصول"
        subtitle={`عرض ${filtered.length} من أصل ${students.length} طالب مسجل`}
        badgeText={`${students.length} طالب`}
        badgeVariant="blue"
        actions={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={startAdd}>
              <PlusIcon size={16} />
              <span>إضافة طالب جديد</span>
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="dash-filters">
        <input
          className="search-input"
          placeholder="بحث باسم الطالب…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="admin-select"
          style={{ width: 'auto', minWidth: 170 }}
          value={filterSec}
          onChange={e => setFilterSec(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">كل الشعب</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {showForm && (
        <form className="dash-form" onSubmit={handleSave}>
          <h3 className="dash-form-title">{editing ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
          <div className="dash-form-grid">
            <label>
              <span>الاسم الكامل *</span>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="الاسم الرباعي" />
            </label>
            <label>
              <span>الشعبة *</span>
              <select className="admin-select" value={sectionId} onChange={e => setSectionId(Number(e.target.value))} required>
                <option value="">اختر الشعبة…</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label>
              <span>ملاحظات</span>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري" />
            </label>
          </div>
          <div className="dash-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <CheckIcon size={16} />
              <span>{saving ? '…' : 'حفظ'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowForm(false); setEditing(null) }}
            >
              <CloseIcon size={16} />
              <span>إلغاء</span>
            </button>
          </div>
        </form>
      )}

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الطالب</th>
              <th>الشعبة</th>
              <th>ولي الأمر</th>
              <th>الحالة</th>
              {canEdit && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className={!s.active ? 'dash-row-inactive' : ''}>
                <td className="muted">{i + 1}</td>
                <td><strong>{s.full_name}</strong></td>
                <td><span className="badge">{s.section_label}</span></td>
                <td className="muted">
                  {s.guardians.length > 0
                    ? s.guardians.map(g => `${g.full_name ?? ''} (${g.phone})`).join(' ، ')
                    : 'غير مرتبط'}
                </td>
                <td>
                  <StatusBadge
                    variant={s.active ? 'active' : 'suspended'}
                    label={s.active ? 'فعّال' : 'معطّل'}
                  />
                </td>
                {canEdit && (
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => startEdit(s)}
                    >
                      <EditIcon size={14} />
                      <span>تعديل</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  لا توجد نتائج مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
