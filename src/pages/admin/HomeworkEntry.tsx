import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdminSection } from '../../hooks/useAdminSection'
import PeriodRow from '../../components/admin/PeriodRow'

// ── types ──────────────────────────────────────────────────────────────────────

interface Section { id: number; letter: string; stage: { name: string; branch: string } }

// ── helpers ────────────────────────────────────────────────────────────────────

const toISO = (d: Date) => d.toLocaleDateString('en-CA')
const WEEKDAYS = [0, 1, 2, 3, 4]

function isWeekend(iso: string) {
  const day = new Date(iso + 'T00:00:00').getDay()
  return day === 5 || day === 6
}

// ── toast ──────────────────────────────────────────────────────────────────────

const toastStyle = (kind: 'ok' | 'warn' | 'err'): React.CSSProperties => ({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  background: kind === 'ok' ? '#1a3a2a' : kind === 'warn' ? '#2a2a10' : '#2a1010',
  color: kind === 'ok' ? '#4caf82' : kind === 'warn' ? '#E8B04A' : '#E5534B',
  border: `1px solid ${kind === 'ok' ? '#1f5a3d' : kind === 'warn' ? '#5a4a1f' : '#5c1e1e'}`,
  borderRadius: 12,
  padding: '12px 24px',
  fontSize: '.95rem',
  fontWeight: 600,
  zIndex: 9999,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
})

// ── component ──────────────────────────────────────────────────────────────────

export default function HomeworkEntry() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [secId, setSecId] = useState<number | null>(null)
  const [date, setDate] = useState(toISO(new Date()))
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'warn' | 'err' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

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

  useEffect(() => {
    const day = new Date(date + 'T00:00:00').getDay()
    if (day === 5) setDate(toISO(new Date(new Date(date).getTime() + 2 * 864e5)))
    else if (day === 6) setDate(toISO(new Date(new Date(date).getTime() + 864e5)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { periods, loading, setBodies, save, publish } = useAdminSection(
    secId !== null ? String(secId) : '',
    date,
  )

  function showToast(msg: string, kind: 'ok' | 'warn' | 'err') {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSaveDraft() {
    setSaving(true)
    try {
      const result = await save()
      if (result.failed > 0) {
        showToast(`حُفظ ${result.saved} — فشل ${result.failed}: ${result.errors[0]}`, 'warn')
      } else {
        showToast(`تم حفظ ${result.saved} كمسودة`, 'ok')
      }
    } catch {
      showToast('خطأ أثناء الحفظ', 'err')
    }
    setSaving(false)
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const result = await publish()
      if (result.saved === 0) {
        showToast('لم يُنشر أي واجب — ' + (result.errors[0] ?? ''), 'err')
      } else if (result.failed > 0) {
        showToast(`نُشر ${result.saved} — فشل ${result.failed}`, 'warn')
      } else if (!result.pushSent) {
        showToast(`تم النشر (${result.saved}) — فشل إرسال الإشعار`, 'warn')
      } else {
        showToast(`تم النشر وإرسال الإشعارات (${result.saved})`, 'ok')
      }
    } catch {
      showToast('خطأ أثناء النشر', 'err')
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

  const weekend = isWeekend(date)
  const sec = sections.find(s => s.id === secId)
  const sectionLabel = sec ? `${sec.stage.name} ${sec.stage.branch} / ${sec.letter}` : ''

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <div className="admin-selectors">
        <select
          className="admin-select"
          value={secId ?? ''}
          onChange={e => setSecId(Number(e.target.value))}
        >
          {sections.map(s => (
            <option key={s.id} value={s.id}>
              {s.stage.name} {s.stage.branch} / {s.letter}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="admin-date"
          value={date}
          min="2020-01-01"
          onChange={e => {
            const val = e.target.value
            if (!WEEKDAYS.includes(new Date(val + 'T00:00:00').getDay())) return
            setDate(val)
          }}
        />
      </div>

      {sectionLabel && (
        <p style={{ margin: 0, fontSize: '.88rem', color: 'var(--muted)' }}>
          الشعبة: <strong style={{ color: 'var(--fg)' }}>{sectionLabel}</strong>
        </p>
      )}

      {weekend && (
        <p className="muted">هذا اليوم عطلة (جمعة أو سبت) — اختر يوماً من الأحد إلى الخميس</p>
      )}

      {!weekend && loading && (
        <p className="muted">جارٍ التحميل…</p>
      )}

      {!weekend && !loading && (
        <>
          <div className="period-list">
            {periods.map(slot => (
              <PeriodRow
                key={slot.period}
                period={slot.period}
                subject={slot.subject}
                teacher={slot.teacher}
                value={slot.body}
                status={slot.status}
                onChange={v => setBodies({ [slot.period]: v })}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <button
              className="btn-save"
              style={{ width: '100%', padding: 14, fontSize: '1rem', borderRadius: 14 }}
              disabled={saving || publishing}
              onClick={handleSaveDraft}
            >
              {saving ? '…' : 'حفظ كمسودة'}
            </button>
            <button
              className="btn-publish-all"
              disabled={saving || publishing}
              onClick={handlePublish}
            >
              {publishing ? '…' : 'نشر وإرسال إشعار'}
            </button>
          </div>
        </>
      )}

      {toast && (
        <div style={toastStyle(toast.kind)}>{toast.msg}</div>
      )}
    </div>
  )
}
