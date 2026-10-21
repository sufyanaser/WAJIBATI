import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdminSection } from '../../hooks/useAdminSection'
import { DateNavigator } from '../../components/DateNavigator'
import { Toast, useToast } from '../../components/Toast'

// ── types ──────────────────────────────────────────────────────────────────────

interface Section { id: number; letter: string; stage: { name: string; branch: string } }

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

  const { periods, loading, setBodies, save, publish } = useAdminSection(
    secId !== null ? String(secId) : '',
    toISO(date),
  )

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
              </div>

              {/* LEFT cell — textarea */}
              <div className="he-period-input">
                <textarea
                  className="hw-textarea he-hw-textarea"
                  rows={2}
                  placeholder="نص الواجب…"
                  value={slot.body}
                  onChange={e => setBodies({ [slot.period]: e.target.value })}
                  dir="rtl"
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
