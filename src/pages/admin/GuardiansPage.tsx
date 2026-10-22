import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'
import { PageHeader } from '../../components/admin/PageHeader'
import { StatusBadge } from '../../components/admin/StatusBadge'
import {
  PlusIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
  TrashIcon,
} from '../../components/Icons'

interface GuardianRow {
  id: string
  full_name: string | null
  phone: string
  alt_phone: string | null
  active: boolean
  last_seen_at: string | null
  children: { student_id: number; student_name: string; section_label: string; relation: string | null }[]
}

interface StudentOpt {
  id: number
  label: string
}

export default function GuardiansPage() {
  const { ready, role } = useAdmin()
  const [guardians, setGuardians] = useState<GuardianRow[]>([])
  const [students, setStudents] = useState<StudentOpt[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<GuardianRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [altPhone, setAltPhone] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('')
  const [relation, setRelation] = useState('أب')
  const [saving, setSaving] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (!ready) return
    void load()
  }, [ready])

  async function load() {
    setLoading(true)
    const [gR, gsR, stuR] = await Promise.all([
      supabase.from('guardians')
        .select('id, full_name, phone, alt_phone, active, last_seen_at')
        .order('full_name'),
      supabase.from('guardian_students')
        .select('guardian_id, student_id, relation, student:students(id, full_name, section:sections(letter, stage:stages(name, branch)))'),
      supabase.from('students')
        .select('id, full_name, section:sections(letter, stage:stages(name, branch))')
        .eq('active', true)
        .order('full_name'),
    ])

    type RawGS = {
      guardian_id: string
      student_id: number
      relation: string | null
      student: { id: number; full_name: string; section: { letter: string; stage: { name: string; branch: string } } | null } | null
    }
    const chByG = new Map<string, { student_id: number; student_name: string; section_label: string; relation: string | null }[]>()
    for (const r of (gsR.data ?? []) as unknown as RawGS[]) {
      if (!r.student) continue
      const sec = r.student.section
      const secLabel = sec ? `${sec.stage.name} ${sec.stage.branch}/${sec.letter}` : ''
      const arr = chByG.get(r.guardian_id) ?? []
      arr.push({ student_id: r.student.id, student_name: r.student.full_name, section_label: secLabel, relation: r.relation })
      chByG.set(r.guardian_id, arr)
    }

    type RawStu = {
      id: number
      full_name: string
      section: { letter: string; stage: { name: string; branch: string } } | null
    }
    const stuList = (stuR.data ?? []) as unknown as RawStu[]
    setStudents(stuList.map(s => ({
      id: s.id,
      label: `${s.full_name}${s.section ? ` (${s.section.stage.name} ${s.section.stage.branch}/${s.section.letter})` : ''}`,
    })))

    type RawG = {
      id: string; full_name: string | null; phone: string
      alt_phone: string | null; active: boolean; last_seen_at: string | null
    }
    const rawG = (gR.data ?? []) as unknown as RawG[]
    setGuardians(rawG.map(g => ({
      ...g,
      children: chByG.get(g.id) ?? [],
    })))
    setLoading(false)
  }

  function startAdd() {
    setEditing(null)
    setFullName('')
    setPhone('+9647')
    setAltPhone('')
    setSelectedStudentId('')
    setRelation('أب')
    setShowForm(true)
  }

  function startEdit(g: GuardianRow) {
    setEditing(g)
    setFullName(g.full_name ?? '')
    setPhone(g.phone)
    setAltPhone(g.alt_phone ?? '')
    setSelectedStudentId(g.children[0]?.student_id ?? '')
    setRelation(g.children[0]?.relation ?? 'أب')
    setShowForm(true)
  }

  function formatIraqiPhone(raw: string): string {
    let p = raw.trim().replace(/\s+/g, '')
    if (p.startsWith('07')) p = '+964' + p.slice(1)
    else if (p.startsWith('7') && p.length === 10) p = '+964' + p
    return p
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = formatIraqiPhone(phone)
    if (!/^\+9647[0-9]{9}$/.test(cleanPhone)) {
      showToast('يرجى إدخال رقم هاتف عراقي صالح بصيغة (+9647XXXXXXXXX)', 'error')
      return
    }

    setSaving(true)

    if (editing) {
      const { error } = await supabase
        .from('guardians')
        .update({
          full_name: fullName.trim() || null,
          phone: cleanPhone,
          alt_phone: altPhone.trim() || null,
        })
        .eq('id', editing.id)

      if (error) {
        showToast(`خطأ: ${error.message}`, 'error')
        setSaving(false)
        return
      }

      // If student was selected and wasn't linked yet, insert link
      if (selectedStudentId) {
        await supabase.from('guardian_students').upsert({
          guardian_id: editing.id,
          student_id: Number(selectedStudentId),
          relation: relation.trim() || null,
        })
      }

      showToast('تم تحديث بيانات ولي الأمر ✓', 'success')
    } else {
      const extKey = `GUA-${Date.now().toString(36).toUpperCase()}`
      const { data: newG, error } = await supabase
        .from('guardians')
        .insert({
          external_key: extKey,
          full_name: fullName.trim() || null,
          phone: cleanPhone,
          alt_phone: altPhone.trim() || null,
          active: true,
        })
        .select('id')
        .single()

      if (error) {
        showToast(`خطأ: ${error.message}`, 'error')
        setSaving(false)
        return
      }

      if (newG?.id && selectedStudentId) {
        await supabase.from('guardian_students').insert({
          guardian_id: newG.id,
          student_id: Number(selectedStudentId),
          relation: relation.trim() || null,
        })
      }

      showToast('تمت إضافة ولي الأمر بنجاح ✓', 'success')
    }

    setShowForm(false)
    setEditing(null)
    await load()
    setSaving(false)
  }

  async function toggleActive(g: GuardianRow) {
    const newActive = !g.active
    const { error } = await supabase.from('guardians').update({ active: newActive }).eq('id', g.id)
    if (error) { showToast(`خطأ: ${error.message}`, 'error'); return }
    showToast(newActive ? 'تم تفعيل حساب ولي الأمر' : 'تم تعطيل حساب ولي الأمر', 'info')
    await load()
  }

  if (!ready || loading) return <Spinner />

  const activeCount = guardians.filter(g => g.active).length
  const q = search.trim()
  const filtered = guardians.filter(g => {
    if (!q) return true
    return (
      (g.full_name ?? '').includes(q) ||
      g.phone.includes(q) ||
      g.children.some(c => c.student_name.includes(q))
    )
  })

  return (
    <div className="dash-page" dir="rtl">
      <PageHeader
        title="دليل أولياء الأمور وربط الطلاب"
        subtitle={`عرض ${filtered.length} من أصل ${guardians.length} ولي أمر مسجل`}
        badgeText={`${activeCount} فعّال`}
        badgeVariant="blue"
        actions={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={startAdd}>
              <PlusIcon size={16} />
              <span>إضافة ولي أمر جديد</span>
            </button>
          ) : undefined
        }
      />

      <div className="dash-filters">
        <input
          className="search-input"
          placeholder="بحث بالاسم أو رقم الهاتف أو اسم الطالب…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <form className="dash-form" onSubmit={handleSave}>
          <h3 className="dash-form-title">
            {editing ? 'تعديل بيانات ولي الأمر' : 'إضافة ولي أمر جديد'}
          </h3>
          <div className="dash-form-grid">
            <label>
              <span>الاسم الكامل *</span>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="اسم ولي الأمر الثلاثي"
                required
              />
            </label>
            <label>
              <span>رقم الهاتف الأساسي *</span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                dir="ltr"
                placeholder="+9647XXXXXXXXX"
                required
              />
            </label>
            <label>
              <span>رقم هاتف بديل (اختياري)</span>
              <input
                value={altPhone}
                onChange={e => setAltPhone(e.target.value)}
                dir="ltr"
                placeholder="+9647XXXXXXXXX"
              />
            </label>
            <label>
              <span>ربط بطالب مسجل</span>
              <select
                className="admin-select"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">بدون ربط حالياً</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>صلة القرابة</span>
              <select
                className="admin-select"
                value={relation}
                onChange={e => setRelation(e.target.value)}
              >
                <option value="أب">أب</option>
                <option value="أم">أم</option>
                <option value="أخ">أخ</option>
                <option value="ولي أمر">ولي أمر</option>
              </select>
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
              <th>اسم ولي الأمر</th>
              <th>رقم الهاتف</th>
              <th>الأبناء والشعب</th>
              <th>الحالة</th>
              <th>آخر ظهور</th>
              {canEdit && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((g, i) => (
              <tr key={g.id} className={!g.active ? 'dash-row-inactive' : ''}>
                <td className="muted">{i + 1}</td>
                <td><strong>{g.full_name ?? '—'}</strong></td>
                <td dir="ltr" style={{ textAlign: 'right' }}>{g.phone}</td>
                <td>
                  {g.children.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.children.map((c, ci) => (
                        <span key={ci} className="badge">
                          {c.student_name} ({c.section_label}){c.relation ? ` - ${c.relation}` : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="muted">لا يوجد أبناء مرتبطين</span>
                  )}
                </td>
                <td>
                  <StatusBadge
                    variant={g.active ? 'active' : 'suspended'}
                    label={g.active ? 'فعّال' : 'معطّل'}
                  />
                </td>
                <td className="muted">
                  {g.last_seen_at
                    ? new Date(g.last_seen_at).toLocaleDateString('ar-IQ')
                    : 'لم يسجل دخول'}
                </td>
                {canEdit && (
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEdit(g)}
                      >
                        <EditIcon size={14} />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${g.active ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => void toggleActive(g)}
                      >
                        {g.active ? <TrashIcon size={14} /> : <CheckIcon size={14} />}
                        <span>{g.active ? 'تعطيل' : 'تفعيل'}</span>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
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
