import { useEffect, useState, createContext, useContext } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

// ── Admin context (shared across child routes) ─────────────────────────────────

export interface AdminCtx {
  user: User | null
  role: 'owner' | 'editor' | 'viewer'
  ready: boolean
}

const AdminContext = createContext<AdminCtx>({ user: null, role: 'viewer', ready: false })
export const useAdmin = () => useContext(AdminContext)

// ── Nav items ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'الرئيسية', icon: '🏠' },
  { to: '/admin/homework',  label: 'الواجبات', icon: '📚' },
  { to: '/admin/notices',   label: 'الإشعارات', icon: '🔔' },
  { to: '/admin/master-data', label: 'بيانات المدرسة', icon: '🏫' },
  { to: '/admin/import',    label: 'الاستيراد وPIN', icon: '📥' },
]

// ── component ──────────────────────────────────────────────────────────────────

export default function AdminShell() {
  const nav = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('viewer')
  const [ready, setReady] = useState(false)

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

  async function handleLogout() {
    await supabase.auth.signOut()
    nav('/admin/login')
  }

  if (!ready) {
    return (
      <main className="admin-shell-container" dir="rtl" style={{ maxWidth: 520 }}>
        <p className="muted" style={{ textAlign: 'center', marginTop: 48 }}>جارٍ التحقق…</p>
      </main>
    )
  }

  // Display username instead of synthetic @admin.rumaila.local email
  const displayName = user?.email
    ? user.email.replace(/@admin\.rumaila\.local$/i, '')
    : ''

  return (
    <AdminContext.Provider value={{ user, role, ready }}>
      <main className="admin-shell-container" dir="rtl">
        {/* top bar */}
        <header className="top-bar">
          <div className="brand-identity">
            <img
              src="/icon-192.png"
              alt="واجباتي"
              className="brand-logo"
              width={44}
              height={44}
            />
            <div className="today-header-titles">
              <h1 className="app-title">لوحة الإدارة</h1>
              <p className="school-subtitle">إعدادية الرميلة للبنين</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {displayName && (
              <span
                className="badge-muted"
                style={{ direction: 'ltr', padding: '5px 12px', fontSize: '.78rem' }}
              >
                {displayName}
              </span>
            )}
            <button type="button" className="icon-btn" onClick={handleLogout}>
              خروج
            </button>
          </div>
        </header>

        {/* nav tabs */}
        <nav className="child-tabs" aria-label="أقسام لوحة الإدارة">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/dashboard'}
              className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
              style={{ textDecoration: 'none' }}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>

        {/* routed content */}
        <Outlet />
      </main>
    </AdminContext.Provider>
  )
}
