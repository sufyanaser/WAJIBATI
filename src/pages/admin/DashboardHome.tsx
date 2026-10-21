import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface Stats {
  sections: number
  students: number
  guardians: number
  teachers: number
  homeworkToday: number
  noticesActive: number
}

interface Assignment {
  teacher_name: string
  subject_name: string
  section_label: string
}

// ── nav cards ──────────────────────────────────────────────────────────────────

const navCards = [
  { label: 'الطلاب',               icon: '🎓', route: '/admin/master-data?entity=students',   statKey: 'students' as const },
  { label: 'المدرسون',             icon: '👥', route: '/admin/master-data?entity=teachers',   statKey: 'teachers' as const },
  { label: 'الواجبات',             icon: '📚', route: '/admin/homework',                       statKey: 'homeworkToday' as const },
  { label: 'الجدول الدراسي',       icon: '📅', route: '/admin/master-data?entity=timetable',  statKey: 'sections' as const },
  { label: 'الحسابات والصلاحيات', icon: '🛡', route: '/admin/import',                        statKey: 'noticesActive' as const },
  { label: 'أولياء الأمور',        icon: '👨‍👩‍👧', route: '/admin/master-data?entity=guardians', statKey: 'guardians' as const },
]

const statLabels: Record<keyof Stats, string> = {
  students:      'طالب',
  teachers:      'مدرس',
  homeworkToday: 'واجب اليوم',
  sections:      'شعبة',
  noticesActive: 'إشعار فعال',
  guardians:     'ولي أمر',
}

// ── component ──────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const nav = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toLocaleDateString('en-CA')
      const [secs, studs, guards, teachers, hw, notices, ta] = await Promise.all([
        supabase.from('sections').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('guardians').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('homework').select('id', { count: 'exact', head: true })
          .eq('due_date', today).eq('status', 'published'),
        supabase.from('notices').select('id', { count: 'exact', head: true })
          .lte('publish_at', new Date().toISOString())
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()),
        supabase.from('timetable')
          .select('teacher:teachers(full_name), subject:subjects(name), section:sections(letter, stage:stages(name, branch))')
          .not('teacher_id', 'is', null)
          .limit(6),
      ])

      setStats({
        sections:      secs.count   ?? 0,
        students:      studs.count  ?? 0,
        guardians:     guards.count ?? 0,
        teachers:      teachers.count ?? 0,
        homeworkToday: hw.count     ?? 0,
        noticesActive: notices.count ?? 0,
      })

      type TaRow = {
        teacher: { full_name: string } | null
        subject: { name: string } | null
        section: { letter: string; stage: { name: string; branch: string } } | null
      }

      const rows = ((ta.data ?? []) as unknown as TaRow[])
        .filter(r => r.teacher && r.subject && r.section)
        .map(r => ({
          teacher_name:  r.teacher!.full_name,
          subject_name:  r.subject!.name,
          section_label: `${r.section!.stage.name} ${r.section!.stage.branch} / ${r.section!.letter}`,
        }))

      setAssignments(rows)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 20 }}>

      {/* ── school header ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>🎓</span>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>
            واجباتي | لوحة الإدارة
          </h1>
          <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--muted)', marginTop: 2 }}>
            مركز إدارة المدرسة
          </p>
        </div>
      </div>

      {/* ── nav card grid ──────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {navCards.map(card => (
          <button
            key={card.route}
            onClick={() => nav(card.route)}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '20px 16px',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              transition: 'border-color .15s, background .15s',
              color: 'var(--fg)',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--card2)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--card)'
            }}
          >
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{card.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{card.label}</span>
            {stats && (
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                {stats[card.statKey]} {statLabels[card.statKey]}
              </span>
            )}
            {loading && !stats && (
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>…</span>
            )}
          </button>
        ))}
      </div>

      {/* ── teacher assignments preview ────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            إسناد المدرسين الحالي
          </h2>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: '16px 18px' }}>جارٍ التحميل…</p>
        ) : assignments.length === 0 ? (
          <p className="muted" style={{ padding: '16px 18px' }}>
            لا توجد بيانات جدول — أضف مواد ومدرسين ثم ابنِ الجدول الدراسي
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--card2)' }}>
                  {['المدرس', 'المادة', 'الصف والشعبة'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{a.teacher_name}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{a.subject_name}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{a.section_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ margin: 0, padding: '8px 16px 12px', fontSize: '.75rem', color: 'var(--faint)' }}>
              بيانات حقيقية من جدول الحصص — لإدارة التفاصيل انتقل إلى الجدول الدراسي
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
