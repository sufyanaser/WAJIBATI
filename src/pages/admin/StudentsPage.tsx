import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Section { id: number; letter: string; stage: { name: string; branch: string } }
interface Student {
  id: number
  full_name: string
  active: boolean
  section_id: number
  section: Section | null
}

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 8,
  alignItems: 'center',
  padding: '10px 14px',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [secId, setSecId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const [st, sec] = await Promise.all([
      supabase.from('students')
        .select('id, full_name, active, section_id, section:sections(id, letter, stage:stages(name, branch))')
        .order('full_name'),
      supabase.from('sections')
        .select('id, letter, stage:stages(name, branch)')
        .eq('active', true).order('letter'),
    ])
    setStudents((st.data ?? []) as unknown as Student[])
    setSections((sec.data ?? []) as unknown as Section[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !secId) { setErr('الاسم والشعبة مطلوبان'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('students').insert({ full_name: name.trim(), section_id: secId })
    if (error) { setErr(error.message); setSaving(false); return }
    setName(''); setSecId(''); await load(); setSaving(false)
  }

  async function toggleActive(s: Student) {
    await supabase.from('students').update({ active: !s.active }).eq('id', s.id)
    setStudents(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))
  }

  const visible = filter ? students.filter(s => s.section_id === Number(filter)) : students

  const sectionLabel = (s: Section | null) =>
    s ? `${s.stage.name} ${s.stage.branch} / ${s.letter}` : '—'

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>الطلاب</h2>

      <form onSubmit={add} style={{ display: 'grid', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="اسم الطالب *" value={name} onChange={e => setName(e.target.value)} required />
          <select value={secId} onChange={e => setSecId(e.target.value ? Number(e.target.value) : '')} required>
            <option value="">— اختر الشعبة —</option>
            {sections.map(s => <option key={s.id} value={s.id}>{sectionLabel(s)}</option>)}
          </select>
        </div>
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        <button type="submit" disabled={saving}>{saving ? '…' : 'إضافة طالب'}</button>
      </form>

      <select
        value={filter}
        onChange={e => setFilter(e.target.value ? Number(e.target.value) : '')}
        style={{ maxWidth: 240 }}
      >
        <option value="">جميع الشعب</option>
        {sections.map(s => <option key={s.id} value={s.id}>{sectionLabel(s)}</option>)}
      </select>

      {loading
        ? <p className="muted">جارٍ التحميل…</p>
        : visible.length === 0
          ? <p className="muted">لا طلاب في هذه الشعبة</p>
          : (
            <div style={{ display: 'grid', gap: 6 }}>
              {visible.map(s => (
                <div key={s.id} style={{ ...rowStyle, opacity: s.active ? 1 : 0.5 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                      {sectionLabel(s.section)}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    style={{ fontSize: '.8rem', color: s.active ? 'var(--muted)' : 'var(--accent)' }}
                    onClick={() => toggleActive(s)}
                  >
                    {s.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </div>
              ))}
            </div>
          )
      }
    </div>
  )
}
