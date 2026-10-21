import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ExportButton } from '../components/ExportButton'
import { HomeworkCard } from '../components/HomeworkCard'
import { DateNavigator } from '../components/DateNavigator'
import { Toast, useToast } from '../components/Toast'
import { useHomework } from '../hooks/useHomework'
import type { HwItem } from '../hooks/useHomework'
import { exportA4PDF } from '../utils/exportA4'

// ── types ────────────────────────────────────────────────────────────────────
interface Child {
  student_id: number
  full_name: string
  section_id: number
  section_label: string
  section_letter: string
}

/** Subject list for A4 export — must match exportA4.ts SUBJECTS order */
const A4_SUBJECTS = [
  'التربية الإسلامية',
  'اللغة العربية',
  'اللغة الإنجليزية',
  'الكيمياء',
  'الفيزياء',
  'الأحياء',
  'الرياضيات',
  'جرائم حزب البعث',
] as const

interface SRow extends HwItem {
  due_date: string
  section_id: number
}

// ── helpers ───────────────────────────────────────────────────────────────────
const isSchool = (d: Date) => { const w = d.getDay(); return w !== 5 && w !== 6 }
function stepDay(d: Date, dir: 1 | -1): Date {
  const r = new Date(d); do { r.setDate(r.getDate() + dir) } while (!isSchool(r)); return r
}
const toISO = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD local

function vapidKey(b64: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr.buffer
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Today() {
  const nav = useNavigate()

  // ── auth / children state ─────────────────────────────────────────────────
  const [children, setChildren] = useState<Child[]>([])
  const [childrenLoaded, setChildrenLoaded] = useState(false)
  const [idx, setIdx] = useState(0)
  const [gid, setGid] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState('اعدادية الرميلة للبنين')

  // ── date state ────────────────────────────────────────────────────────────
  const [date, setDate] = useState<Date>(() => {
    const d = new Date()
    return isSchool(d) ? d : stepDay(d, -1)
  })

  // ── calendar popup state ──────────────────────────────────────────────────
  const [showCal, setShowCal] = useState(false)
  const [calMo, setCalMo] = useState(() => new Date())
  const [hwDays, setHwDays] = useState<Set<string>>(new Set())

  // ── search state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [sRes, setSRes] = useState<SRow[]>([])
  const [sLoad, setSLoad] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── push state ────────────────────────────────────────────────────────────
  const [pushOpt, setPushOpt] = useState<'pending' | 'granted' | 'off'>('off')

  // ── A4 PDF export state ───────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  // ── signed URLs for attachments ───────────────────────────────────────────
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  // ── current child ─────────────────────────────────────────────────────────
  const child = children[idx] ?? null

  // ── homework hook ─────────────────────────────────────────────────────────
  const { items: hw, notices, loading, offline } = useHomework(
    child?.section_id ?? null,
    toISO(date),
  )

  // ── boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { nav('/login'); return }
      bootstrap()
      supabase
        .from('settings')
        .select('value')
        .eq('key', 'school')
        .maybeSingle()
        .then(({ data: s }) => {
          if (s?.value && typeof s.value === 'object' && 'name' in s.value)
            setSchoolName(String((s.value as { name: string }).name))
        })
      if ('Notification' in window) {
        if (Notification.permission === 'default') setPushOpt('pending')
        else if (Notification.permission === 'granted') setPushOpt('granted')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function bootstrap() {
    type GS = {
      student_id: number
      student: {
        full_name: string
        section: {
          id: number
          letter: string
          stage: { name: string; branch: string }
        }
      }
    }
    const [gsRes, gRes] = await Promise.all([
      supabase.from('guardian_students').select(
        'student_id, student:students!inner(full_name, section:sections!inner(id, letter, stage:stages!inner(name, branch)))',
      ),
      supabase.from('guardians').select('id').maybeSingle(),
    ])
    if (gRes.data) setGid((gRes.data as { id: string }).id)
    const rows = (gsRes.data ?? []) as unknown as GS[]
    setChildren(
      rows.map(r => ({
        student_id: r.student_id,
        full_name: r.student.full_name,
        section_id: r.student.section.id,
        section_label: `${r.student.section.stage.name} ${r.student.section.stage.branch} ‏/ ${r.student.section.letter}`,
        section_letter: r.student.section.letter,
      })),
    )
    setChildrenLoaded(true)
  }

  // ── signed URLs for attachments ───────────────────────────────────────────
  useEffect(() => {
    const paths = hw.flatMap(h => h.attachments.map(a => a.storage_path))
    if (!paths.length) { setSignedUrls({}); return }
    supabase.storage.from('attachments').createSignedUrls(paths, 3600).then(({ data }) => {
      const map: Record<string, string> = {}
      ;(data ?? []).forEach((r: unknown) => {
        const row = r as { path: string; signedUrl: string }
        if (row.signedUrl) map[row.path] = row.signedUrl
      })
      setSignedUrls(map)
    })
  }, [hw])

  // ── calendar homework dots ────────────────────────────────────────────────
  useEffect(() => {
    if (!showCal || !child) return
    const sid = child.section_id
    const y = calMo.getFullYear(), m = calMo.getMonth()
    const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const to = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`
    supabase
      .from('homework')
      .select('due_date')
      .eq('section_id', sid)
      .eq('status', 'published')
      .gte('due_date', from)
      .lte('due_date', to)
      .then(({ data }) =>
        setHwDays(new Set((data ?? []).map((r: unknown) => (r as { due_date: string }).due_date))),
      )
  }, [showCal, calMo, child])

  // ── full-text search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSRes([]); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSLoad(true)
      const sids = children.map(c => c.section_id)
      const { data } = await supabase
        .from('homework')
        .select(
          'id,due_date,period,body,section_id,subject:subjects(name,color),teacher:teachers(full_name),attachments(id,storage_path,mime)',
        )
        .in('section_id', sids)
        .textSearch('search', search.trim())
        .eq('status', 'published')
        .order('due_date', { ascending: false })
        .limit(30)
      setSRes((data ?? []) as unknown as SRow[])
      setSLoad(false)
    }, 400)
  }, [search, children])

  // ── logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUTH_CACHES' })
    }
    await supabase.auth.signOut()
    nav('/login')
  }

  // ── push opt-in ───────────────────────────────────────────────────────────
  async function enablePush() {
    const k = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
    if (!k || !gid) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey(k),
      })
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await supabase.from('push_subscriptions').upsert(
        {
          guardian_id: gid,
          endpoint: j.endpoint,
          p256dh: j.keys.p256dh,
          auth: j.keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      )
      setPushOpt('granted')
    } catch { /* user denied */ }
  }

  // ── A4 PDF export ─────────────────────────────────────────────────────────
  async function handleExportA4PDF() {
    if (!child) return
    setExporting(true)
    try {
      const homeworkBySubject: Record<string, string> = {}
      A4_SUBJECTS.forEach(s => { homeworkBySubject[s] = '' })
      hw.forEach(h => {
        const name = h.subject?.name ?? ''
        if (name && name in homeworkBySubject) homeworkBySubject[name] = h.body
      })
      // TODO: replace after published_by migration (see docs/implementation/ARCHITECTURE-AUDIT.md)
      const publisherName = 'مسؤول المدرسة'
      const blob = await exportA4PDF({
        date: toISO(date),
        classLabel: child.section_label,
        section: child.section_letter,
        homeworkBySubject,
        publisherName,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'واجباتي-' + toISO(date) + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('A4 PDF export failed', e)
      showToast('فشل تصدير PDF — حاول مجدداً', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── calendar cells ────────────────────────────────────────────────────────
  function calCells(): (Date | null)[] {
    const y = calMo.getFullYear(), m = calMo.getMonth()
    const cells: (Date | null)[] = Array(new Date(y, m, 1).getDay()).fill(null)
    for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) cells.push(new Date(y, m, d))
    return cells
  }

  const todISO = toISO(new Date())
  const selISO = toISO(date)

  // ── no children state ─────────────────────────────────────────────────────
  if (childrenLoaded && !children.length) {
    return (
      <main className="screen" dir="rtl">
        <div className="top-bar">
          <h1 className="app-title">واجباتي</h1>
          <button
            className="icon-btn"
            onClick={handleLogout}
          >
            خروج
          </button>
        </div>
        <p className="muted">لا أبناء مرتبطون بهذا الحساب</p>
      </main>
    )
  }

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <main className="screen today" dir="rtl">

      {/* header */}
      <div className="top-bar">
        <h1 className="app-title">واجباتي</h1>
        <button
          className="icon-btn"
          onClick={handleLogout}
        >
          خروج
        </button>
      </div>

      {/* push opt-in banner */}
      {pushOpt === 'pending' && (
        <div className="push-banner">
          <span>فعّل الإشعارات لتصلك الواجبات فور نشرها</span>
          <button onClick={enablePush}>تفعيل</button>
        </div>
      )}

      {/* search bar */}
      <div className="search-row">
        <input
          className="search-input"
          placeholder="بحث في الواجبات…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          inputMode="search"
        />
        {search && (
          <button className="icon-btn" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {search.trim() ? (
        /* ── search results ── */
        <section className="hw-list">
          {sLoad && <p className="muted">جارٍ البحث…</p>}
          {!sLoad && !sRes.length && <p className="muted">لا نتائج</p>}
          {sRes.map(r => (
            <article
              key={r.id}
              className="hw-card clickable"
              onClick={() => { setDate(new Date(r.due_date + 'T00:00:00')); setSearch('') }}
            >
              <div className="hw-header">
                <span
                  className="subject-chip"
                  style={r.subject?.color
                    ? { background: r.subject.color + '33', borderColor: r.subject.color }
                    : undefined}
                >
                  {r.subject?.name ?? '—'}
                </span>
                <span className="hw-date-label">
                  {new Date(r.due_date + 'T00:00:00').toLocaleDateString('ar-IQ', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="hw-body">{r.body}</p>
            </article>
          ))}
        </section>
      ) : (
        <>
          {/* child selector tabs */}
          {children.length > 1 && (
            <nav className="child-tabs">
              {children.map((c, i) => (
                <button
                  key={c.student_id}
                  className={'tab' + (i === idx ? ' active' : '')}
                  onClick={() => setIdx(i)}
                >
                  {c.full_name}
                </button>
              ))}
            </nav>
          )}

          {/* date navigation */}
          <DateNavigator
            date={date}
            onChange={setDate}
            onLabelClick={() => { setShowCal(v => !v); setCalMo(new Date(date)) }}
          />

          {/* archive calendar popup */}
          {showCal && (
            <div className="cal-popup">
              <div className="cal-header">
                <button
                  onClick={() =>
                    setCalMo(m => { const r = new Date(m); r.setMonth(r.getMonth() - 1); return r })
                  }
                >
                  ›
                </button>
                <span>{calMo.toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' })}</span>
                <button
                  onClick={() =>
                    setCalMo(m => { const r = new Date(m); r.setMonth(r.getMonth() + 1); return r })
                  }
                >
                  ‹
                </button>
              </div>
              <div className="cal-grid">
                {['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب'].map(h => (
                  <span key={h} className="cal-head">{h}</span>
                ))}
                {calCells().map((d, i) => {
                  if (!d) return <span key={`g${i}`} />
                  const iso = toISO(d)
                  const school = isSchool(d)
                  return (
                    <button
                      key={iso}
                      disabled={!school}
                      className={
                        'cal-day' +
                        (!school ? ' off' : '') +
                        (hwDays.has(iso) ? ' has-hw' : '') +
                        (iso === selISO ? ' sel' : '') +
                        (iso === todISO ? ' tod' : '')
                      }
                      onClick={() => {
                        setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
                        setShowCal(false)
                      }}
                    >
                      {d.getDate()}
                      {hwDays.has(iso) && <span className="dot" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* section badge + export */}
          {child && (
            <div className="section-bar" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
              <span className="badge">{child.section_label}</span>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {!loading && hw.length > 0 && (
                  <ExportButton
                    data={{
                      schoolName,
                      sectionName: child.section_label,
                      date: toISO(date),
                      items: hw.map(h => ({
                        period: h.period ?? 0,
                        subject: h.subject?.name ?? '—',
                        teacher: h.teacher?.full_name ?? '—',
                        body: h.body,
                      })),
                    }}
                  />
                )}
                <button
                  onClick={handleExportA4PDF}
                  disabled={exporting || loading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                    padding: '.5rem 1rem', background: 'var(--card2)',
                    border: '1.5px solid var(--accent)', borderRadius: '.5rem',
                    color: 'var(--accent)', cursor: (exporting || loading) ? 'wait' : 'pointer',
                    fontSize: '.875rem', fontWeight: 600, fontFamily: 'inherit',
                    opacity: (exporting || loading) ? 0.6 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  {exporting ? '⏳ جارٍ التصدير…' : '📄 تصدير PDF'}
                </button>
              </div>
            </div>
          )}

          {offline && (
            <p className="offline-note">⚠️ عرض مؤقت بدون اتصال</p>
          )}

          {/* notices — latest 3 */}
          {notices.length > 0 && (
            <section className="notices">
              {notices.map(n => (
                <div key={n.id} className={`notice p${n.priority}`}>
                  <strong>{n.title}</strong>
                  {n.body && <p>{n.body}</p>}
                </div>
              ))}
            </section>
          )}

          {/* homework list */}
          {loading ? (
            <p className="muted">جارٍ التحميل…</p>
          ) : hw.length === 0 ? (
            <p className="muted">لا واجبات لهذا اليوم</p>
          ) : (
            <section className="hw-list">
              {hw.map(h => (
                <HomeworkCard
                  key={h.id}
                  period={h.period}
                  subject={h.subject?.name ?? '—'}
                  teacher={h.teacher?.full_name ?? '—'}
                  body={h.body}
                  subjectColor={h.subject?.color}
                  attachments={h.attachments}
                  signedUrls={signedUrls}
                />
              ))}
            </section>
          )}
        </>
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={clearToast} />
      )}
    </main>
  )
}
