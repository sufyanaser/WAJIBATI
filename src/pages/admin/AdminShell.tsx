import React, { useEffect, useState, createContext, useContext, useMemo } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useSchoolSettings } from '../../services/schoolSettings'
import {
  HomeIcon,
  BookIcon,
  CalendarIcon,
  UsersIcon,
  GraduationCapIcon,
  BellIcon,
  ImportIcon,
  SettingsIcon,
  DatabaseIcon,
  LogOutIcon,
  MenuIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  type IconProps,
} from '../../components/Icons'

// ── Admin context (shared across child routes) ─────────────────────────────────

export interface AdminCtx {
  user: User | null
  role: 'owner' | 'editor' | 'viewer'
  ready: boolean
}

const AdminContext = createContext<AdminCtx>({ user: null, role: 'viewer', ready: false })
export const useAdmin = () => useContext(AdminContext)

// ── 6 Canonical School Workflow Sections (V2 Architecture) ────────────────────

interface NavSection {
  id: string
  label: string
  to: string
  icon: React.ComponentType<IconProps>
  matchPrefixes?: string[]
  subLinks?: Array<{ to: string; label: string }>
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'الرئيسية',
    to: '/admin/dashboard',
    icon: HomeIcon,
  },
  {
    id: 'homework',
    label: 'الواجبات اليومية',
    to: '/admin/homework',
    icon: BookIcon,
  },
  {
    id: 'timetable',
    label: 'الجدول الدراسي',
    to: '/admin/timetable',
    icon: CalendarIcon,
  },
  {
    id: 'notices',
    label: 'الإعلانات والتنبيهات',
    to: '/admin/notices',
    icon: BellIcon,
  },
  {
    id: 'database',
    label: 'قاعدة البيانات المدرسية',
    to: '/admin/master-data',
    icon: DatabaseIcon,
    matchPrefixes: [
      '/admin/master-data',
      '/admin/database',
      '/admin/students',
      '/admin/sections',
      '/admin/guardians',
      '/admin/teachers',
      '/admin/subjects',
      '/admin/import',
    ],
    subLinks: [
      { to: '/admin/students', label: 'دليل الطلاب' },
      { to: '/admin/sections', label: 'الشعب الدراسية' },
      { to: '/admin/guardians', label: 'أولياء الأمور' },
      { to: '/admin/teachers', label: 'المعلمون' },
      { to: '/admin/subjects', label: 'المواد الدراسية' },
      { to: '/admin/master-data', label: 'سجل البيانات الشامل' },
      { to: '/admin/import', label: 'الاستيراد الجماعي' },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات والصلاحيات',
    to: '/admin/settings',
    icon: SettingsIcon,
  },
]


// ── Phone bottom tabs and More sheet ──────────────────────────────────────────

const TAB_ITEMS: Array<{ to: string; label: string; icon: React.ComponentType<IconProps> }> = [
  { to: '/admin/dashboard', label: 'الرئيسية', icon: HomeIcon },
  { to: '/admin/homework', label: 'الواجبات', icon: BookIcon },
  { to: '/admin/timetable', label: 'الجدول', icon: CalendarIcon },
  { to: '/admin/notices', label: 'الإعلانات', icon: BellIcon },
]

const MORE_DATABASE_LINKS: Array<{ to: string; label: string }> = [
  { to: '/admin/students', label: 'دليل الطلاب' },
  { to: '/admin/sections', label: 'الشعب الدراسية' },
  { to: '/admin/guardians', label: 'أولياء الأمور' },
  { to: '/admin/teachers', label: 'المعلمون' },
  { to: '/admin/subjects', label: 'المواد الدراسية' },
  { to: '/admin/master-data', label: 'سجل البيانات الشامل' },
  { to: '/admin/import', label: 'الاستيراد الجماعي' },
]

// ── Breadcrumbs & Page Metadata ────────────────────────────────────────────────

function getPageMeta(pathname: string): { section: string; title: string } {
  if (pathname.startsWith('/admin/dashboard')) return { section: 'الرئيسية', title: 'لوحة المؤشرات والملخص' }
  if (pathname.startsWith('/admin/homework')) return { section: 'الواجبات اليومية', title: 'إدخال ونشر الواجبات' }
  if (pathname.startsWith('/admin/timetable')) return { section: 'الجدول الدراسي', title: 'الجدول الأسبوعي وتوزيع الحصص' }
  if (pathname.startsWith('/admin/notices')) return { section: 'الإعلانات والتنبيهات', title: 'التعميمات والتنبيهات المدرسية' }
  if (pathname.startsWith('/admin/teachers')) return { section: 'قاعدة البيانات المدرسية', title: 'سجل المعلمين وتوزيع المواد' }
  if (pathname.startsWith('/admin/subjects')) return { section: 'قاعدة البيانات المدرسية', title: 'دليل المواد الدراسية' }
  if (pathname.startsWith('/admin/students')) return { section: 'قاعدة البيانات المدرسية', title: 'دليل الطلاب وقوائم الفصول' }
  if (pathname.startsWith('/admin/sections')) return { section: 'قاعدة البيانات المدرسية', title: 'إدارة الشعب والمراحل' }
  if (pathname.startsWith('/admin/guardians')) return { section: 'قاعدة البيانات المدرسية', title: 'سجل أولياء الأمور والربط' }
  if (pathname.startsWith('/admin/import')) return { section: 'قاعدة البيانات المدرسية', title: 'استيراد بيانات المدرسة الرئيسية' }
  if (pathname.startsWith('/admin/master-data') || pathname.startsWith('/admin/database')) return { section: 'قاعدة البيانات المدرسية', title: 'مركز السجلات وقاعدة البيانات المدرسية' }
  if (pathname.startsWith('/admin/settings')) return { section: 'الإعدادات والصلاحيات', title: 'إدارة الحسابات وبيئة التشغيل' }
  return { section: 'لوحة الإدارة', title: 'إدارة النظام' }
}

const ROLE_BADGES: Record<'owner' | 'editor' | 'viewer', { label: string; cls: string }> = {
  owner: { label: 'مالك النظام', cls: 'role-pill--owner' },
  editor: { label: 'محرر', cls: 'role-pill--editor' },
  viewer: { label: 'مشاهد', cls: 'role-pill--viewer' },
}

// ── component ──────────────────────────────────────────────────────────────────

export default function AdminShell() {
  const nav = useNavigate()
  const location = useLocation()
  const { settings } = useSchoolSettings()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('viewer')
  const [ready, setReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Sidebar collapse state persisted in localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wajibati_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/admin/login', { replace: true }); return }
      const u = data.session.user
      const { data: adm, error } = await supabase
        .from('admins')
        .select('role')
        .eq('user_id', u.id)
        .maybeSingle()
      if (error || !adm) {
        await supabase.auth.signOut()
        nav('/admin/login', { replace: true })
        return
      }
      setUser(u)
      setRole((adm as { role: 'owner' | 'editor' | 'viewer' }).role)
      setReady(true)
    })
  }, [nav])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
    setMoreOpen(false)
  }, [location.pathname])

  // Close mobile drawer on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  // Lock body scroll when mobile drawer is open (prevents background scroll on iOS)
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem('wajibati_sidebar_collapsed', String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    nav('/admin/login')
  }

  // Active section metadata and sublinks
  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname])
  const activeSection = useMemo(() => {
    return NAV_SECTIONS.find(sec => {
      if (sec.matchPrefixes) {
        return sec.matchPrefixes.some(p => location.pathname.startsWith(p))
      }
      return location.pathname.startsWith(sec.to)
    })
  }, [location.pathname])

  if (!ready) {
    return (
      <main className="admin-shell-container" dir="rtl" style={{ maxWidth: 520, margin: '80px auto' }}>
        <p className="muted" style={{ textAlign: 'center', marginTop: 48 }}>جارٍ التحقق من صلاحيات الدخول…</p>
      </main>
    )
  }

  // Display username instead of synthetic @admin.rumaila.local email
  const displayName = user?.email
    ? user.email.replace(/@admin\.rumaila\.local$/i, '')
    : 'المشرف'

  const roleBadge = ROLE_BADGES[role] ?? ROLE_BADGES.viewer

  return (
    <AdminContext.Provider value={{ user, role, ready }}>
      <div className="admin-shell-layout" dir="rtl">
        {/* Mobile Backdrop */}
        <div
          className={`admin-mobile-backdrop ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden={!mobileOpen}
        />

        {/* ── Fixed Right-Hand RTL Sidebar ──────────────────────────────── */}
        <aside
          className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
          aria-label="القائمة الجانبية لإدارة المدرسة"
        >
          {/* Sidebar Header / Brand */}
          <div className="admin-sidebar-header">
            <Link to="/admin/dashboard" className="admin-sidebar-brand" title="الرئيسية">
              <img
                src="/icon-192.png"
                alt="واجباتي"
                className="admin-sidebar-logo"
                width={36}
                height={36}
              />
              <div className="admin-sidebar-brand-text">
                <span className="admin-sidebar-title">واجباتي</span>
                <span className="admin-sidebar-subtitle">{settings.name}</span>
              </div>
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              className="admin-sidebar-toggle"
              onClick={toggleCollapse}
              aria-label={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
              title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              {collapsed ? <ChevronLeftIcon size={16} /> : <ChevronRightIcon size={16} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="admin-sidebar-nav" aria-label="أقسام لوحة الإدارة">
            {NAV_SECTIONS.map(section => {
              const Icon = section.icon
              const isSectionActive = section.matchPrefixes
                ? section.matchPrefixes.some(p => location.pathname.startsWith(p))
                : (section.to === '/admin/dashboard'
                    ? location.pathname === '/admin/dashboard'
                    : location.pathname.startsWith(section.to))

              return (
                <div key={section.id} className="admin-nav-group">
                  <NavLink
                    to={section.to}
                    end={section.to === '/admin/dashboard'}
                    className={`admin-nav-item ${isSectionActive ? 'active' : ''}`}
                    title={collapsed ? section.label : undefined}
                    aria-label={section.label}
                  >
                    <Icon size={18} />
                    <span>{section.label}</span>
                  </NavLink>

                  {/* Sub-links when expanded and section is active */}
                  {!collapsed && isSectionActive && section.subLinks && (
                    <div className="admin-nav-sublinks">
                      {section.subLinks.map(sub => {
                        const isSubActive = location.pathname === sub.to || (sub.to !== section.to && location.pathname.startsWith(sub.to))
                        return (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            className={`admin-nav-sublink ${isSubActive ? 'active' : ''}`}
                          >
                            <span>{sub.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-user">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    direction: 'ltr',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </span>
                <span className={`role-pill ${roleBadge.cls}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="admin-sidebar-logout-btn"
              onClick={handleLogout}
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <LogOutIcon size={16} />
              <span>خروج</span>
            </button>
          </div>
        </aside>

        {/* ── Main Area Wrapper (Margin matches Sidebar in RTL) ─────────── */}
        <div className={`admin-main-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Sticky Top Bar */}
          <header className="admin-top-bar">
            <div className="admin-top-bar-start">
              {/* Mobile Menu Trigger */}
              <button
                type="button"
                className="admin-mobile-menu-btn"
                onClick={() => setMobileOpen(prev => !prev)}
                aria-label="فتح القائمة الرئيسية"
                aria-expanded={mobileOpen}
              >
                <MenuIcon size={20} />
              </button>

              {/* Breadcrumb Info */}
              <div className="admin-breadcrumb-wrap">
                <span className="admin-breadcrumb-section">{pageMeta.section}</span>
                <span className="admin-breadcrumb-sep">/</span>
                <h1 className="admin-breadcrumb-title">{pageMeta.title}</h1>
              </div>
            </div>

            <div className="admin-top-bar-end">
              <span
                className="badge-muted"
                style={{ direction: 'ltr', padding: '5px 12px', fontSize: '.78rem', display: 'inline-flex' }}
              >
                {displayName}
              </span>
              <span className={`role-pill role-pill--lg ${roleBadge.cls}`}>
                {roleBadge.label}
              </span>
            </div>
          </header>

          {/* ── Content Area with Independent Scroll ────────────────────── */}
          <main className="admin-content-area">
            {/* Multi-Entity Subnav Pills if current section has subLinks */}
            {activeSection?.subLinks && (
              <nav className="admin-subnav-pills" aria-label="أقسام فرعية">
                {activeSection.subLinks.map(sub => {
                  const isPillActive = location.pathname === sub.to || (sub.to !== activeSection.to && location.pathname.startsWith(sub.to))
                  return (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      className={`admin-subnav-pill ${isPillActive ? 'active' : ''}`}
                    >
                      <span>{sub.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            )}

            <Outlet />
          </main>
        </div>

        {/* ── Phone app navigation: bottom tab bar + More sheet ─────────── */}
        <nav className="admin-tabbar" aria-label="التنقّل السريع">
          {TAB_ITEMS.map(tab => {
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/admin/dashboard'}
                className={({ isActive }) => `admin-tab ${isActive ? 'active' : ''}`}
                aria-label={`تبويب ${tab.label}`}
              >
                <Icon size={22} />
                <span>{tab.label}</span>
              </NavLink>
            )
          })}
          <button
            type="button"
            className={`admin-tab ${moreOpen ? 'active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <MenuIcon size={22} />
            <span>المزيد</span>
          </button>
        </nav>

        <div
          className={`admin-more-backdrop ${moreOpen ? 'open' : ''}`}
          onClick={() => setMoreOpen(false)}
          aria-hidden={!moreOpen}
        />
        <section
          className={`admin-more-sheet ${moreOpen ? 'open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="المزيد"
          aria-hidden={!moreOpen}
        >
          <div className="admin-more-sheet__handle" aria-hidden="true" />
          <div className="admin-more-sheet__user">
            <span className="admin-more-sheet__name">{displayName}</span>
            <span className={`admin-more-sheet__role role-pill ${roleBadge.cls}`}>
              {roleBadge.label}
            </span>
          </div>

          <div className="admin-more-sheet__group">
            <span className="admin-more-sheet__label">قاعدة البيانات المدرسية</span>
            {MORE_DATABASE_LINKS.map(link => (
              <NavLink key={link.to} to={link.to} className="admin-more-sheet__row">
                <span>{link.label}</span>
                <ChevronLeftIcon size={16} />
              </NavLink>
            ))}
          </div>

          <div className="admin-more-sheet__group">
            <span className="admin-more-sheet__label">الحساب</span>
            <NavLink to="/admin/settings" className="admin-more-sheet__row">
              <span>الإعدادات والصلاحيات</span>
              <ChevronLeftIcon size={16} />
            </NavLink>
            <button type="button" className="admin-more-sheet__row admin-more-sheet__row--danger" onClick={handleLogout}>
              <span>تسجيل الخروج</span>
              <LogOutIcon size={16} />
            </button>
          </div>
        </section>
      </div>
    </AdminContext.Provider>
  )
}
