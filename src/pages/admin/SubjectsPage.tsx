import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Subject { id: number; name: string; color: string | null; sort: number }

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  gap: 10,
  alignItems: 'center',
  padding: '10px 14px',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#1769D2')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    const { data } = await supabase.from('subjects').select('id, name, color, sort').order('sort')
    setSubjects((data ?? []) as Subject[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(s: Subject) {
    setEditId(s.id); setName(s.name); setColor(s.color ?? '#1769D2'); setErr('')
  }

  function cancel() { setEditId(null); setName(''); setColor('#1769D2'); setErr('') }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('الاسم مطلوب'); return }
    setSaving(true); setErr('')
    if (editId) {
      const { error } = await supabase.from('subjects').update({ name: name.trim(), color }).eq('id', editId)
      if (error) { setErr(error.message); setSaving(false); return }
    } else {
      const maxSort = subjects.reduce((m, s) => Math.max(m, s.sort), 0)
      const { error } = await supabase.from('subjects').insert({ name: name.trim(), color, sort: maxSort + 1 })
      if (error) { setErr(error.message); setSaving(false); return }
    }
    cancel(); await load(); setSaving(false)
  }

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>المواد الدراسية</h2>

      <form onSubmit={save} style={{ display: 'grid', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
          <input placeholder="اسم المادة *" value={name} onChange={e => setName(e.target.value)} required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '.78rem', color: 'var(--muted)' }}>اللون</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: 44, height: 38, padding: 2, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer' }} />
          </div>
        </div>
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1 }}>
            {saving ? '…' : editId ? 'حفظ التعديل' : 'إضافة مادة'}
          </button>
          {editId && <button type="button" className="icon-btn" onClick={cancel}>إلغاء</button>}
        </div>
      </form>

      {loading
        ? <p className="muted">جارٍ التحميل…</p>
        : (
          <div style={{ display: 'grid', gap: 6 }}>
            {subjects.map(s => (
              <div key={s.id} style={rowStyle}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: s.color ?? 'var(--muted)', flexShrink: 0
                }} />
                <span style={{ fontWeight: 500 }}>{s.name}</span>
                <button className="icon-btn" style={{ fontSize: '.8rem' }} onClick={() => startEdit(s)}>تعديل</button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
