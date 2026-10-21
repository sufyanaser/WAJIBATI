import { useState, useEffect, useCallback, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ExportButton } from '../components/ExportButton'

// ── types ────────────────────────────────────────────────────────────────────
interface Child { student_id: number; full_name: string; section_id: number; section_label: string }
interface Attach { id: string; storage_path: string; mime: string }
interface HwRow {
  id: string; period: number | null; body: string
  subject: { name: string; color: string | null } | null
  teacher: { full_name: string } | null
  attachments: Attach[]
}
interface Notice { id: string; title: string; body: string | null; priority: number }
interface SRow extends HwRow { due_date: string; section_id: number }

// ── helpers ───────────────────────────────────────────────────────────────────
// Iraqi school week: Sun(0)–Thu(4); Fri(5) Sat(6) off
const isSchool = (d: Date) => { const w = d.getDay(); return w !== 5 && w !== 6 }
function stepDay(d: Date, dir: 1 | -1): Date {
  const r = new Date(d); do { r.setDate(r.getDate() + dir) } while (!isSchool(r)); return r
}
const toISO = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD local
const arDay = (d: Date) =>
  d.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
function vapidKey(b64: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr.buffer
}
const chipStyle = (color?: string | null): CSSProperties =>
  color ? { background: color + '33', borderColor: color } : {}

// ── component ─────────────────────────────────────────────────────────────────
export default function Today() {
  const nav = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [idx, setIdx] = useState(0)
  const [date, setDate] = useState<Date>(() => { const d = new Date(); return isSchool(d) ? d : stepDay(d, -1) })
  const [hw, setHw] = useState<HwRow[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [search, setSearch] = useState('')
  const [sRes, setSRes] = useState<SRow[]>([])
  const [sLoad, setSLoad] = useState(false)
  const [showCal, setShowCal] = useState(false)
  const [calMo, setCalMo] = useState(() => new Date())
  const [hwDays, setHwDays] = useState<Set<string>>(new Set())
  const [pushOpt, setPushOpt] = useState<'pending' | 'granted' | 'off'>('off')
  const [gid, setGid] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [schoolName, setSchoolName] = useState('اعدادية الرميلة للبنين')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      bootstrap()
      supabase.from('settings').select('value').eq('key', 'school').maybeSingle().then(({ data: s }) => {
        if (s?.value && typeof s.value === 'object' && 'name' in s.value)
          setSchoolName(String((s.value as { name: string }).name))
      })
      if (data.session && 'Notification' in window) {
        if (Notification.permission === 'default') setPushOpt('pending')
        else if (Notification.permission === 'granted') setPushOpt('granted')
      }
    })
  }, [])

  async function bootstrap() {
    type GS = { student_id: number; student: { full_name: string; section: { id: number; letter: string; stage: { name: string; branch: string } } } }
    const [gsRes, gRes] = await Promise.all([
      supabase.from('guardian_students').select(
        'student_id, student:students!inner(full_name, section:sections!inner(id, letter, stage:stages!inner(name, branch)))'
      ),
      supabase.from('guardians').select('id').maybeSingle()
    ])
    if (gRes.data) setGid((gRes.data as { id: string }).id)
    const rows = (gsRes.data ?? []) as unknown as GS[]
    setChildren(rows.map(r => ({
      student_id: r.student_id,
      full_name: r.student.full_name,
      section_id: r.student.section.id,
      section_label: `${r.student.section.stage.name} ${r.student.section.stage.branch} ‏/ ${r.student.section.letter}`,
    })))
    if (!rows.length) setLoading(false)
  }

  // ── load day ─────────────────────────────────────────────────────────────────
  const loadDay = useCallback(async (d: Date, sec: number) => {
    setLoading(true); setOffline(false)
    const iso = toISO(d)
    const now = new Date().toISOString()
    try {
      const [hR, nR] = await Promise.all([
        supabase.from('homework')
          .select('id,period,body,subject:subjects(name,color),teacher:teachers(full_name),attachments(id,storage_path,mime)')
          .eq('section_id', sec).eq('due_date', iso).eq('status', 'published').order('period'),
        supabase.from('notices')
          .select('id,title,body,priority')
          .or(`section_id.is.null,section_id.eq.${sec}`)
          .lte('publish_at', now)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('priority', { ascending: false }).limit(10)
      ])
      if (hR.error) throw hR.error
      const hwData = hR.data as unknown as HwRow[]
      setHw(hwData)
      setNotices((nR.data ?? []) as unknown as Notice[])
      try { localStorage.setItem('rh_cache', JSON.stringify({ iso, sec, hw: hwData })) } catch { /* quota */ }
      supabase.rpc('mark_read', { p_section: sec, p_day: iso }).then(() => { /* non-critical */ }, () => { /* ignore */ })
    } catch {
      try {
        const c = JSON.parse(localStorage.getItem('rh_cache') ?? '{}') as { iso?: string; sec?: number; hw?: HwRow[] }
        if (c.iso === iso && c.sec === sec && c.hw) { setHw(c.hw); setOffline(true) }
        else setHw([])
      } catch { setHw([]) }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!children.length) return
    loadDay(date, children[idx].section_id)
  }, [date, idx, children, loadDay])

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
    if (!showCal || !children.length) return
    const sid = children[idx].section_id
    const y = calMo.getFullYear(), m = calMo.getMonth()
    const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const to = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`
    supabase.from('homework').select('due_date')
      .eq('section_id', sid).eq('status', 'published').gte('due_date', from).lte('due_date', to)
      .then(({ data }) =>
        setHwDays(new Set((data ?? []).map((r: unknown) => (r as { due_date: string }).due_date)))
      )
  }, [showCal, calMo, idx, children])

  // ── full-text search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSRes([]); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSLoad(true)
      const sids = children.map(c => c.section_id)
      const { data } = await supabase.from('homework')
        .select('id,due_date,period,body,section_id,subject:subjects(name,color),teacher:teachers(full_name),attachments(id,storage_path,mime)')
        .in('section_id', sids).textSearch('search', search.trim())
        .eq('status', 'published').order('due_date', { ascending: false }).limit(30)
      setSRes((data ?? []) as unknown as SRow[])
      setSLoad(false)
    }, 400)
  }, [search, children])

  // ── push opt-in ───────────────────────────────────────────────────────────
  async function enablePush() {
    const k = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
    if (!k || !gid) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(k) })
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await supabase.from('push_subscriptions').upsert({
        guardian_id: gid, endpoint: j.endpoint,
        p256dh: j.keys.p256dh, auth: j.keys.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' })
      setPushOpt('granted')
    } catch { /* user denied */ }
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
  const child = children[idx]

  // ── empty state ───────────────────────────────────────────────────────────
  if (!loading && !children.length) return (
    <main className="screen" dir="rtl">
      <div className="top-bar">
        <h1 className="app-title">واجبات الرميلة</h1>
        <button className="icon-btn" onClick={() => supabase.auth.signOut().then(() => nav('/login'))}>خروج</button>
      </div>
      <p className="muted">لا أبناء مرتبطون بهذا الحساب</p>
    </main>
  )

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <main className="screen today" dir="rtl">

      {/* header */}
      <div className="top-bar">
        <h1 className="app-title">واجبات الرميلة</h1>
        <button className="icon-btn" onClick={() => supabase.auth.signOut().then(() => nav('/login'))}>خروج</button>
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
        <input className="search-input" placeholder="بحث في الواجبات…" value={search}
          onChange={e => setSearch(e.target.value)} inputMode="search" />
        {search && <button className="icon-btn" onClick={() => setSearch('')}>✕</button>}
      </div>

      {search.trim() ? (
        /* ── search results ── */
        <section className="hw-list">
          {sLoad && <p className="muted">جارٍ البحث…</p>}
          {!sLoad && !sRes.length && <p className="muted">لا نتائج</p>}
          {sRes.map(r => (
            <article key={r.id} className="hw-card clickable"
              onClick={() => { setDate(new Date(r.due_date + 'T00:00:00')); setSearch('') }}>
              <div className="hw-header">
                <span className="subject-chip" style={chipStyle(r.subject?.color)}>{r.subject?.name ?? '—'}</span>
                <span className="hw-date-label">
                  {new Date(r.due_date + 'T00:00:00').toLocaleDateString('ar-IQ', { month: 'long', day: 'numeric' })}
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
                <button key={c.student_id} className={'tab' + (i === idx ? ' active' : '')}
                  onClick={() => setIdx(i)}>{c.full_name}</button>
              ))}
            </nav>
          )}

          {/* date navigation */}
          <div className="date-nav">
            <button className="icon-btn" aria-label="يوم سابق" onClick={() => setDate(d => stepDay(d, -1))}>›</button>
            <button className="date-label"
              onClick={() => { setShowCal(v => !v); setCalMo(new Date(date)) }}>
              {child ? arDay(date) : '…'}
            </button>
            <button className="icon-btn" aria-label="يوم تالٍ" onClick={() => setDate(d => stepDay(d, 1))}>‹</button>
          </div>

          {/* archive calendar */}
          {showCal && (
            <div className="cal-popup">
              <div className="cal-header">
                <button onClick={() => setCalMo(m => { const r = new Date(m); r.setMonth(r.getMonth() - 1); return r })}>›</button>
                <span>{calMo.toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setCalMo(m => { const r = new Date(m); r.setMonth(r.getMonth() + 1); return r })}>‹</button>
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
                    <button key={iso} disabled={!school}
                      className={
                        'cal-day' +
                        (!school ? ' off' : '') +
                        (hwDays.has(iso) ? ' has-hw' : '') +
                        (iso === selISO ? ' sel' : '') +
                        (iso === todISO ? ' tod' : '')
                      }
                      onClick={() => { setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate())); setShowCal(false) }}>
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
            <div className="section-bar" style={{ justifyContent: 'space-between' }}>
              <span className="badge">{child.section_label}</span>
              {!loading && hw.length > 0 && (
                <ExportButton data={{
                  schoolName,
                  sectionName: child.section_label,
                  date: toISO(date),
                  items: hw.map(h => ({
                    period: h.period ?? 0,
                    subject: h.subject?.name ?? '—',
                    teacher: h.teacher?.full_name ?? '—',
                    body: h.body,
                  })),
                }} />
              )}
            </div>
          )}

          {offline && <p className="offline-note">⚠️ عرض مؤقت بدون اتصال</p>}

          {/* notices */}
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
                <article key={h.id} className="hw-card">
                  <div className="hw-header">
                    <span className="subject-chip" style={chipStyle(h.subject?.color)}>
                      {h.subject?.name ?? '—'}
                    </span>
                    {h.period != null && <span className="period-badge">حصة {h.period}</span>}
                    {h.teacher && <span className="teacher-name">{h.teacher.full_name}</span>}
                  </div>
                  <p className="hw-body">{h.body}</p>
                  {h.attachments.length > 0 && (
                    <div className="attachments">
                      {h.attachments.map(a => (
                        <a key={a.id} href={signedUrls[a.storage_path] ?? '#'}
                          target="_blank" rel="noopener noreferrer" className="attach-link">
                          {a.mime.startsWith('image/') ? '🖼' : '📄'} مرفق
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  )
}
