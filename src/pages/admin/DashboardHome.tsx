import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  GraduationCapIcon,
  UsersIcon,
  BookIcon,
  CalendarIcon,
  ShieldIcon,
  BellIcon,
  FamilyIcon,
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

// ── nav cards ──────────────────────────────────────────────────────────────────

const navCards = [
  { label: 'الطلاب والشعب',        icon: GraduationCapIcon, route: '/admin/students',  statKey: 'students' as const },
  { label: 'الهيئة التدريسية',     icon: UsersIcon,          route: '/admin/teachers',  statKey: 'teachers' as const },
  { label: 'الواجبات اليومية',     icon: BookIcon,           route: '/admin/homework',  statKey: 'homeworkToday' as const },
  { label: 'الجدول الدراسي',       icon: CalendarIcon,       route: '/admin/timetable', statKey: 'sections' as const },
  { label: 'الإشعارات المدرسية',   icon: BellIcon,           route: '/admin/notices',   statKey: 'noticesActive' as const },
  { label: 'الإعدادات والصلاحيات', icon: ShieldIcon,         route: '/admin/settings',  statKey: 'guardians' as const },
]

const statLabels: Record<keyof Stats, string> = {
  students:      'طالب',
  teachers:      'مدرس',
  homeworkToday: 'واجب اليوم',
  sections:      'شعبة',
  noticesActive: 'إشعار فعال',
  guardians:     'ولي أمر',
  subjects:      'مادة',
}

// ── component ──────────────────────────────────────────────────────────────────

export default function DashboardHome() {
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

  return (
    <div dir="rtl" className="dash-page">
      {/* ── school header ──────────────────────────────────────────────── */}
      <div className="dash-header">
        <img src="/icon-192.png" alt="شعار المدرسة" className="dash-logo" width={54} height={54} />
        <div>
          <h1 className="dash-header__title">واجباتي | لوحة الإدارة — إعدادية الرميلة للبنين</h1>
          <p className="dash-header__sub">مركز إدارة المدرسة · مديرية تربية الأنبار · الرمادي</p>
        </div>
      </div>

      {/* ── nav card grid ──────────────────────────────────────────────── */}
      <div className="dash-grid">
        {navCards.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.route}
              type="button"
              className="dash-card"
              onClick={() => nav(card.route)}
            >
              <span className="dash-card__icon">
                <Icon size={24} />
              </span>
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
          )
        })}
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
              بيانات حقيقية من جدول الحصص وإسناد المدرسين — لإدارة التفاصيل انتقل إلى الجدول الدراسي
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
