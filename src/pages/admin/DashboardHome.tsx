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
    <div dir="rtl" className="dash-page">

      {/* ── school header ──────────────────────────────────────────────── */}
      <div className="dash-header">
        <span className="dash-header__icon">🎓</span>
        <div>
          <h1 className="dash-header__title">واجباتي | لوحة الإدارة</h1>
          <p className="dash-header__sub">مركز إدارة المدرسة</p>
        </div>
      </div>

      {/* ── nav card grid ──────────────────────────────────────────────── */}
      <div className="dash-grid">
        {navCards.map(card => (
          <button
            key={card.route}
            className="dash-card"
            onClick={() => nav(card.route)}
          >
            <span className="dash-card__icon">{card.icon}</span>
            <span className="dash-card__label">{card.label}</span>
            {stats && (
              <span className="dash-card__stat">
                {stats[card.statKey]} {statLabels[card.statKey]}
              </span>
            )}
            {loading && !stats && (
              <span className="dash-card__stat">…</span>
            )}
          </button>
        ))}
      </div>

      {/* ── teacher assignments preview ────────────────────────────────── */}
      <div className="dash-table-card">
        <div className="dash-table-card__head">
          <h2 className="dash-table-card__title">إسناد المدرسين الحالي</h2>
        </div>

        {loading ? (
          <p className="muted dash-table-card__empty">جارٍ التحميل…</p>
        ) : assignments.length === 0 ? (
          <p className="muted dash-table-card__empty">
            لا توجد بيانات جدول — أضف مواد ومدرسين ثم ابنِ الجدول الدراسي
          </p>
        ) : (
          <div className="dash-table-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  {['المدرس', 'المادة', 'الصف والشعبة'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={i}>
                    <td className="dash-table__name">{a.teacher_name}</td>
                    <td className="dash-table__muted">{a.subject_name}</td>
                    <td className="dash-table__muted">{a.section_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="dash-table__note">
              بيانات حقيقية من جدول الحصص — لإدارة التفاصيل انتقل إلى الجدول الدراسي
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
