import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface StudentRef { id: number; full_name: string }
interface Guardian {
  id: string
  full_name: string | null
  phone: string
  active: boolean
  last_seen_at: string | null
  students: StudentRef[]
}

const rowStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '12px 14px',
  display: 'grid',
  gap: 6,
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('guardians')
      .select(`
        id, full_name, phone, active, last_seen_at,
        guardian_students(student_id, student:students(id, full_name))
      `)
      .order('full_name')
    if (error) { setErr(error.message); setLoading(false); return }
    const rows: Guardian[] = ((data ?? []) as unknown as Array<{
      id: string; full_name: string | null; phone: string; active: boolean; last_seen_at: string | null
      guardian_students: Array<{ student: { id: number; full_name: string } }>
    }>).map(g => ({
      id: g.id,
      full_name: g.full_name,
      phone: g.phone,
      active: g.active,
      last_seen_at: g.last_seen_at,
      students: g.guardian_students.map(gs => gs.student),
    }))
    setGuardians(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(g: Guardian) {
    if (!g.active) {
      // reactivating — no warning needed
    } else {
      if (!window.confirm(`تحذير: تعطيل حساب ${g.full_name ?? g.phone} سيمنعه من تسجيل الدخول وعرض الواجبات. هل تريد المتابعة؟`)) return
    }
    setToggling(g.id)
    const { error } = await supabase.from('guardians').update({ active: !g.active }).eq('id', g.id)
    if (error) { setErr(error.message) } else {
      setGuardians(prev => prev.map(x => x.id === g.id ? { ...x, active: !x.active } : x))
    }
    setToggling(null)
  }

  const q = search.trim().toLowerCase()
  const visible = q
    ? guardians.filter(g =>
        (g.full_name ?? '').toLowerCase().includes(q) || g.phone.includes(q)
      )
    : guardians

  function formatDate(iso: string | null) {
    if (!iso) return 'لم يدخل بعد'
    return new Date(iso).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>أولياء الأمور</h2>
        <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
          {guardians.filter(g => g.active).length} نشط / {guardians.length} إجمالي
        </span>
      </div>

      <input
        placeholder="بحث باسم أو رقم الهاتف…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: 'var(--fg)', fontSize: '.95rem' }}
      />

      {err && <p className="err">{err}</p>}

      {loading
        ? <p className="muted">جارٍ التحميل…</p>
        : visible.length === 0
          ? <p className="muted">{q ? 'لا نتائج للبحث' : 'لا يوجد أولياء أمور مسجلون'}</p>
          : (
            <div style={{ display: 'grid', gap: 6 }}>
              {visible.map(g => (
                <div key={g.id} style={{ ...rowStyle, opacity: g.active ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>
                        {g.full_name ?? '—'}
                        {!g.active && (
                          <span style={{ marginRight: 8, fontSize: '.75rem', color: 'var(--err)', fontWeight: 400 }}>معطّل</span>
                        )}
                      </div>
                      <div style={{ fontSize: '.82rem', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>{g.phone}</div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ fontSize: '.8rem', flexShrink: 0, color: g.active ? 'var(--muted)' : 'var(--accent)' }}
                      disabled={toggling === g.id}
                      onClick={() => toggleActive(g)}
                    >
                      {toggling === g.id ? '…' : g.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </div>

                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>
                      الطلاب:{' '}
                      {g.students.length === 0
                        ? <span style={{ color: 'var(--err)' }}>لا يوجد ارتباط</span>
                        : g.students.map(s => s.full_name).join('، ')}
                    </span>
                    <span>آخر دخول: {formatDate(g.last_seen_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  )
}
