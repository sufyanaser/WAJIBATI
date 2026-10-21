import { useEffect, useState, createContext, useContext } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

// ── admin context ──────────────────────────────────────────────────────────────

interface AdminCtx { user: User; role: string }
const AdminContext = createContext<AdminCtx | null>(null)
export const useAdmin = () => useContext(AdminContext)

// ── styles ─────────────────────────────────────────────────────────────────────

const shell: React.CSSProperties = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '16px 16px env(safe-area-inset-bottom)',
  display: 'grid',
  gap: 12,
}

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'inline-block',
  background: isActive ? 'var(--accent)' : 'var(--card)',
  color: isActive ? 'var(--bg)' : 'var(--fg)',
  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
  borderRadius: 20,
  padding: '8px 16px',
  fontSize: '.88rem',
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  flexShrink: 0,
})

// ── component ──────────────────────────────────────────────────────────────────

export default function AdminShell() {
  const nav = useNavigate()
  const [ctx, setCtx] = useState<AdminCtx | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/admin/login', { replace: true }); return }
      const { data: adm, error } = await supabase
        .from('admins').select('role')
        .eq('user_id', data.session.user.id).maybeSingle()
      if (error || !adm) {
        await supabase.auth.signOut()
        nav('/admin/login', { replace: true })
        return
      }
      setCtx({ user: data.session.user, role: adm.role })
      setChecking(false)
    })
  }, [nav])

  async function handleLogout() {
    await supabase.auth.signOut()
    nav('/admin/login')
  }

  if (checking) {
    return (
      <main style={{ ...shell, maxWidth: 520 }} dir="rtl">
        <p className="muted" style={{ textAlign: 'center', marginTop: 48 }}>جارٍ التحقق…</p>
      </main>
    )
  }

  const displayName = ctx?.user.email?.replace(/@admin\.rumaila\.local$/, '') ?? null

  return (
    <AdminContext.Provider value={ctx}>
      <main style={shell} dir="rtl">
        {/* top bar */}
        <div className="top-bar">
          <h1 className="app-title">واجباتي | لوحة الإدارة</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {displayName && (
              <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{displayName}</span>
            )}
            <button className="icon-btn" onClick={handleLogout}>خروج</button>
          </div>
        </div>

        {/* nav tabs */}
        <nav
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            paddingBottom: 2,
          }}
        >
          <NavLink to="/admin/dashboard" style={navLinkStyle}>الرئيسية</NavLink>
          <NavLink to="/admin/homework" style={navLinkStyle}>واجبات</NavLink>
          <NavLink to="/admin/notices" style={navLinkStyle}>إشعارات</NavLink>
          <NavLink to="/admin/master-data" style={navLinkStyle}>بيانات المدرسة</NavLink>
          <NavLink to="/admin/import" style={navLinkStyle}>الحسابات</NavLink>
        </nav>

        {/* routed content */}
        <Outlet />
      </main>
    </AdminContext.Provider>
  )
}
