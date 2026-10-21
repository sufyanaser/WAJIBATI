import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdminSection } from '../../hooks/useAdminSection'
import type { AttachmentRow } from '../../hooks/useAdminSection'
import { DateNavigator } from '../../components/DateNavigator'
import { Toast, useToast } from '../../components/Toast'

// ── types ──────────────────────────────────────────────────────────────────────

interface Section { id: number; letter: string; stage: { name: string; branch: string } }

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
  const [secId, setSecId] = useState<number | null>(null)
  const [date, setDate] = useState<Date>(() => firstWorkday(new Date()))
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
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
    supabase.from('sections')
      .select('id, letter, stage:stages(name, branch)')
      .order('letter')
      .then(({ data }) => {
        if (data?.length) {
          setSections(data as unknown as Section[])
          setSecId((data[0] as unknown as Section).id)
        }
      })
  }, [ready])

  const [publishingPeriod, setPublishingPeriod] = useState<number | null>(null)

  const { periods, loading, setBodies, save, publish, uploadAttachment, deleteAttachment } = useAdminSection(
    secId !== null ? String(secId) : '',
    toISO(date),
  )

  async function handlePublishPeriod(period: number, hwId: string) {
    setPublishingPeriod(period)
    try {
      const { error } = await supabase
        .from('homework')
        .update({ status: 'published' })
        .eq('id', hwId)
      if (error) {
        showToast(`فشل نشر الحصة ${period}: ${error.message}`, 'error')
      } else {
        showToast(`تم نشر الحصة ${period} ✓`, 'success')
        // reload section data by triggering save with existing body
        await save()
      }
    } catch {
      showToast('خطأ أثناء نشر الحصة', 'error')
    }
    setPublishingPeriod(null)
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

  return (
    <div dir="rtl" className="homework-entry">

      {/* ── Section Selector ──────────────────────────────────── */}
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

      {/* ── Date Navigator ────────────────────────────────────── */}
      <DateNavigator date={date} onChange={setDate} />

      {/* ── Sticky Batch Action Bar ───────────────────────────── */}
      <div className="he-action-bar">
        <button
          className="he-btn-draft"
          disabled={saving || publishing || loading}
          onClick={handleSaveDraft}
        >
          {saving ? '…' : 'حفظ مسودة'}
        </button>
        <button
          className="btn-publish-all he-btn-publish"
          disabled={saving || publishing || loading}
          onClick={handlePublish}
        >
          {publishing ? '…' : 'نشر الكل'}
        </button>
      </div>

      {/* ── Status Summary Bar ────────────────────────────────── */}
      {!loading && periods.length > 0 && (() => {
        const published = periods.filter(p => p.status === 'published').length
        const draft = periods.filter(p => p.status === 'draft').length
        const empty = periods.filter(p => !p.status).length
        return (
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            padding: '8px 12px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: '.8rem',
          }}>
            {published > 0 && <span className="he-status he-status--published">{published} منشور</span>}
            {draft > 0 && <span className="he-status he-status--draft">{draft} مسودة</span>}
            {empty > 0 && <span className="he-status he-status--empty">{empty} فارغ</span>}
          </div>
        )
      })()}

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
                {slot.subject && (
                  <span className="he-subject-name">{slot.subject}</span>
                )}
                {slot.teacher && (
                  <span className="he-teacher-name">{slot.teacher}</span>
                )}
                <StatusDot status={slot.status} />
                {slot.hw_id && slot.status === 'draft' && (
                  <button
                    className="he-btn-publish"
                    style={{ fontSize: '.72rem', padding: '3px 8px', marginTop: 4 }}
                    disabled={publishingPeriod === slot.period || saving || publishing}
                    onClick={() => void handlePublishPeriod(slot.period, slot.hw_id!)}
                    title="نشر هذه الحصة فقط"
                  >
                    {publishingPeriod === slot.period ? '…' : 'نشر'}
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
