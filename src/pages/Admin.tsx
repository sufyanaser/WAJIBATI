import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchSubjects } from '../lib/subjects'
import type { Subject } from '../lib/subjects'
import { validateFile } from '../lib/attachmentUtils'

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
  uploading: boolean
  error: string | null
  selectedSubjectId: number | null
  attaches: { id: string; storage_path: string; mime: string }[]
  pendingFiles: File[]
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
  const [tab, setTab] = useState<'واجبات' | 'إشعارات' | 'استيراد'>('واجبات')
  const [sectionLabel, setSectionLabel] = useState('')

  const [subjects, setSubjects] = useState<Subject[]>([])

  // import tab state
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: { row: number; message: string }[] } | null>(null)
  const [importing, setImporting] = useState(false)

  // reset-pin state
  const [resetPhone, setResetPhone] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetting, setResetting] = useState(false)

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
      const { data: adm } = await supabase.from('admins').select('role').eq('user_id', data.session.user.id).maybeSingle()
      if (!adm) { await supabase.auth.signOut(); nav('/admin/login'); return }
      setReady(true)
      loadSections()
      loadNotices()
      fetchSubjects().then(setSubjects)
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
        uploading: false,
        error: null,
        selectedSubjectId: (ex as unknown as { subject_id?: number } | undefined)?.subject_id
          ?? slot?.subject?.id
          ?? null,
        attaches: ex?.attachments ?? [],
        pendingFiles: [],
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

  // ── attachment upload ─────────────────────────────────────────────────────────
  async function uploadFile(slotIdx: number, file: File, hwId: string): Promise<void> {
    if (!secId) return
    setSlots(p => p.map((r, j) => j === slotIdx ? { ...r, uploading: true, error: null } : r))
    const path = `${secId}/${hwId}/${Date.now()}_${file.name}`
    const { error: storErr } = await supabase.storage
      .from('attachments').upload(path, file, { upsert: true })
    if (storErr) {
      setSlots(p => p.map((r, j) => j === slotIdx ? { ...r, uploading: false, error: storErr.message } : r))
      return
    }
    const { data: row, error: dbErr } = await supabase.from('attachments')
      .insert({ homework_id: hwId, storage_path: path, mime: file.type })
      .select('id').single()
    if (dbErr || !row) {
      // Storage succeeded but DB failed — clean up orphaned storage object
      await supabase.storage.from('attachments').remove([path])
      setSlots(p => p.map((r, j) => j === slotIdx
        ? { ...r, uploading: false, error: dbErr?.message ?? 'فشل حفظ المرفق في قاعدة البيانات' }
        : r))
      return
    }
    const newAttId = (row as { id: string }).id
    setSlots(p => p.map((r, j) => j === slotIdx
      ? { ...r, uploading: false, error: null,
          attaches: [...r.attaches, { id: newAttId, storage_path: path, mime: file.type }] }
      : r))
  }

  function handleFileSelect(slotIdx: number, file: File) {
    const s = slots[slotIdx]
    const err = validateFile(file)
    if (err) {
      setSlots(p => p.map((r, j) => j === slotIdx ? { ...r, error: err } : r))
      return
    }
    if (s.attaches.length + s.pendingFiles.length >= 5) {
      setSlots(p => p.map((r, j) => j === slotIdx ? { ...r, error: 'الحد الأقصى 5 مرفقات' } : r))
      return
    }
    if (s.hw_id) {
      void uploadFile(slotIdx, file, s.hw_id)
    } else {
      // Queue until hw_id is available (card not yet saved)
      setSlots(p => p.map((r, j) => j === slotIdx
        ? { ...r, pendingFiles: [...r.pendingFiles, file], error: null }
        : r))
    }
  }

  async function deleteAttachment(slotIdx: number, attachId: string, storagePath: string) {
    setSlots(p => p.map((r, j) => j === slotIdx ? { ...r, uploading: true } : r))
    const { error: storErr } = await supabase.storage.from('attachments').remove([storagePath])
    if (storErr) {
      setSlots(p => p.map((r, j) => j === slotIdx ? { ...r, uploading: false, error: storErr.message } : r))
      return
    }
    const { error: dbErr } = await supabase.from('attachments').delete().eq('id', attachId)
    if (dbErr) {
      setSlots(p => p.map((r, j) => j === slotIdx ? { ...r, uploading: false, error: dbErr.message } : r))
      return
    }
    setSlots(p => p.map((r, j) => j === slotIdx
      ? { ...r, uploading: false, attaches: r.attaches.filter(a => a.id !== attachId) }
      : r))
  }

  function removePendingFile(slotIdx: number, fileIdx: number) {
    setSlots(p => p.map((r, j) => j === slotIdx
      ? { ...r, pendingFiles: r.pendingFiles.filter((_, k) => k !== fileIdx) }
      : r))
  }

  // ── save / publish slot ───────────────────────────────────────────────────────
  async function saveSlot(i: number, publish: boolean) {
    if (!secId) return
    const s = slots[i]
    if (!s.body.trim()) return
    if (!s.selectedSubjectId) {
      setSlots(p => p.map((r, j) => j === i ? { ...r, error: 'يجب اختيار المادة' } : r))
      return
    }
    setSlots(p => p.map((r, j) => j === i ? { ...r, saving: true, error: null } : r))

    const payload = {
      section_id: secId, due_date: date, period: s.period,
      subject_id: s.selectedSubjectId,
      teacher_id: s.teacher?.id ?? null,
      body: s.body,
      status: publish ? 'published' as const : 'draft' as const,
    }

    let newId = s.hw_id
    if (newId) {
      const { error: updErr } = await supabase.from('homework').update(payload).eq('id', newId)
      if (updErr) {
        setSlots(p => p.map((r, j) => j === i ? { ...r, saving: false, error: updErr.message } : r))
        return
      }
    } else {
      const { data, error: insErr } = await supabase.from('homework').insert(payload).select('id').single()
      if (insErr || !data) {
        setSlots(p => p.map((r, j) => j === i ? { ...r, saving: false, error: insErr?.message ?? 'خطأ في الحفظ' } : r))
        return
      }
      newId = (data as { id: string }).id
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

    // Capture pending files before clearing state
    const pendingToUpload = slots[i].pendingFiles

    setSlots(p => p.map((r, j) => j === i
      ? { ...r, saving: false, dirty: false, error: null,
          hw_id: newId ?? r.hw_id,
          status: publish ? 'published' : 'draft',
          pendingFiles: [] }
      : r))

    // Flush pending files now that hw_id exists
    if (newId && pendingToUpload.length > 0) {
      for (const file of pendingToUpload) {
        await uploadFile(i, file, newId)
      }
    }
  }

  async function publishAll() {
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].body.trim() && !slots[i].saving) await saveSlot(i, true)
    }
  }

  async function deleteHw(i: number) {
    const s = slots[i]
    if (!s.hw_id) return
    const { error } = await supabase.from('homework').delete().eq('id', s.hw_id)
    if (error) return
    setSlots(p => p.map((r, j) => j === i
      ? { ...r, hw_id: null, body: '', status: null, dirty: false, error: null,
          attaches: [], pendingFiles: [] }
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

  // ── import CSV ────────────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const form = new FormData()
    form.append('file', file)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await supabase.functions.invoke('import-guardians', { body: form })
    if (res.error) {
      setImportResult({ created: 0, skipped: 0, errors: [{ row: 0, message: res.error.message }] })
    } else {
      setImportResult(res.data as typeof importResult)
    }
    setImporting(false)
    e.target.value = ''
    void session // suppress unused warning
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault()
    if (!resetPhone.trim() || !resetPin.trim()) return
    setResetting(true)
    setResetMsg('')
    const res = await supabase.functions.invoke('reset-pin', {
      body: { phone: resetPhone.trim(), new_pin: resetPin.trim() },
    })
    setResetMsg(res.error ? `خطأ: ${res.error.message}` : 'تم تحديث الـ PIN بنجاح ✓')
    setResetting(false)
    if (!res.error) { setResetPhone(''); setResetPin('') }
  }

  // ── CSV template download ─────────────────────────────────────────────────────
  function downloadTemplate() {
    const header = 'student_name,stage,branch,section,guardian_name,phone,pin'
    const example = 'عمر أحمد محمد,الرابع,علمي,أ,أحمد محمد الدليمي,+9647801234567,123456'
    const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'import_template.csv'
    a.click()
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
        {(['واجبات', 'إشعارات', 'استيراد'] as const).map(t => (
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
                          {s.teacher && <span className="teacher-name">{s.teacher.full_name}</span>}
                          {s.status && (
                            <span className={'status-badge ' + s.status}>
                              {s.status === 'published' ? 'منشور' : s.status === 'draft' ? 'مسودة' : 'مؤرشف'}
                            </span>
                          )}
                        </div>

                        {/* Subject dropdown — works without timetable */}
                        <select
                          className="admin-select subject-select"
                          value={s.selectedSubjectId ?? ''}
                          onChange={e => setSlots(p => p.map((r, j) =>
                            j === i ? { ...r, selectedSubjectId: e.target.value ? Number(e.target.value) : null, error: null } : r))}
                        >
                          <option value="">-- اختر المادة --</option>
                          {subjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>

                        <textarea className="hw-textarea" rows={3} placeholder="نص الواجب…"
                          value={s.body}
                          onChange={e => setSlots(p => p.map((r, j) =>
                            j === i ? { ...r, body: e.target.value, dirty: true } : r))} />

                        {s.error && <p className="slot-error" role="alert">{s.error}</p>}
                        {s.uploading && <p className="slot-uploading">جارٍ رفع المرفق…</p>}

                        {/* Committed attachments */}
                        {s.attaches.length > 0 && (
                          <div className="attachments" aria-label="مرفقات محفوظة">
                            {s.attaches.map((a) => (
                              <span key={a.id} className="attach-item">
                                {a.mime.startsWith('image/') ? '🖼' : '📄'} {a.storage_path.split('/').pop()}
                                <button
                                  className="attach-del"
                                  title="حذف المرفق"
                                  disabled={s.uploading}
                                  onClick={() => deleteAttachment(i, a.id, a.storage_path)}
                                >✕</button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Pending attachments (queued, not yet uploaded) */}
                        {s.pendingFiles.length > 0 && (
                          <div className="attachments" aria-label="مرفقات معلقة">
                            {s.pendingFiles.map((f, fi) => (
                              <span key={fi} className="attach-item attach-pending">
                                {f.type.startsWith('image/') ? '🖼' : '📄'} {f.name}
                                <span className="attach-pending-label">معلق</span>
                                <button
                                  className="attach-del"
                                  title="إزالة"
                                  onClick={() => removePendingFile(i, fi)}
                                >✕</button>
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

                          {/* Three separate attachment actions */}
                          <div className="attach-actions">
                            <label className="btn-attach" title="إرفاق صورة من المعرض">
                              🖼
                              <input type="file" accept="image/*" hidden
                                onChange={e => {
                                  if (e.target.files?.[0]) handleFileSelect(i, e.target.files[0])
                                  e.target.value = ''
                                }} />
                            </label>
                            <label className="btn-attach" title="التقاط صورة">
                              📷
                              <input type="file" accept="image/*" capture="environment" hidden
                                onChange={e => {
                                  if (e.target.files?.[0]) handleFileSelect(i, e.target.files[0])
                                  e.target.value = ''
                                }} />
                            </label>
                            <label className="btn-attach" title="إرفاق مستند PDF أو Word">
                              📄
                              <input type="file"
                                accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                hidden
                                onChange={e => {
                                  if (e.target.files?.[0]) handleFileSelect(i, e.target.files[0])
                                  e.target.value = ''
                                }} />
                            </label>
                          </div>

                          {s.hw_id && (
                            <button className="btn-del" onClick={() => deleteHw(i)} title="حذف الواجب">✕</button>
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
      {/* ── import tab ── */}
      {tab === 'استيراد' && (
        <>
          <div className="import-section">
            <h2 className="import-heading">استيراد الطلاب وأولياء الأمور</h2>
            <p className="muted">ارفع ملف CSV يحتوي على بيانات الطلاب وأولياء الأمور.</p>
            <button className="icon-btn" style={{ width: '100%', marginBottom: 8 }} onClick={downloadTemplate}>
              ⬇ تنزيل قالب CSV
            </button>
            <label className="btn-publish-all" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
              {importing ? 'جارٍ الاستيراد…' : '📂 اختر ملف CSV للاستيراد'}
              <input type="file" accept=".csv,text/csv" hidden disabled={importing}
                onChange={handleImport} />
            </label>
          </div>

          {importResult && (
            <div className="import-result">
              <p className="import-stat">✅ تم إنشاء: <strong>{importResult.created}</strong></p>
              <p className="import-stat">⏭ موجود مسبقاً: <strong>{importResult.skipped}</strong></p>
              {importResult.errors.length > 0 && (
                <div className="import-errors">
                  <p className="import-err-title">أخطاء ({importResult.errors.length}):</p>
                  {importResult.errors.map((er, i) => (
                    <p key={i} className="import-err-row">
                      سطر {er.row}: {er.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <hr className="import-divider" />

          <div className="import-section">
            <h2 className="import-heading">إعادة تعيين PIN</h2>
            <form className="notice-form" onSubmit={handleResetPin}>
              <input placeholder="رقم الهاتف (+9647XXXXXXXXX)" value={resetPhone}
                onChange={e => setResetPhone(e.target.value)} dir="ltr" />
              <input placeholder="PIN الجديد (6 أرقام)" value={resetPin} maxLength={6}
                onChange={e => setResetPin(e.target.value)} dir="ltr" />
              <button type="submit" disabled={resetting || !resetPhone || !resetPin}>
                {resetting ? '…' : 'تحديث الـ PIN'}
              </button>
            </form>
            {resetMsg && <p className={resetMsg.startsWith('خطأ') ? 'err' : 'muted'}>{resetMsg}</p>}
          </div>
        </>
      )}
    </main>
  )
}
