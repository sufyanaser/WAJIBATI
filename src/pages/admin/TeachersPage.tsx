import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Subject { id: number; name: string }
interface Teacher {
  id: number
  full_name: string
  phone: string | null
  active: boolean
  subject_id: number | null
  subject: Subject | null
}

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: 8,
  alignItems: 'center',
  padding: '10px 14px',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    const [t, s] = await Promise.all([
      supabase.from('teachers')
        .select('id, full_name, phone, active, subject_id, subject:subjects(id, name)')
        .order('full_name'),
      supabase.from('subjects').select('id, name').order('sort'),
    ])
    setTeachers((t.data ?? []) as unknown as Teacher[])
    setSubjects((s.data ?? []) as Subject[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(t: Teacher) {
    setEditId(t.id)
    setName(t.full_name)
    setPhone(t.phone ?? '')
    setSubjectId(t.subject_id ?? '')
    setErr('')
  }

  function cancelEdit() {
    setEditId(null); setName(''); setPhone(''); setSubjectId(''); setErr('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('الاسم مطلوب'); return }
    setSaving(true); setErr('')
    const payload = {
      full_name: name.trim(),
      phone: phone.trim() || null,
      subject_id: subjectId || null,
    }
    if (editId) {
      const { error } = await supabase.from('teachers').update(payload).eq('id', editId)
      if (error) { setErr(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('teachers').insert(payload)
      if (error) { setErr(error.message); setSaving(false); return }
    }
    cancelEdit(); await load(); setSaving(false)
  }

  async function toggleActive(t: Teacher) {
    await supabase.from('teachers').update({ active: !t.active }).eq('id', t.id)
    setTeachers(prev => prev.map(x => x.id === t.id ? { ...x, active: !x.active } : x))
  }

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>المدرسون</h2>

      <form onSubmit={save} style={{ display: 'grid', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="اسم المدرس *" value={name} onChange={e => setName(e.target.value)} required />
          <input placeholder="رقم الهاتف" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
        </div>
        <select value={subjectId} onChange={e => setSubjectId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">— المادة الرئيسية (اختياري) —</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1 }}>
            {saving ? '…' : editId ? 'حفظ التعديل' : 'إضافة مدرس'}
          </button>
          {editId && (
            <button type="button" className="icon-btn" onClick={cancelEdit}>إلغاء</button>
          )}
        </div>
      </form>

      {loading
        ? <p className="muted">جارٍ التحميل…</p>
        : teachers.length === 0
          ? <p className="muted">لا مدرسون مسجلون</p>
          : (
            <div style={{ display: 'grid', gap: 6 }}>
              {teachers.map(t => (
                <div key={t.id} style={{ ...rowStyle, opacity: t.active ? 1 : 0.5 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.full_name}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                      {t.subject?.name ?? '—'}{t.phone ? ` · ${t.phone}` : ''}
                    </div>
                  </div>
                  <button className="icon-btn" style={{ fontSize: '.8rem' }} onClick={() => startEdit(t)}>تعديل</button>
                  <button
                    className="icon-btn"
                    style={{ fontSize: '.8rem', color: t.active ? 'var(--muted)' : 'var(--accent)' }}
                    onClick={() => toggleActive(t)}
                  >
                    {t.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </div>
              ))}
            </div>
          )
      }
    </div>
  )
}
