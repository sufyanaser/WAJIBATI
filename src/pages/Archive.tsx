import { useState, useEffect, useCallback, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { HomeworkSearch } from '../components/HomeworkSearch'
import { PageHeader } from '../components/PageHeader'
import { BottomNavBar } from '../components/BottomNavBar'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { CalendarIcon, BookIcon } from '../components/Icons'

// ── types ─────────────────────────────────────────────────────────────────────
interface Section {
  id: number
  label: string
}

interface HwItem {
  id: string
  due_date: string
  period: number | null
  body: string
  subject: { name: string; color: string | null } | null
  teacher: { full_name: string } | null
}

const PAGE_SIZE = 20

// ── helpers ───────────────────────────────────────────────────────────────────
const chipStyle = (color?: string | null): CSSProperties =>
  color ? { background: color + '33', borderColor: color } : {}

function arDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function excerpt(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="archive-entry hw-skeleton">
      <div className="archive-skel archive-skel--w45 skel-line skel-short" />
      <div className="archive-skel archive-skel--w80 skel-line skel-long" style={{ animationDelay: '.15s' }} />
      <div className="archive-skel archive-skel--w60 skel-line skel-medium" style={{ animationDelay: '.3s' }} />
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Archive() {
  const nav = useNavigate()
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSection, setSelectedSection] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<HwItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // ── load sections ─────────────────────────────────────────────────────────
  useEffect(() => {
    type GS = {
      student: {
        section: {
          id: number
          letter: string
          stage: { name: string; branch: string }
        }
      }
    }
    supabase
      .from('guardian_students')
      .select(
        'student:students!inner(section:sections!inner(id, letter, stage:stages!inner(name, branch)))'
      )
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as GS[]
        const seen = new Set<number>()
        const secs: Section[] = []
        rows.forEach(r => {
          const sec = r.student.section
          if (!seen.has(sec.id)) {
            seen.add(sec.id)
            secs.push({
              id: sec.id,
              label: `${sec.stage.name} ${sec.stage.branch} ‏/ ${sec.letter}`,
            })
          }
        })
        setSections(secs)
        if (secs.length > 0) setSelectedSection(secs[0].id)
      })
  }, [])

  // ── fetch homework ────────────────────────────────────────────────────────
  const fetchItems = useCallback(
    async (pageNum: number, query: string, sectionId: number | null) => {
      if (sectionId === null) return

      // cancel any in-flight request
      if (abortRef.current) abortRef.current.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      if (pageNum === 0) setLoading(true)
      else setLoadingMore(true)

      try {
        const from = pageNum * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let q = supabase
          .from('homework')
          .select('id,due_date,period,body,subject:subjects(name,color),teacher:teachers(full_name)')
          .eq('section_id', sectionId)
          .eq('status', 'published')
          .order('due_date', { ascending: false })
          .range(from, to)

        if (query.trim()) {
          // Try full-text search first, fall back gracefully if search column is missing
          q = q.textSearch('search', query.trim())
        }

        const { data, error } = await q

        if (ctrl.signal.aborted) return
        if (error) {
          // If textSearch fails (column not indexed), fall back to ilike
          if (query.trim() && error.code === '42703') {
            const { data: fallback } = await supabase
              .from('homework')
              .select('id,due_date,period,body,subject:subjects(name,color),teacher:teachers(full_name)')
              .eq('section_id', sectionId)
              .eq('status', 'published')
              .or(`body.ilike.%${query.trim()}%`)
              .order('due_date', { ascending: false })
              .range(from, to)
            const rows = (fallback ?? []) as unknown as HwItem[]
            setItems(prev => (pageNum === 0 ? rows : [...prev, ...rows]))
            setHasMore(rows.length === PAGE_SIZE)
          }
        } else {
          const rows = (data ?? []) as unknown as HwItem[]
          setItems(prev => (pageNum === 0 ? rows : [...prev, ...rows]))
          setHasMore(rows.length === PAGE_SIZE)
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false)
          setSearching(false)
          setLoadingMore(false)
        }
      }
    },
    []
  )

  // ── trigger fetch when search/section/page changes ────────────────────────
  useEffect(() => {
    if (selectedSection === null) return
    setPage(0)
    if (search.trim()) setSearching(true)
    fetchItems(0, search, selectedSection)
  }, [search, selectedSection, fetchItems])

  // ── load more ─────────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchItems(nextPage, search, selectedSection)
  }, [page, search, selectedSection, fetchItems])

  // ── section change resets page ────────────────────────────────────────────
  const handleSectionChange = useCallback((id: number) => {
    setSelectedSection(id)
    setPage(0)
    setItems([])
  }, [])

  // ── sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(
    () => supabase.auth.signOut().then(() => nav('/login')),
    [nav]
  )

  const currentSectionLabel = sections.find(s => s.id === selectedSection)?.label ?? 'إعدادية الرميلة للبنين'

  return (
    <main
      dir="rtl"
      className="archive-wrap screen today"
      style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* ── Unified Header ── */}
      <PageHeader
        title="أرشيف الواجبات"
        subtitle={currentSectionLabel}
        onBack={() => nav('/')}
        backLabel="العودة للرئيسية"
      />

      <div className="archive-body">
        {/* search bar */}
        <HomeworkSearch
          value={search}
          onChange={val => {
            setSearch(val)
            setPage(0)
          }}
          placeholder="ابحث في الواجبات..."
        />

        {/* section selector (only if multiple children) */}
        {sections.length > 1 && (
          <nav className="archive-tabs child-tabs" aria-label="اختر الشعبة">
            {sections.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSectionChange(s.id)}
                className={`archive-tab tab${selectedSection === s.id ? ' archive-tab--active active' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        )}

        {/* content */}
        {(loading || searching) && items.length === 0 ? (
          <div className="archive-list hw-list" aria-busy="true" aria-label="جارٍ التحميل">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BookIcon size={36} />}
            title="لا واجبات هنا"
            subtitle={search.trim() ? 'جرّب كلمات بحث مختلفة' : 'لم يُنشر أي واجب بعد'}
          />
        ) : (
          <>
            <div className="archive-list hw-list">
              {items.map(item => (
                <article key={item.id} className="archive-entry hw-card">
                  <p className="archive-entry__date" style={{ margin: 0, fontSize: '.82rem', color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <CalendarIcon size={14} />
                    <span>{arDate(item.due_date)}</span>
                  </p>
                  <div className="archive-chips hw-header">
                    {item.period != null && (
                      <span className="archive-chip archive-chip--muted hw-period-circle" aria-label={`حصة ${item.period}`}>
                        {item.period}
                      </span>
                    )}
                    {item.subject && (
                      <span className="archive-chip subject-chip" style={chipStyle(item.subject.color)}>
                        {item.subject.name}
                      </span>
                    )}
                    {item.teacher && (
                      <span className="archive-entry__teacher teacher-name">
                        {item.teacher.full_name}
                      </span>
                    )}
                  </div>
                  <p className="archive-entry__body hw-body">
                    {excerpt(item.body)}
                  </p>
                </article>
              ))}
            </div>

            {hasMore && (
              <button
                type="button"
                className="archive-load-more icon-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <Spinner size={20} /> : 'تحميل المزيد'}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Unified 5-Item Bottom Navigation Bar ── */}
      <BottomNavBar onLogout={signOut} />
    </main>
  )
}
