import { useState, useEffect, useCallback, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { HomeworkSearch } from '../components/HomeworkSearch'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'

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
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'grid',
        gap: 8,
      }}
    >
      <div
        style={{
          height: 18,
          width: '45%',
          borderRadius: 6,
          background: 'var(--surface3)',
          animation: 'pulse 1.4s ease infinite',
        }}
      />
      <div
        style={{
          height: 14,
          width: '80%',
          borderRadius: 6,
          background: 'var(--surface3)',
          animation: 'pulse 1.4s ease infinite',
          animationDelay: '.15s',
        }}
      />
      <div
        style={{
          height: 14,
          width: '60%',
          borderRadius: 6,
          background: 'var(--surface3)',
          animation: 'pulse 1.4s ease infinite',
          animationDelay: '.3s',
        }}
      />
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

  return (
    <main dir="rtl" style={{ maxWidth: 520, margin: '0 auto', padding: '0 0 env(safe-area-inset-bottom)' }}>
      {/* header */}
      <div
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>أرشيف الواجبات</h1>
          {sections.length > 0 && selectedSection !== null && (
            <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
              {sections.find(s => s.id === selectedSection)?.label ?? ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => nav('/')}
            style={{
              background: 'transparent',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: '.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            اليوم
          </button>
          <button
            onClick={signOut}
            style={{
              background: 'transparent',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: '.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            خروج
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', display: 'grid', gap: 12 }}>
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
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => handleSectionChange(s.id)}
                style={{
                  padding: '7px 16px',
                  fontSize: '.85rem',
                  fontWeight: 600,
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  background: selectedSection === s.id ? 'var(--accent)' : 'var(--card)',
                  color: selectedSection === s.id ? '#111' : 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>
        )}

        {/* pulse keyframe */}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>

        {/* content */}
        {(loading || searching) && items.length === 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="📭"
            title="لا واجبات هنا"
            subtitle={search.trim() ? 'جرّب كلمات بحث مختلفة' : 'لم يُنشر أي واجب بعد'}
          />
        ) : (
          <>
            <div style={{ display: 'grid', gap: 10 }}>
              {items.map(item => (
                <article
                  key={item.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  {/* date */}
                  <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                    {arDate(item.due_date)}
                  </p>

                  {/* chips row */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {item.subject && (
                      <span
                        style={{
                          ...chipStyle(item.subject.color),
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '.82rem',
                          fontWeight: 700,
                          border: '1px solid var(--border)',
                        }}
                      >
                        {item.subject.name}
                      </span>
                    )}
                    {item.period != null && (
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '.78rem',
                          border: '1px solid var(--border)',
                          color: 'var(--muted)',
                        }}
                      >
                        حصة {item.period}
                      </span>
                    )}
                    {item.teacher && (
                      <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                        {item.teacher.full_name}
                      </span>
                    )}
                  </div>

                  {/* body excerpt */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: '.95rem',
                      lineHeight: 1.6,
                      color: 'var(--fg)',
                    }}
                  >
                    {excerpt(item.body)}
                  </p>
                </article>
              ))}
            </div>

            {/* load more */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--fg)',
                  padding: '12px',
                  fontSize: '.9rem',
                  cursor: loadingMore ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loadingMore ? <Spinner size={20} /> : 'تحميل المزيد'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
