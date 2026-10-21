import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Stage { id: number; name: string; branch: string }
interface Section {
  id: number; letter: string; active: boolean
  stage_id: number; stage: Stage | null
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

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [stageId, setStageId] = useState<number | ''>('')
  const [letter, setLetter] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const [sec, stg] = await Promise.all([
      supabase.from('sections')
        .select('id, letter, active, stage_id, stage:stages(id, name, branch)')
        .order('letter'),
      supabase.from('stages').select('id, name, branch').order('sort'),
    ])
    setSections((sec.data ?? []) as unknown as Section[])
    setStages((stg.data ?? []) as Stage[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!stageId || !letter.trim()) { setErr('الصف والحرف مطلوبان'); return }
    setSaving(true); setErr('')
    const { data: yr } = await supabase.from('academic_years').select('id').eq('is_current', true).single()
    if (!yr) { setErr('لا يوجد عام دراسي فعال'); setSaving(false); return }
    const { error } = await supabase.from('sections').insert({
      year_id: yr.id, stage_id: stageId, letter: letter.trim().toUpperCase()
    })
    if (error) { setErr(error.message); setSaving(false); return }
    setLetter(''); setStageId(''); await load(); setSaving(false)
  }

  async function toggleActive(s: Section) {
    await supabase.from('sections').update({ active: !s.active }).eq('id', s.id)
    setSections(prev => prev.map(x => x.id === s.id ? { ...x, active: !s.active } : x))
  }

  const sLabel = (s: Stage | null) => s ? `${s.name} ${s.branch}` : '—'

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>الشعب الدراسية</h2>

      <form onSubmit={add} style={{ display: 'grid', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
          <select value={stageId} onChange={e => setStageId(e.target.value ? Number(e.target.value) : '')} required>
            <option value="">— اختر الصف —</option>
            {stages.map(s => <option key={s.id} value={s.id}>{sLabel(s)}</option>)}
          </select>
          <input
            placeholder="الحرف (أ، ب، ج…)"
            value={letter}
            onChange={e => setLetter(e.target.value)}
            style={{ width: 100 }}
            maxLength={2}
            required
          />
        </div>
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        <button type="submit" disabled={saving}>{saving ? '…' : 'إضافة شعبة'}</button>
      </form>

      {loading
        ? <p className="muted">جارٍ التحميل…</p>
        : (
          <div style={{ display: 'grid', gap: 6 }}>
            {sections.map(s => (
              <div key={s.id} style={{ ...rowStyle, opacity: s.active ? 1 : 0.5 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{sLabel(s.stage)}</span>
                  <span style={{ color: 'var(--muted)' }}> / {s.letter}</span>
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
