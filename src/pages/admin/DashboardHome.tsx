import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSchoolSettings } from '../../services/schoolSettings'
import {
  UsersIcon,
  BookIcon,
  CalendarIcon,
  ShieldIcon,
  BellIcon,
  DatabaseIcon,
} from '../../components/Icons'

// ── types ──────────────────────────────────────────────────────────────────────

interface Stats {
  sections: number
  students: number
  guardians: number
  teachers: number
  subjects: number
  homeworkToday: number
  noticesActive: number
}

interface AssignmentRow {
  teacher_name: string
  subject_name: string
  section_label: string
}

// ── quick actions (phone list) ─────────────────────────────────────────────────

const quickActions = [
  { label: 'الواجبات اليومية', hint: 'إدخال ونشر واجبات اليوم لكل شعبة', icon: BookIcon, route: '/admin/homework' },
  { label: 'الجدول الدراسي', hint: 'الحصص والمدرسون حسب الشعبة', icon: CalendarIcon, route: '/admin/timetable' },
  { label: 'الإعلانات والتنبيهات', hint: 'تعميمات تظهر لأولياء الأمور', icon: BellIcon, route: '/admin/notices' },
  { label: 'قاعدة البيانات المدرسية', hint: 'الطلاب والشعب والمواد والاستيراد', icon: DatabaseIcon, route: '/admin/master-data' },
  { label: 'الهيئة التدريسية', hint: 'المعلمون وتوزيع المواد', icon: UsersIcon, route: '/admin/teachers' },
  { label: 'الإعدادات والصلاحيات', hint: 'الحسابات وبيئة التشغيل', icon: ShieldIcon, route: '/admin/settings' },
]

const statLabels: Record<keyof Stats, string> = {
  students:      'طالب مسجل',
  teachers:      'مدرس نشط',
  homeworkToday: 'واجب اليوم',
  sections:      'شعبة دراسية',
  noticesActive: 'إعلان فعال',
  guardians:     'ولي أمر مرتبط',
  subjects:      'مادة دراسية',
}

// ── component ──────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { settings } = useSchoolSettings()
  const nav = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toLocaleDateString('en-CA')
      const nowIso = new Date().toISOString()

      const [secs, studs, guards, teachers, subjects, hw, notices, ta, tt] = await Promise.all([
        supabase.from('sections').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('guardians').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('homework').select('id', { count: 'exact', head: true })
          .eq('due_date', today).eq('status', 'published'),
        supabase.from('notices').select('id', { count: 'exact', head: true })
          .lte('publish_at', nowIso)
          .or('expires_at.is.null,expires_at.gt.' + nowIso),
        supabase.from('teaching_assignments')
          .select('teacher:teachers(full_name), subject:subjects(name), section:sections(letter, stage:stages(name, branch))')
          .eq('active', true)
          .order('id'),
        supabase.from('timetable')
          .select('teacher:teachers(full_name), subject:subjects(name), section:sections(letter, stage:stages(name, branch))')
          .not('teacher_id', 'is', null)
          .limit(8),
      ])

      setStats({
        sections:      secs.count     ?? 0,
        students:      studs.count    ?? 0,
        guardians:     guards.count   ?? 0,
        teachers:      teachers.count ?? 0,
        subjects:      subjects.count ?? 0,
        homeworkToday: hw.count       ?? 0,
        noticesActive: notices.count  ?? 0,
      })

      type RawRow = {
        teacher: { full_name: string } | null
        subject: { name: string } | null
        section: { letter: string; stage: { name: string; branch: string } } | null
      }

      const rawTa = (ta.data ?? []) as unknown as RawRow[]
      const rawTt = (tt.data ?? []) as unknown as RawRow[]
      const source = rawTa.length > 0 ? rawTa : rawTt

      const map = new Map<string, { teacher_name: string; subject_name: string; sections: string[] }>()
      for (const r of source) {
        if (!r.teacher || !r.subject || !r.section) continue
        const key = `${r.teacher.full_name}|||${r.subject.name}`
        const secLabel = `${r.section.stage.name} ${r.section.stage.branch} / ${r.section.letter}`
        const existing = map.get(key)
        if (existing) {
          if (!existing.sections.includes(secLabel)) existing.sections.push(secLabel)
        } else {
          map.set(key, {
            teacher_name: r.teacher.full_name,
            subject_name: r.subject.name,
            sections: [secLabel],
          })
        }
      }

      setAssignments(
        Array.from(map.values()).map(v => ({
          teacher_name: v.teacher_name,
          subject_name: v.subject_name,
          section_label: v.sections.join(' ، '),
        }))
      )
      setLoading(false)
    }
    void load()
  }, [])

  const kpis: Array<{ key: keyof Stats; label: string; featured?: boolean }> = [
    { key: 'homeworkToday', label: 'واجب اليوم', featured: true },
    { key: 'students', label: 'طالب مسجل' },
    { key: 'guardians', label: 'ولي أمر مرتبط' },
    { key: 'teachers', label: 'مدرس نشط' },
    { key: 'sections', label: 'شعبة دراسية' },
    { key: 'noticesActive', label: 'إعلان فعال' },
  ]

  return (
    <div dir="rtl" className="dash-page dash-page--home">
      {/* ── school header ──────────────────────────────────────────────── */}
      <div className="dash-header">
        <img src="/icon-192.png" alt="شعار المدرسة" className="dash-logo" width={54} height={54} />
        <div>
          <h1 className="dash-header__title">واجباتي | لوحة الإدارة</h1>
          <p className="dash-header__sub">{settings.name || 'مركز إدارة المدرسة'}</p>
        </div>
      </div>

      {/* ── quick actions first (primary tasks before statistics) ─────── */}
      <section className="dash-section dash-section--actions" aria-label="إجراءات سريعة">
        <h2 className="dash-section__title">إجراءات سريعة</h2>
        <div className="dash-list">
          {quickActions.map(a => {
            const Icon = a.icon
            return (
              <button key={a.route} type="button" className="dash-list__row" onClick={() => nav(a.route)}>
                <span className="dash-list__icon"><Icon size={20} /></span>
                <span className="dash-list__text">
                  <span className="dash-list__title">{a.label}</span>
                  <span className="dash-list__hint">{a.hint}</span>
                </span>
                <span className="dash-list__chev" aria-hidden="true">‹</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── KPI tiles (below actions; full row on desktop) ─────────────── */}
      <section className="dash-kpis" aria-label="مؤشرات سريعة">
        {kpis.map(k => (
          <div key={k.key} className={`dash-kpi ${k.featured ? 'dash-kpi--featured' : ''}`}>
            <span className="dash-kpi__value">{stats ? stats[k.key] : '…'}</span>
            <span className="dash-kpi__label">{k.label}</span>
          </div>
        ))}
      </section>

      {/* ── teacher assignments ────────────────────────────────────────── */}
      <section className="dash-section dash-section--assign">
        <h2 className="dash-section__title">إسناد المدرسين الحالي</h2>

        {loading ? (
          <p className="muted dash-table-card__empty">جارٍ التحميل…</p>
        ) : assignments.length === 0 ? (
          <p className="muted dash-table-card__empty">
            لا توجد بيانات جدول — أضف مواد ومدرسين ثم ابنِ الجدول الدراسي
          </p>
        ) : (
          <>
            <div className="dash-list dash-list--assignments">
              {assignments.map((a, i) => (
                <div key={i} className="dash-list__row dash-list__row--static">
                  <span className="dash-list__text">
                    <span className="dash-list__title">{a.teacher_name}</span>
                    <span className="dash-list__hint">{a.subject_name} · {a.section_label}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="dash-table-scroll dash-table-scroll--desktop">
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
                بيانات حقيقية من جدول الحصص وإسناد المدرسين — لإدارة التفاصيل انتقل إلى الجدول الدراسي
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
