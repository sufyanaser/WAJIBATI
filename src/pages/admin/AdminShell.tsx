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
  maxWidth: 960,
  margin: '0 auto',
  padding: '16px 16px env(safe-area-inset-bottom)',
  display: 'grid',
  gap: 14,
}

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: isActive ? 'var(--accent)' : 'transparent',
  color: isActive ? '#08152A' : 'var(--muted)',
  border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
  borderRadius: 10,
  padding: '9px 16px',
  fontSize: '.88rem',
  fontWeight: 700,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  transition: 'background .15s, color .15s',
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
        {/* ── top bar ─────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🎓</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
                واجباتي
              </h1>
              <p style={{ margin: 0, fontSize: '.72rem', color: 'var(--muted)' }}>لوحة الإدارة</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {displayName && (
              <span style={{
                fontSize: '.8rem',
                color: 'var(--muted)',
                background: 'var(--card2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 10px',
              }}>{displayName}</span>
            )}
            <button className="icon-btn" onClick={handleLogout} style={{ padding: '6px 14px', fontSize: '.85rem' }}>
              خروج
            </button>
          </div>
        </div>

        {/* ── nav tabs ─────────────────────────────────────────────── */}
        <nav style={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '6px 8px',
        }}>
          <NavLink to="/admin/dashboard"   style={navLinkStyle}>🏠 الرئيسية</NavLink>
          <NavLink to="/admin/homework"    style={navLinkStyle}>📚 واجبات</NavLink>
          <NavLink to="/admin/notices"     style={navLinkStyle}>🔔 إشعارات</NavLink>
          <NavLink to="/admin/master-data" style={navLinkStyle}>🏫 المدرسة</NavLink>
          <NavLink to="/admin/import"      style={navLinkStyle}>👤 الحسابات</NavLink>
        </nav>

        {/* routed content */}
        <Outlet />
      </main>
    </AdminContext.Provider>
  )
}
