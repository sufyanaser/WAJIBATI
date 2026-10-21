import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── types ─────────────────────────────────────────────────────────────────────
interface Section { id: number; letter: string; stage: { name: string; branch: string } }
interface TtSlot {
  period: number
  subject: { id: number; name: string; color: string | null } | null
  teacher: { id: number; full_name: string } | null
}
interface HwRow {
  id: string; period: number; body: string
  status: 'draft' | 'published' | 'archived'
  attachments: { id: string; storage_path: string; mime: string }[]
}
interface Notice {
  id: string; title: string; body: string | null
  priority: number; section_id: number | null
  publish_at: string; expires_at: string | null
}
interface PSlot extends TtSlot {
  hw_id: string | null
  body: string
  status: 'draft' | 'published' | 'archived' | null
  dirty: boolean
  saving: boolean
  attaches: { id: string; storage_path: string; mime: string }[]
}

// ── helpers ───────────────────────────────────────────────────────────────────
const toISO = (d: Date) => d.toLocaleDateString('en-CA')

export default function Admin() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [secId, setSecId] = useState<number | null>(null)
  const [date, setDate] = useState(toISO(new Date()))
  const [slots, setSlots] = useState<PSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [tab, setTab] = useState<'واجبات' | 'إشعارات'>('واجبات')
  const [sectionLabel, setSectionLabel] = useState('')

  // notices form state
  const [notices, setNotices] = useState<Notice[]>([])
  const [nTitle, setNTitle] = useState('')
  const [nBody, setNBody] = useState('')
  const [nPri, setNPri] = useState(1)
  const [nSec, setNSec] = useState<number | ''>('')
  const [nExpires, setNExpires] = useState('')
  const [nSaving, setNSaving] = useState(false)

  // ── auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/admin/login'); return }
      const { data: adm } = await supabase.from('admins').select('role').maybeSingle()
      if (!adm) { await supabase.auth.signOut(); nav('/admin/login'); return }
      setReady(true)
      loadSections()
      loadNotices()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSections() {
    const { data } = await supabase.from('sections')
      .select('id, letter, stage:stages(name, branch)')
      .order('letter')
    if (data?.length) {
      setSections(data as unknown as Section[])
      setSecId((data[0] as unknown as Section).id)
    }
  }

  // ── timetable + existing homework ────────────────────────────────────────────
  const loadSlots = useCallback(async (sid: number, iso: string) => {
    setLoadingSlots(true)
    const weekday = new Date(iso + 'T00:00:00').getDay()
    const [ttR, hwR] = await Promise.all([
      supabase.from('timetable')
        .select('period, subject:subjects(id, name, color), teacher:teachers(id, full_name)')
        .eq('section_id', sid).eq('weekday', weekday).order('period'),
      supabase.from('homework')
        .select('id, period, body, status, attachments(id, storage_path, mime)')
        .eq('section_id', sid).eq('due_date', iso),
    ])
    const tt = (ttR.data ?? []) as unknown as TtSlot[]
    const hw = (hwR.data ?? []) as unknown as HwRow[]
    const hwMap = new Map(hw.map(r => [r.period, r]))
    setSlots(Array.from({ length: 6 }, (_, i) => {
      const period = i + 1
      const slot = tt.find(s => s.period === period)
      const ex = hwMap.get(period)
      return {
        period,
        subject: slot?.subject ?? null,
        teacher: slot?.teacher ?? null,
        hw_id: ex?.id ?? null,
        body: ex?.body ?? '',
        status: ex?.status ?? null,
        dirty: false,
        saving: false,
        attaches: ex?.attachments ?? [],
      }
    }))
    setLoadingSlots(false)
  }, [])

  useEffect(() => {
    if (!secId || !sections.length) return
    const sec = sections.find(s => s.id === secId)
    if (sec) setSectionLabel(`${sec.stage.name} ${sec.stage.branch} / ${sec.letter}`)
    loadSlots(secId, date)
  }, [secId, date, sections, loadSlots])

  // ── save / publish slot ───────────────────────────────────────────────────────
  async function saveSlot(i: number, publish: boolean) {
    if (!secId) return
    const s = slots[i]
    if (!s.body.trim()) return
    setSlots(p => p.map((r, j) => j === i ? { ...r, saving: true } : r))

    const payload = {
      section_id: secId, due_date: date, period: s.period,
      subject_id: s.subject?.id ?? null,
      teacher_id: s.teacher?.id ?? null,
      body: s.body,
      status: publish ? 'published' as const : 'draft' as const,
    }

    let newId = s.hw_id
    if (newId) {
      await supabase.from('homework').update(payload).eq('id', newId)
    } else {
      const { data } = await supabase.from('homework').insert(payload).select('id').single()
      newId = (data as { id: string } | null)?.id ?? null
    }

    if (publish && newId) {
      supabase.functions.invoke('send-push', {
        body: {
          section_id: secId,
          title: `واجبات ${sectionLabel}`,
          body: `حصة ${s.period}: ${s.body.slice(0, 80)}`,
          url: '/',
        },
      }).catch(() => { /* non-critical */ })
    }

    setSlots(p => p.map((r, j) => j === i
      ? { ...r, saving: false, dirty: false, hw_id: newId ?? r.hw_id, status: publish ? 'published' : 'draft' }
      : r))
  }

  async function publishAll() {
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].body.trim() && !slots[i].saving) await saveSlot(i, true)
    }
  }

  async function deleteHw(i: number) {
    const s = slots[i]
    if (!s.hw_id) return
    await supabase.from('homework').delete().eq('id', s.hw_id)
    setSlots(p => p.map((r, j) => j === i
      ? { ...r, hw_id: null, body: '', status: null, dirty: false, attaches: [] }
      : r))
  }

  // ── attachment upload ────────────────────────────────────────────────────────
  async function uploadFile(i: number, file: File) {
    const s = slots[i]
    if (!s.hw_id || !secId) return
    const path = `${secId}/${s.hw_id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: true })
    if (error) return
    await supabase.from('attachments').insert({ homework_id: s.hw_id, storage_path: path, mime: file.type })
    setSlots(p => p.map((r, j) => j === i
      ? { ...r, attaches: [...r.attaches, { id: `tmp-${Date.now()}`, storage_path: path, mime: file.type }] }
      : r))
  }

  // ── notices ───────────────────────────────────────────────────────────────────
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

  // ── render ────────────────────────────────────────────────────────────────────
  if (!ready) return <main className="screen" dir="rtl"><p className="muted">جارٍ التحقق…</p></main>

  const weekday = new Date(date + 'T00:00:00').getDay()
  const isWeekend = weekday === 5 || weekday === 6

  return (
    <main className="screen admin" dir="rtl">
      {/* top bar */}
      <div className="top-bar">
        <h1 className="app-title">لوحة الإدارة</h1>
        <button className="icon-btn"
          onClick={() => supabase.auth.signOut().then(() => nav('/admin/login'))}>خروج</button>
      </div>

      {/* tabs */}
      <nav className="child-tabs">
        {(['واجبات', 'إشعارات'] as const).map(t => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

      {/* ── homework tab ── */}
      {tab === 'واجبات' && (
        <>
          <div className="admin-selectors">
            <select className="admin-select" value={secId ?? ''}
              onChange={e => setSecId(Number(e.target.value))}>
              {sections.map(s => (
                <option key={s.id} value={s.id}>
                  {s.stage.name} {s.stage.branch} / {s.letter}
                </option>
              ))}
            </select>
            <input type="date" className="admin-date" value={date}
              onChange={e => setDate(e.target.value)} />
          </div>

          {isWeekend
            ? <p className="muted">هذا اليوم عطلة (جمعة أو سبت)</p>
            : loadingSlots
              ? <p className="muted">جارٍ التحميل…</p>
              : (
                <>
                  <div className="period-list">
                    {slots.map((s, i) => (
                      <div key={s.period}
                        className={'period-card' + (s.status === 'published' ? ' published' : '')}>
                        <div className="period-card-header">
                          <span className="period-num">حصة {s.period}</span>
                          {s.subject && (
                            <span className="subject-chip"
                              style={s.subject.color
                                ? { background: s.subject.color + '33', borderColor: s.subject.color }
                                : {}}>
                              {s.subject.name}
                            </span>
                          )}
                          {s.teacher && <span className="teacher-name">{s.teacher.full_name}</span>}
                          {s.status && (
                            <span className={'status-badge ' + s.status}>
                              {s.status === 'published' ? 'منشور' : s.status === 'draft' ? 'مسودة' : 'مؤرشف'}
                            </span>
                          )}
                        </div>

                        <textarea className="hw-textarea" rows={3} placeholder="نص الواجب…"
                          value={s.body}
                          onChange={e => setSlots(p => p.map((r, j) =>
                            j === i ? { ...r, body: e.target.value, dirty: true } : r))} />

                        {s.attaches.length > 0 && (
                          <div className="attachments">
                            {s.attaches.map((a, ai) => (
                              <span key={ai} className="attach-link">
                                {a.mime.startsWith('image/') ? '🖼' : '📄'} {a.storage_path.split('/').pop()}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="period-actions">
                          <button className="btn-save"
                            disabled={s.saving || !s.body.trim()}
                            onClick={() => saveSlot(i, false)}>
                            {s.saving ? '…' : 'مسودة'}
                          </button>
                          <button className="btn-publish"
                            disabled={s.saving || !s.body.trim()}
                            onClick={() => saveSlot(i, true)}>
                            {s.saving ? '…' : 'نشر'}
                          </button>
                          {s.hw_id && (
                            <label className="btn-attach" title="إرفاق ملف">
                              📎
                              <input type="file" hidden
                                onChange={e => { if (e.target.files?.[0]) uploadFile(i, e.target.files[0]) }} />
                            </label>
                          )}
                          {s.hw_id && (
                            <button className="btn-del" onClick={() => deleteHw(i)} title="حذف">✕</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="btn-publish-all" onClick={publishAll}>
                    نشر الكل وإرسال إشعار
                  </button>
                </>
              )
          }
        </>
      )}

      {/* ── notices tab ── */}
      {tab === 'إشعارات' && (
        <>
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
        </>
      )}
    </main>
  )
}
