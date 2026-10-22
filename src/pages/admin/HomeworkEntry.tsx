import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdminSection } from '../../hooks/useAdminSection'
import type { AttachmentRow } from '../../hooks/useAdminSection'
import { DateNavigator } from '../../components/DateNavigator'
import { Toast, useToast } from '../../components/Toast'

// ── types ──────────────────────────────────────────────────────────────────────

interface Section { id: number; letter: string; stage: { name: string; branch: string } }
interface SubjectOpt { id: number; name: string }
interface TeacherOpt { id: number; full_name: string; subject_id: number | null }
interface TeachingAssignOpt { section_id: number; subject_id: number; teacher_id: number }

// ── AttachmentRow subcomponent ─────────────────────────────────────────────────

interface AttachmentChipsProps {
  hwId: string | null
  attachments: AttachmentRow[]
  period: number
  onUpload: (period: number, file: File) => Promise<{ ok: boolean; error?: string }>
  onDelete: (period: number, id: string, path: string) => Promise<{ ok: boolean; error?: string }>
  showToast: (msg: string, type: 'error' | 'success' | 'info') => void
}

function AttachmentChips({ hwId, attachments, period, onUpload, onDelete, showToast }: AttachmentChipsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null) // 'upload' | attachment id
  const [failedFile, setFailedFile] = useState<{ file: File; error: string } | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy('upload')
    const result = await onUpload(period, files[0])
    setBusy(null)
    if (inputRef.current) inputRef.current.value = ''
    if (!result.ok) {
      setFailedFile({ file: files[0], error: result.error ?? 'فشل الرفع' })
      showToast(result.error ?? 'فشل الرفع', 'error')
    } else {
      setFailedFile(null)
    }
  }

  async function handleDelete(id: string, path: string) {
    setBusy(id)
    await onDelete(period, id, path)
    setBusy(null)
  }

  const label = (mime: string, path: string) => {
    const name = path.split('/').pop() ?? 'مرفق'
    return mime.startsWith('image/') ? `🖼 ${name}` : `📄 ${name}`
  }

  return (
    <div className="he-attachments">
      {attachments.map(a => (
        <span key={a.id} className="he-attach-chip">
          <span className="he-attach-label">{label(a.mime, a.storage_path)}</span>
          <button
            className="he-attach-del"
            disabled={busy === a.id}
            onClick={() => handleDelete(a.id, a.storage_path)}
            aria-label="حذف المرفق"
          >
            {busy === a.id ? '…' : '×'}
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
      {failedFile && (
        <button
          className="he-retry-btn"
          disabled={busy === 'upload'}
          onClick={async () => {
            setBusy('upload')
            const result = await onUpload(period, failedFile.file)
            setBusy(null)
            if (inputRef.current) inputRef.current.value = ''
            if (result.ok) {
              setFailedFile(null)
            } else {
              setFailedFile(prev => prev ? { ...prev, error: result.error ?? 'فشل الرفع' } : null)
              showToast(result.error ?? 'فشل الرفع', 'error')
            }
          }}
        >
          {busy === 'upload' ? '…' : '↩ أعد المحاولة'}
        </button>
      )}
      <button
        className="he-upload-btn"
        disabled={!hwId || busy === 'upload'}
        title={!hwId ? 'احفظ الواجب أولاً لإضافة مرفقات' : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {busy === 'upload' ? '…' : '+ مرفق'}
      </button>
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────────

const toISO = (d: Date) => d.toLocaleDateString('en-CA')

function firstWorkday(d: Date): Date {
  const day = d.getDay()
  if (day === 5) return new Date(d.getTime() + 2 * 864e5)
  if (day === 6) return new Date(d.getTime() + 864e5)
  return d
}

// ── status badge ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'draft' | 'published' | 'archived' | null }) {
  if (status === 'published') return <span className="he-status he-status--published">منشور</span>
  if (status === 'draft') return <span className="he-status he-status--draft">مسودة</span>
  return <span className="he-status he-status--empty">فارغ</span>
}

// ── component ──────────────────────────────────────────────────────────────────

export default function HomeworkEntry() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<SubjectOpt[]>([])
  const [teachers, setTeachers] = useState<TeacherOpt[]>([])
  const [assignments, setAssignments] = useState<TeachingAssignOpt[]>([])
  const [secId, setSecId] = useState<number | null>(null)
  const [date, setDate] = useState<Date>(() => firstWorkday(new Date()))
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishingPeriod, setPublishingPeriod] = useState<number | null>(null)
  const { toast, show: showToast, clear: clearToast } = useToast()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/admin/login'); return }
      const { data: adm } = await supabase.from('admins').select('role').eq('user_id', data.session.user.id).maybeSingle()
      if (!adm) { await supabase.auth.signOut(); nav('/admin/login'); return }
      setReady(true)
    })
  }, [nav])

  useEffect(() => {
    if (!ready) return
    Promise.all([
      supabase.from('sections').select('id, letter, stage:stages(name, branch)').eq('active', true).order('letter'),
      supabase.from('subjects').select('id, name').order('sort'),
      supabase.from('teachers').select('id, full_name, subject_id').eq('active', true).order('full_name'),
      supabase.from('teaching_assignments').select('section_id, subject_id, teacher_id').eq('active', true),
    ]).then(([secR, subR, teaR, taR]) => {
      if (secR.data?.length) {
        setSections(secR.data as unknown as Section[])
        setSecId((secR.data[0] as unknown as Section).id)
      }
      setSubjects((subR.data ?? []) as SubjectOpt[])
      setTeachers((teaR.data ?? []) as TeacherOpt[])
      setAssignments((taR.data ?? []) as TeachingAssignOpt[])
    })
  }, [ready])

  const {
    periods,
    loading,
    setBodies,
    setPeriodSubject,
    deleteHomework,
    save,
    publish,
    uploadAttachment,
    deleteAttachment,
  } = useAdminSection(
    secId !== null ? String(secId) : '',
    toISO(date),
  )

  function handleManualSubjectSelect(period: number, nextSubjectIdStr: string) {
    if (!nextSubjectIdStr) {
      setPeriodSubject(period, null, '', null, '')
      return
    }
    const subId = Number(nextSubjectIdStr)
    const sub = subjects.find(s => s.id === subId)
    // Auto-assign teacher from teaching_assignments for (secId, subId), or fallback to teachers.subject_id
    const assigned = secId
      ? assignments.find(a => a.section_id === secId && a.subject_id === subId)
      : undefined
    const teacherObj = assigned
      ? teachers.find(t => t.id === assigned.teacher_id)
      : teachers.find(t => t.subject_id === subId)
    setPeriodSubject(
      period,
      subId,
      sub?.name ?? '',
      teacherObj?.id ?? null,
      teacherObj?.full_name ?? '',
    )
  }

  async function handleSaveDraft() {
    setSaving(true)
    try {
      const result = await save()
      if (result.failed > 0) {
        showToast(`حُفظ ${result.saved} — فشل ${result.failed}: ${result.errors[0]}`, 'error')
      } else {
        showToast('تم الحفظ ✓', 'success')
      }
    } catch {
      showToast('خطأ أثناء الحفظ', 'error')
    }
    setSaving(false)
  }

  async function handlePublishPeriod(period: number) {
    const slot = periods.find(p => p.period === period)
    if (!slot?.hw_id || secId === null) return
    setPublishingPeriod(period)
    const { error } = await supabase
      .from('homework')
      .update({ status: 'published', body: slot.body.trim() })
      .eq('id', slot.hw_id)
    if (error) {
      showToast(`حصة ${period}: ${error.message}`, 'error')
      setPublishingPeriod(null)
      return
    }
    try {
      const { error: pushErr } = await supabase.functions.invoke('send-push', {
        body: {
          section_id: secId,
          title: 'واجباتي',
          body: `واجب جديد — ${slot.subject || `حصة ${period}`} بتاريخ ${toISO(date)}`,
          url: '/',
        },
      })
      if (pushErr) {
        showToast(`نُشرت حصة ${period} — تعذر إرسال الإشعار`, 'info')
      } else {
        showToast(`تم نشر حصة ${period} ✓`, 'success')
      }
    } catch {
      showToast(`نُشرت حصة ${period} — تعذر إرسال الإشعار`, 'info')
    }
    // Refresh by re-triggering date state
    setDate(d => new Date(d.getTime()))
    setPublishingPeriod(null)
  }

  async function handleDeletePeriod(period: number) {
    if (!confirm(`هل تريد حذف واجب الحصة ${period}؟`)) return
    const res = await deleteHomework(period)
    if (!res.ok) {
      showToast(res.error ?? 'تعذر حذف الواجب', 'error')
    } else {
      showToast(`تم حذف واجب الحصة ${period}`, 'info')
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const result = await publish()
      if (result.saved === 0) {
        showToast('لم يُنشر أي واجب — ' + (result.errors[0] ?? ''), 'error')
      } else if (result.failed > 0) {
        showToast(`نُشر ${result.saved} — فشل ${result.failed}`, 'error')
      } else if (!result.pushSent) {
        showToast(`تم النشر (${result.saved}) — فشل إرسال الإشعار`, 'info')
      } else {
        showToast(`تم النشر وإرسال الإشعارات (${result.saved})`, 'success')
      }
    } catch {
      showToast('خطأ أثناء النشر', 'error')
    }
    setPublishing(false)
  }

  if (!ready) {
    return (
      <div style={{ padding: 24 }} dir="rtl">
        <p className="muted">جارٍ التحقق…</p>
      </div>
    )
  }

  const publishedCount = periods.filter(p => p.status === 'published').length
  const draftCount = periods.filter(p => p.status === 'draft').length
  const filledCount = periods.filter(p => p.body.trim().length > 0).length
  const currentSec = sections.find(s => s.id === secId)

  return (
    <div dir="rtl" className="homework-entry">

      {/* ── Section Selector + Date Navigator + Summary Strip ──── */}
      <section className="he-controls-card">
        <div className="he-controls-grid">
          <select
            className="admin-select"
            value={secId ?? ''}
            onChange={e => setSecId(Number(e.target.value))}
            aria-label="اختر الشعبة"
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>
                {s.stage.name} {s.stage.branch} / {s.letter}
              </option>
            ))}
          </select>

          <DateNavigator date={date} onChange={setDate} />
        </div>

        <div className="he-summary-strip">
          <span>
            {currentSec ? `الشعبة الحالية: ${currentSec.stage.name} ${currentSec.stage.branch} / ${currentSec.letter}` : 'اختر الشعبة'}
          </span>
          <div className="he-summary-metrics">
            <span className="badge-success he-status he-status--published">منشور: {publishedCount}</span>
            <span className="badge-warn he-status he-status--draft">مسودة: {draftCount}</span>
            <span className="badge-muted he-status he-status--empty">مملوء: {filledCount} / {periods.length || 6}</span>
          </div>
        </div>
      </section>

      {/* ── Sticky Batch Action Bar ───────────────────────────── */}
      <div className="he-action-bar">
        <button
          type="button"
          className="he-btn-draft"
          disabled={saving || publishing || loading}
          onClick={handleSaveDraft}
        >
          {saving ? '…' : 'حفظ مسودة'}
        </button>
        <button
          type="button"
          className="btn-publish-all he-btn-publish"
          disabled={saving || publishing || loading}
          onClick={handlePublish}
        >
          {publishing ? '…' : 'نشر الكل'}
        </button>
      </div>

      {/* ── Timetable Grid ────────────────────────────────────── */}
      {loading ? (
        <p className="muted">جارٍ التحميل…</p>
      ) : (
        <div className="he-timetable">
          {periods.map(slot => (
            <div key={slot.period} className="he-period-row">

              {/* RIGHT cell — period meta */}
              <div className="he-period-meta">
                <span className="he-period-num">حصة {slot.period}</span>
                {slot.subject ? (
                  <span className="he-subject-name">{slot.subject}</span>
                ) : (
                  <select
                    className="admin-select"
                    style={{ fontSize: '.76rem', padding: '4px 8px', minHeight: 32 }}
                    aria-label={`اختر مادة الحصة ${slot.period}`}
                    value={slot.subject_id ?? ''}
                    onChange={e => handleManualSubjectSelect(slot.period, e.target.value)}
                  >
                    <option value="">+ اختر مادة</option>
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                )}
                {slot.teacher && (
                  <span className="he-teacher-name">{slot.teacher}</span>
                )}
                <StatusDot status={slot.status} />
                {slot.status === 'draft' && slot.hw_id && (
                  <button
                    type="button"
                    className="he-btn-publish he-btn-publish--sm"
                    disabled={publishingPeriod === slot.period || saving || publishing}
                    onClick={() => void handlePublishPeriod(slot.period)}
                  >
                    {publishingPeriod === slot.period ? '…' : 'نشر'}
                  </button>
                )}
                {slot.hw_id && (
                  <button
                    type="button"
                    className="btn-del"
                    style={{ alignSelf: 'flex-start', marginTop: 2, fontSize: '.72rem', padding: '2px 8px', minWidth: 28, minHeight: 26 }}
                    title="حذف واجب هذه الحصة"
                    onClick={() => void handleDeletePeriod(slot.period)}
                  >
                    حذف
                  </button>
                )}
              </div>

              {/* LEFT cell — textarea + attachments */}
              <div className="he-period-input">
                <textarea
                  className="hw-textarea he-hw-textarea"
                  rows={2}
                  placeholder="نص الواجب…"
                  value={slot.body}
                  onChange={e => setBodies({ [slot.period]: e.target.value })}
                  dir="rtl"
                />
                <AttachmentChips
                  hwId={slot.hw_id}
                  attachments={slot.attachments}
                  period={slot.period}
                  onUpload={uploadAttachment}
                  onDelete={deleteAttachment}
                  showToast={showToast}
                />
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={clearToast}
        />
      )}

    </div>
  )
}
