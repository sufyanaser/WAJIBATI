import { useState, useEffect } from 'react'
import { supabase, isValidPhone } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'

interface GuardianRow {
  id: string
  full_name: string | null
  phone: string
  alt_phone: string | null
  active: boolean
  last_seen_at: string | null
  children: { student_name: string; section_label: string; relation: string | null }[]
}

export default function GuardiansPage() {
  const { ready, role } = useAdmin()
  const [guardians, setGuardians] = useState<GuardianRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<GuardianRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [altPhone, setAltPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (!ready) return
    void load()
  }, [ready])

  async function load() {
    setLoading(true)
    const [gR, gsR] = await Promise.all([
      supabase.from('guardians')
        .select('id, full_name, phone, alt_phone, active, last_seen_at')
        .order('full_name'),
      supabase.from('guardian_students')
        .select('guardian_id, relation, student:students(full_name, section:sections(letter, stage:stages(name, branch)))'),
    ])

    type RawGS = {
      guardian_id: string
      relation: string | null
      student: { full_name: string; section: { letter: string; stage: { name: string; branch: string } } | null } | null
    }
    const chByG = new Map<string, { student_name: string; section_label: string; relation: string | null }[]>()
    for (const r of (gsR.data ?? []) as unknown as RawGS[]) {
      if (!r.student) continue
      const sec = r.student.section
      const secLabel = sec ? `${sec.stage.name} ${sec.stage.branch}/${sec.letter}` : ''
      const arr = chByG.get(r.guardian_id) ?? []
      arr.push({ student_name: r.student.full_name, section_label: secLabel, relation: r.relation })
      chByG.set(r.guardian_id, arr)
    }

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

  function startEdit(g: GuardianRow) {
    setEditing(g)
    setFullName(g.full_name ?? '')
    setPhone(g.phone)
    setAltPhone(g.alt_phone ?? '')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !phone.trim()) return
    if (!isValidPhone(phone.trim())) {
      showToast('رقم الهاتف يجب أن يكون بصيغة 07XXXXXXXXX (11 رقماً)', 'error')
      return
    }
    setSaving(true)

    const { error } = await supabase
      .from('guardians')
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim(),
        alt_phone: altPhone.trim() || null,
      })
      .eq('id', editing.id)

    if (error) {
      showToast(`خطأ: ${error.message}`, 'error')
      setSaving(false)
      return
    }

    showToast('تم تحديث بيانات ولي الأمر ✓', 'success')
    setShowForm(false)
    setEditing(null)
    await load()
    setSaving(false)
  }

  if (!ready || loading) return <Spinner />

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
      <div className="dash-toolbar">
        <div>
          <h2 className="dash-page-title">أولياء الأمور</h2>
          <span className="muted">عرض {filtered.length} من أصل {guardians.length} ولي أمر</span>
        </div>
      </div>

      <div className="dash-filters">
        <input
          className="search-input"
          placeholder="بحث بالاسم أو رقم الهاتف أو اسم الطالب…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {showForm && editing && (
        <form className="dash-form" onSubmit={handleSave}>
          <h3 className="dash-form-title">تعديل بيانات ولي الأمر</h3>
          <div className="dash-form-grid">
            <label>
              <span>الاسم الكامل</span>
              <input value={fullName} onChange={e => setFullName(e.target.value)} />
            </label>
            <label>
              <span>رقم الهاتف *</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" required placeholder="07XXXXXXXXX" pattern="^07[0-9]{9}$" title="07 متبوعاً بـ 9 أرقام" />
            </label>
            <label>
              <span>رقم بديل</span>
              <input value={altPhone} onChange={e => setAltPhone(e.target.value)} dir="ltr" />
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
              <th>اسم ولي الأمر</th>
              <th>رقم الهاتف</th>
              <th>الأبناء والشعب</th>
              <th>آخر ظهور</th>
              {canEdit && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((g, i) => (
              <tr key={g.id}>
                <td className="muted">{i + 1}</td>
                <td><strong>{g.full_name ?? '—'}</strong></td>
                <td dir="ltr" style={{ textAlign: 'right' }}>{g.phone}</td>
                <td>
                  {g.children.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.children.map((c, ci) => (
                        <span key={ci} className="badge">
                          {c.student_name} ({c.section_label})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="muted">لا يوجد أبناء مرتبطين</span>
                  )}
                </td>
                <td className="muted">
                  {g.last_seen_at
                    ? new Date(g.last_seen_at).toLocaleDateString('ar-IQ')
                    : 'لم يسجل دخول'}
                </td>
                {canEdit && (
                  <td>
                    <button type="button" className="icon-btn" onClick={() => startEdit(g)}>تعديل</button>
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
