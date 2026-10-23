import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ExportModal } from '../components/ExportModal'
import { BottomNavBar } from '../components/BottomNavBar'
import { DateNavigator } from '../components/DateNavigator'
import { Toast, useToast } from '../components/Toast'
import { useSchoolSettings } from '../services/schoolSettings'
import { useGuardianSchedule, clearSessionScheduleCache } from '../hooks/useGuardianSchedule'
import type { GuardianPeriodSlot, UnmatchedHomeworkItem } from '../hooks/useGuardianSchedule'
import { SubjectGrid } from '../components/guardian/SubjectGrid'
import { PeriodDetailDrawer } from '../components/guardian/PeriodDetailDrawer'
import {
  CloseIcon,
  DownloadIcon,
  FamilyIcon,
} from '../components/Icons'

// ── types ────────────────────────────────────────────────────────────────────
interface Child {
  student_id: number
  full_name: string
  section_id: number
  section_label: string
  section_letter: string
}

interface SRow {
  id: string
  period: number | null
  body: string
  due_date: string
  section_id: number
  subject: { name: string; color: string | null } | null
  teacher: { full_name: string } | null
  attachments: Array<{ id: string; storage_path: string; mime: string }>
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
  const [searchParams, setSearchParams] = useSearchParams()

  // ── auth / children / settings state ───────────────────────────────────────
  const { settings } = useSchoolSettings()
  const [children, setChildren] = useState<Child[]>([])
  const [childrenLoaded, setChildrenLoaded] = useState(false)
  const [idx, setIdx] = useState(0)
  const [gid, setGid] = useState<string | null>(null)

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

  // ── export modal state ────────────────────────────────────────────────────
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  // ── signed URLs for attachments ───────────────────────────────────────────
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  // ── current child ─────────────────────────────────────────────────────────
  const child = children[idx] ?? null

  // ── schedule & homework hook (Task 13) ────────────────────────────────────
  const {
    periods: schedulePeriods,
    unmatchedHomework,
    notices,
    loading,
    error: scheduleError,
    isWeekend,
    isTimetableAvailable,
    refetch: refetchSchedule,
  } = useGuardianSchedule(child?.section_id ?? null, toISO(date))

  // ── Drawer navigation state via URL search param ?lesson=<period> ─────────
  const lessonParam = searchParams.get('lesson')
  const activePeriodNumber = lessonParam ? Number(lessonParam) : null
  const [selectedUnmatched, setSelectedUnmatched] = useState<UnmatchedHomeworkItem | null>(null)

  const activeSlot = activePeriodNumber != null
    ? schedulePeriods.find(s => s.period === activePeriodNumber) ?? null
    : null

  const isDrawerOpen = activeSlot != null || selectedUnmatched != null

  function handleSelectPeriod(slot: GuardianPeriodSlot) {
    setSelectedUnmatched(null)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('lesson', String(slot.period))
      return next
    }, { replace: activePeriodNumber != null })
  }

  function handleSelectUnmatched(item: UnmatchedHomeworkItem) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('lesson')
      return next
    }, { replace: true })
    setSelectedUnmatched(item)
  }

  function handleCloseDrawer() {
    setSelectedUnmatched(null)
    if (activePeriodNumber != null) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.delete('lesson')
        return next
      })
    }
  }

  // Clear drawer when active student or date changes
  useEffect(() => {
    setSelectedUnmatched(null)
    if (searchParams.has('lesson')) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.delete('lesson')
        return next
      }, { replace: true })
    }
  }, [idx, date])

  // ── boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { nav('/login'); return }
      bootstrap()
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
    const allAttachments = [
      ...schedulePeriods.flatMap(s => s.homework?.attachments ?? []),
      ...unmatchedHomework.flatMap(u => u.homework.attachments ?? []),
    ]
    const paths = allAttachments.map(a => a.storage_path)
    if (!paths.length) { setSignedUrls({}); return }
    supabase.storage.from('attachments').createSignedUrls(paths, 3600).then(({ data }) => {
      const map: Record<string, string> = {}
      ;(data ?? []).forEach((r: unknown) => {
        const row = r as { path: string; signedUrl: string }
        if (row.signedUrl) map[row.path] = row.signedUrl
      })
      setSignedUrls(map)
    }).catch(e => {
      console.error('signed URL generation failed', e)
      showToast('فشل تحميل المرفقات، حاول مجدداً', 'error')
    })
  }, [schedulePeriods, unmatchedHomework])

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
    clearSessionScheduleCache()
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

  // ── export data payload ───────────────────────────────────────────────────
  const allHomeworkForExport = [
    ...schedulePeriods.filter(s => s.has_homework && s.homework).map(s => s.homework!),
    ...unmatchedHomework.map(u => u.homework),
  ]

  const exportData = {
    schoolName: settings.name,
    sectionName: child?.section_label ?? '',
    date: toISO(date),
    notices: notices.filter(n => n.priority <= 1).map(n => n.title + (n.body ? ': ' + n.body : '')).join('\n'),
    warnings: notices.filter(n => n.priority > 1).map(n => n.title + (n.body ? ': ' + n.body : '')).join('\n'),
    items: allHomeworkForExport.map(h => ({
      period: h.period ?? 0,
      subject: h.subject_name ?? 'غير محدد',
      teacher: h.teacher_name ?? 'غير محدد',
      body: h.body,
    })),
    settings,
  }

  const hasExportableItems = allHomeworkForExport.length > 0

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
      <main className="screen" dir="rtl" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <header className="today-header today-header-compact">
          <div className="brand-identity">
            <img src="/icon-192.png" alt="واجباتي" className="brand-logo" width={40} height={40} />
            <div className="today-header-titles">
              <h1 className="app-title" style={{ fontSize: '1.25rem', margin: 0 }}>واجباتي</h1>
              <p className="school-subtitle" style={{ fontSize: '.82rem', margin: 0 }}>{settings.name}</p>
            </div>
          </div>
        </header>
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <FamilyIcon size={44} />
          </span>
          <p className="empty-msg">لا أبناء مرتبطون بهذا الحساب</p>
        </div>
        <BottomNavBar
          onOpenExport={() => {}}
          onLogout={handleLogout}
          canExport={false}
        />
      </main>
    )
  }

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <main
      className="screen today"
      dir="rtl"
      style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* ── compact header ── */}
      <header className="today-header today-header-compact" style={{ padding: '10px 14px', marginBottom: 6 }}>
        <div className="today-header-top" style={{ justifyContent: 'center' }}>
          <div className="brand-identity" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon-192.png" alt="واجباتي" className="brand-logo" width={38} height={38} style={{ borderRadius: 10 }} />
            <div className="today-header-titles" style={{ textAlign: 'right' }}>
              <h1 className="app-title" style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.2 }}>واجباتي</h1>
              <p className="school-subtitle" style={{ fontSize: '.8rem', margin: 0, color: 'var(--fg-muted)' }}>{settings.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── push opt-in banner ─────────────────────────────────────────── */}
      {pushOpt === 'pending' && (
        <div className="push-banner">
          <span>فعّل الإشعارات لتصلك الواجبات فور نشرها</span>
          <button onClick={enablePush}>تفعيل</button>
        </div>
      )}

      {/* ── search bar ─────────────────────────────────────────────────── */}
      <div className="search-row">
        <input
          className="search-input"
          placeholder="بحث في الواجبات…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          inputMode="search"
        />
        {search && (
          <button className="icon-btn" onClick={() => setSearch('')} aria-label="مسح البحث">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {search.trim() ? (
        /* ── search results ───────────────────────────────────────────── */
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
                  {r.subject?.name ?? 'غير محدد'}
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
          {/* ── child selector tabs ────────────────────────────────────── */}
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

          {/* ── date navigation ─────────────────────────────────────────── */}
          <DateNavigator
            date={date}
            onChange={setDate}
            onLabelClick={() => { setShowCal(v => !v); setCalMo(new Date(date)) }}
          />

          {/* ── archive calendar popup ──────────────────────────────────── */}
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

          {/* ── student & section info bar + unified export ──────────── */}
          {child && (
            <div
              className="student-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--card2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                gap: 10,
                flexWrap: 'wrap',
                margin: '8px 0 12px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.92rem', fontWeight: 800, color: 'var(--fg)' }}>
                  الطالب: {child.full_name}
                </span>
                <span
                  className="badge"
                  style={{
                    fontSize: '.82rem',
                    fontWeight: 700,
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '3px 10px',
                    borderRadius: 6,
                  }}
                >
                  {child.section_label}
                </span>
              </div>

              {!loading && hasExportableItems && (
                <button
                  type="button"
                  onClick={() => setExportModalOpen(true)}
                  className="icon-btn"
                  aria-label="تصدير جدول الواجبات"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    padding: '6px 12px',
                    fontSize: '.85rem',
                    fontWeight: 700,
                  }}
                >
                  <DownloadIcon size={16} />
                  <span>تصدير</span>
                </button>
              )}
            </div>
          )}

          {/* ── notices — latest 3 ─────────────────────────────────────── */}
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

          {/* ── Guardian Subject Grid (Task 13) ─────────────────────────── */}
          <SubjectGrid
            periods={schedulePeriods}
            unmatchedHomework={unmatchedHomework}
            loading={loading}
            error={scheduleError}
            isWeekend={isWeekend}
            isTimetableAvailable={isTimetableAvailable}
            onSelectPeriod={handleSelectPeriod}
            onSelectUnmatched={handleSelectUnmatched}
            onRetry={refetchSchedule}
            activePeriodNumber={activePeriodNumber}
          />
        </>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={clearToast} />
      )}

      {/* ── fixed bottom navigation dock ───────────────────────────────── */}
      <BottomNavBar
        onOpenExport={() => setExportModalOpen(true)}
        onLogout={handleLogout}
        canExport={!loading && hasExportableItems}
      />

      {/* ── unified export modal ────────────────────────────────────────── */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={exportData}
      />

      {/* ── Period Detail Drawer (Task 13) ─────────────────────────────── */}
      <PeriodDetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        slot={activeSlot}
        unmatchedItem={selectedUnmatched}
        signedUrls={signedUrls}
      />
    </main>
  )
}
