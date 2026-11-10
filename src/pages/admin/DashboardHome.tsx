import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSchoolSettings } from '../../services/schoolSettings'
import {
  GraduationCapIcon,
  UsersIcon,
  BookIcon,
  CalendarIcon,
  ShieldIcon,
  BellIcon,
  FamilyIcon,
  DatabaseIcon,
  ChevronLeftIcon,
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
  { label: 'الواجبات اليومية',        icon: BookIcon,           route: '/admin/homework',   statKey: 'homeworkToday' as const },
  { label: 'الجدول الدراسي',          icon: CalendarIcon,       route: '/admin/timetable',  statKey: 'sections' as const },
  { label: 'الإعلانات والتنبيهات',    icon: BellIcon,           route: '/admin/notices',    statKey: 'noticesActive' as const },
  { label: 'قاعدة البيانات المدرسية', icon: DatabaseIcon,       route: '/admin/master-data', statKey: 'students' as const },
  { label: 'الهيئة التدريسية',        icon: UsersIcon,          route: '/admin/teachers',   statKey: 'teachers' as const },
  { label: 'الإعدادات والصلاحيات',    icon: ShieldIcon,         route: '/admin/settings',   statKey: 'guardians' as const },
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

  const todayBaghdadFormatted = new Intl.DateTimeFormat('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div dir="rtl" className="dash-page">
      {/* ── Desktop View (Preserves canonical cards for RT-04) ── */}
      <div className="dash-desktop-view">
      {/* ── school header ──────────────────────────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header__brand">
          <img src="/icon-192.png" alt="شعار المدرسة" className="dash-logo" width={40} height={40} />
          <div>
            <h1 className="dash-header__title">واجباتي | لوحة الإدارة</h1>
            <p className="dash-header__sub">{settings.name || 'إعدادية الرميلة للبنين'} · مركز إدارة المدرسة</p>
          </div>
        </div>
        <div className="dash-header__date">
          <CalendarIcon size={14} />
          <span>{todayBaghdadFormatted}</span>
        </div>
      </div>

      {/* ── nav card grid ──────────────────────────────────────────────── */}
      <div className="dash-grid">
        {navCards.map(card => {
          const Icon = card.icon
          const count = stats ? stats[card.statKey] : null
          const label = statLabels[card.statKey]
          return (
            <button
              key={card.route}
              type="button"
              className="dash-card"
              onClick={() => nav(card.route)}
              title={`الانتقال إلى ${card.label}`}
            >
              <div className="dash-card__top">
                <span className="dash-card__icon">
                  <Icon size={18} />
                </span>
                <span className="dash-card__label">{card.label}</span>
              </div>
              <div className="dash-card__metric">
                <span className="dash-card__val">{loading ? '…' : count ?? 0}</span>
                <span className="dash-card__stat">
                  {label}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── 65% / 35% Desktop Split Workspace ───────────────────────────── */}
      <div className="dash-workspace-split">
        {/* Main 65% Column: Teacher Assignments Table */}
        <div className="dash-workspace-main">
          <div className="dash-table-card">
            <div className="dash-table-card__head">
              <h2 className="dash-table-card__title">إسناد المدرسين الحالي</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => nav('/admin/timetable')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', padding: '4px 10px' }}
              >
                <CalendarIcon size={13} />
                <span>عرض الجدول الدراسي</span>
              </button>
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
                        <td className="dash-table__name">{a.teacher_name || '—'}</td>
                        <td className="dash-table__muted">{a.subject_name || '—'}</td>
                        <td className="dash-table__muted">
                          {a.section_label ? (
                            <span className="dash-section-chip" title={a.section_label}>
                              {a.section_label}
                            </span>
                          ) : '—'}
                        </td>
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

        {/* Side 35% Column: Quick Operations */}
        <aside className="dash-workspace-side">
          <div className="dash-quick-ops-card">
            <div className="dash-quick-ops-head">
              <h3 className="dash-quick-ops-title">العمليات والروابط السريعة</h3>
            </div>
            <div className="dash-quick-ops-list">
              <button
                type="button"
                className="dash-quick-op-btn"
                onClick={() => nav('/admin/homework')}
              >
                <div className="dash-quick-op-lead">
                  <BookIcon size={16} />
                  <span>إضافة ونشر واجب جديد</span>
                </div>
                <ChevronLeftIcon size={14} className="dash-quick-op-arrow" />
              </button>
              <button
                type="button"
                className="dash-quick-op-btn"
                onClick={() => nav('/admin/timetable')}
              >
                <div className="dash-quick-op-lead">
                  <CalendarIcon size={16} />
                  <span>تعديل جدول الحصص الأسبوعي</span>
                </div>
                <ChevronLeftIcon size={14} className="dash-quick-op-arrow" />
              </button>
              <button
                type="button"
                className="dash-quick-op-btn"
                onClick={() => nav('/admin/notices')}
              >
                <div className="dash-quick-op-lead">
                  <BellIcon size={16} />
                  <span>إرسال تعميم أو إشعار</span>
                </div>
                <ChevronLeftIcon size={14} className="dash-quick-op-arrow" />
              </button>
              <button
                type="button"
                className="dash-quick-op-btn"
                onClick={() => nav('/admin/students')}
              >
                <div className="dash-quick-op-lead">
                  <GraduationCapIcon size={16} />
                  <span>دليل الطلاب وقوائم الفصول ({stats?.students ?? '…'})</span>
                </div>
                <ChevronLeftIcon size={14} className="dash-quick-op-arrow" />
              </button>
              <button
                type="button"
                className="dash-quick-op-btn"
                onClick={() => nav('/admin/guardians')}
              >
                <div className="dash-quick-op-lead">
                  <FamilyIcon size={16} />
                  <span>إدارة أولياء الأمور والربط ({stats?.guardians ?? '…'})</span>
                </div>
                <ChevronLeftIcon size={14} className="dash-quick-op-arrow" />
              </button>
            </div>
          </div>
        </aside>
      </div>
      </div>

      {/* ── Mobile App Dashboard (Touch-First dedicated experience) ── */}
      <div className="dash-mobile-view">
        {/* Mobile Hero Header — Compact & Refined */}
        <div className="dash-mob-hero">
          <div className="dash-mob-hero-top">
            <div className="dash-mob-hero-school">
              <img src="/icon-192.png" alt="شعار المدرسة" width={34} height={34} className="dash-mob-logo" />
              <div className="dash-mob-school-info">
                <span className="dash-mob-school-name">{settings.name || 'إعدادية الرميلة للبنين'}</span>
                <span className="dash-mob-school-meta">لوحة الإدارة · {todayBaghdadFormatted}</span>
              </div>
            </div>
            <span className="badge badge-gold dash-mob-live-badge">مباشر</span>
          </div>
        </div>

        {/* 4 Primary Touch-First Action Tiles (Balanced 2-Column Grid, Unified Heights) */}
        <div className="dash-mob-actions-title">
          <span>العمليات اليومية السريعة</span>
        </div>
        <div className="dash-mob-actions-grid">
          {/* Action 1: Homework */}
          <button
            type="button"
            className="dash-mob-action-card"
            onClick={() => nav('/admin/homework')}
            aria-label="تسجيل واجبات اليوم"
          >
            <div className="dash-mob-action-top">
              <span className="dash-mob-action-icon dash-mob-icon-blue">
                <BookIcon size={20} />
              </span>
              <ChevronLeftIcon size={16} className="dash-mob-action-arrow" />
            </div>
            <div className="dash-mob-action-text">
              <strong className="dash-mob-action-heading">تسجيل واجبات اليوم</strong>
              <span className="dash-mob-action-sub">
                {stats ? `${stats.homeworkToday} واجب مسجل اليوم` : 'فتح الواجبات اليومية'}
              </span>
            </div>
          </button>

          {/* Action 2: Timetable */}
          <button
            type="button"
            className="dash-mob-action-card"
            onClick={() => nav('/admin/timetable')}
            aria-label="جدول الحصص اليومي"
          >
            <div className="dash-mob-action-top">
              <span className="dash-mob-action-icon dash-mob-icon-gold">
                <CalendarIcon size={20} />
              </span>
              <ChevronLeftIcon size={16} className="dash-mob-action-arrow" />
            </div>
            <div className="dash-mob-action-text">
              <strong className="dash-mob-action-heading">جدول الحصص اليومي</strong>
              <span className="dash-mob-action-sub">
                {stats ? `${stats.sections} شعبة مسندة` : 'إدارة جدول الحصص'}
              </span>
            </div>
          </button>

          {/* Action 3: Notices */}
          <button
            type="button"
            className="dash-mob-action-card"
            onClick={() => nav('/admin/notices')}
            aria-label="التعميمات والتنبيهات"
          >
            <div className="dash-mob-action-top">
              <span className="dash-mob-action-icon dash-mob-icon-amber">
                <BellIcon size={20} />
              </span>
              <ChevronLeftIcon size={16} className="dash-mob-action-arrow" />
            </div>
            <div className="dash-mob-action-text">
              <strong className="dash-mob-action-heading">التعميمات والتنبيهات</strong>
              <span className="dash-mob-action-sub">
                {stats ? `${stats.noticesActive} إعلان منشور` : 'نشر تعميم مدرسي'}
              </span>
            </div>
          </button>

          {/* Action 4: Students */}
          <button
            type="button"
            className="dash-mob-action-card"
            onClick={() => nav('/admin/students')}
            aria-label="دليل وسجلات الطلاب"
          >
            <div className="dash-mob-action-top">
              <span className="dash-mob-action-icon dash-mob-icon-teal">
                <GraduationCapIcon size={20} />
              </span>
              <ChevronLeftIcon size={16} className="dash-mob-action-arrow" />
            </div>
            <div className="dash-mob-action-text">
              <strong className="dash-mob-action-heading">دليل وسجلات الطلاب</strong>
              <span className="dash-mob-action-sub">
                {stats ? `${stats.students} طالب مسجل` : 'استعراض السجلات'}
              </span>
            </div>
          </button>
        </div>

        {/* Key Metrics Strip (Balanced Counter Cards, Unified Heights) */}
        <div className="dash-mob-metrics-title">
          <span>المؤشرات والبيانات المدرسية</span>
        </div>
        <div className="dash-mob-metrics-strip">
          <button
            type="button"
            className="dash-mob-metric-chip"
            onClick={() => nav('/admin/guardians')}
            aria-label="أولياء الأمور"
          >
            <span className="dash-mob-chip-icon"><FamilyIcon size={18} /></span>
            <span className="dash-mob-metric-val">{stats?.guardians ?? '…'}</span>
            <span className="dash-mob-metric-lbl">أولياء الأمور</span>
          </button>

          <button
            type="button"
            className="dash-mob-metric-chip"
            onClick={() => nav('/admin/teachers')}
            aria-label="المعلمون"
          >
            <span className="dash-mob-chip-icon"><UsersIcon size={18} /></span>
            <span className="dash-mob-metric-val">{stats?.teachers ?? '…'}</span>
            <span className="dash-mob-metric-lbl">المعلمون</span>
          </button>

          <button
            type="button"
            className="dash-mob-metric-chip"
            onClick={() => nav('/admin/master-data')}
            aria-label="المواد"
          >
            <span className="dash-mob-chip-icon"><DatabaseIcon size={18} /></span>
            <span className="dash-mob-metric-val">{stats?.subjects ?? '…'}</span>
            <span className="dash-mob-metric-lbl">المواد</span>
          </button>
        </div>

        {/* Recent Assignments / Schedule Preview */}
        <div className="dash-mob-section">
          <div className="dash-mob-section-head">
            <span className="dash-mob-section-title">توزيع الحصص والمدرسين</span>
            <button
              type="button"
              className="dash-mob-see-all"
              onClick={() => nav('/admin/timetable')}
            >
              عرض الجدول
            </button>
          </div>
          <div className="dash-cards-mobile" style={{ display: 'grid', gap: 8 }}>
            {loading ? (
              <p className="muted" style={{ padding: 12 }}>جارٍ التحميل…</p>
            ) : assignments.length === 0 ? (
              <p className="muted" style={{ padding: 12 }}>لا توجد بيانات حصص حالياً</p>
            ) : (
              assignments.slice(0, 5).map((a, i) => (
                <div key={i} className="admin-mobile-card">
                  <div className="admin-mobile-card-header">
                    <h3 className="admin-mobile-card-title">{a.teacher_name || '—'}</h3>
                    <span className="badge">{a.subject_name || '—'}</span>
                  </div>
                  <div className="admin-mobile-card-body">
                    <div className="admin-mobile-card-row">
                      <span className="admin-mobile-card-label">الشعب:</span>
                      <span style={{ fontSize: '0.86rem', color: '#B3C0D0' }}>{a.section_label || '—'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
