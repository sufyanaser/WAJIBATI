import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

// ── styles ─────────────────────────────────────────────────────────────────────

const shell: React.CSSProperties = {
  maxWidth: 520,
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
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    nav('/admin/login')
  }

  return (
    <main style={shell} dir="rtl">
      {/* top bar */}
      <div className="top-bar">
        <h1 className="app-title">لوحة الإدارة</h1>
        <button className="icon-btn" onClick={handleLogout}>خروج</button>
      </div>

      {/* user email */}
      {user && (
        <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--muted)' }}>
          {user.email}
        </p>
      )}

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
        <NavLink to="/admin/homework" style={navLinkStyle} end>واجبات</NavLink>
        <NavLink to="/admin/notices" style={navLinkStyle}>إشعارات</NavLink>
        <NavLink to="/admin/import" style={navLinkStyle}>استيراد</NavLink>
      </nav>

      {/* routed content */}
      <Outlet />
    </main>
  )
}
