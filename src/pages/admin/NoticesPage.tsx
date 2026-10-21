import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Section { id: number; letter: string; stage: { name: string; branch: string } }
interface Notice {
  id: string; title: string; body: string | null
  priority: number; section_id: number | null
  publish_at: string; expires_at: string | null
}

export default function NoticesPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [nTitle, setNTitle] = useState('')
  const [nBody, setNBody] = useState('')
  const [nPri, setNPri] = useState(1)
  const [nSec, setNSec] = useState<number | ''>('')
  const [nExpires, setNExpires] = useState('')
  const [nSaving, setNSaving] = useState(false)

  useEffect(() => {
    supabase.from('sections')
      .select('id, letter, stage:stages(name, branch)')
      .order('letter')
      .then(({ data }) => setSections((data ?? []) as unknown as Section[]))

    loadNotices()
  }, [])

  async function loadNotices() {
    const { data } = await supabase.from('notices')
      .select('id, title, body, priority, section_id, publish_at, expires_at')
      .order('created_at', { ascending: false }).limit(30)
    setNotices((data ?? []) as unknown as Notice[])
  }

  async function addNotice(e: React.FormEvent) {
    e.preventDefault()
    if (!nTitle.trim()) return
    setNSaving(true)
    await supabase.from('notices').insert({
      title: nTitle.trim(),
      body: nBody.trim() || null,
      priority: nPri,
      section_id: nSec || null,
      publish_at: new Date().toISOString(),
      expires_at: nExpires ? new Date(nExpires + 'T23:59:59').toISOString() : null,
    })
    setNTitle(''); setNBody(''); setNPri(1); setNSec(''); setNExpires('')
    await loadNotices()
    setNSaving(false)
  }

  async function deleteNotice(id: string) {
    await supabase.from('notices').delete().eq('id', id)
    setNotices(p => p.filter(n => n.id !== id))
  }

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <form className="notice-form" onSubmit={addNotice}>
        <input placeholder="العنوان *" value={nTitle}
          onChange={e => setNTitle(e.target.value)} required />
        <textarea className="hw-textarea" rows={2} placeholder="النص (اختياري)"
          value={nBody} onChange={e => setNBody(e.target.value)} />
        <div className="admin-selectors">
          <select className="admin-select" value={nPri}
            onChange={e => setNPri(Number(e.target.value))}>
            <option value={1}>عادي</option>
            <option value={2}>مهم</option>
            <option value={3}>عاجل</option>
          </select>
          <select className="admin-select" value={nSec}
            onChange={e => setNSec(e.target.value ? Number(e.target.value) : '')}>
            <option value="">كل الشعب</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.stage.name} {s.stage.branch} / {s.letter}</option>
            ))}
          </select>
          <input type="date" className="admin-date" value={nExpires}
            onChange={e => setNExpires(e.target.value)} title="تاريخ انتهاء الإشعار" />
        </div>
        <button type="submit" disabled={nSaving}>{nSaving ? '…' : 'إضافة إشعار'}</button>
      </form>

      <div className="notices">
        {notices.map(n => (
          <div key={n.id} className={`notice p${n.priority}`}>
            <div className="notice-header">
              <strong>{n.title}</strong>
              <button className="btn-del" onClick={() => deleteNotice(n.id)}>✕</button>
            </div>
            {n.body && <p>{n.body}</p>}
            {n.section_id && <span className="badge">شعبة {n.section_id}</span>}
          </div>
        ))}
        {!notices.length && <p className="muted">لا إشعارات حالياً</p>}
      </div>
    </div>
  )
}
