import { NavLink, Outlet, useLocation } from 'react-router-dom'

const tabStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'inline-block',
  background: isActive ? 'var(--accent)' : 'transparent',
  color: isActive ? 'var(--bg)' : 'var(--muted)',
  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
  borderRadius: 12,
  padding: '6px 14px',
  fontSize: '.84rem',
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
})

export default function MasterDataPage() {
  const loc = useLocation()
  const isRoot = loc.pathname === '/admin/master-data' || loc.pathname === '/admin/master-data/'

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 12 }}>
      <nav style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        <NavLink to="/admin/master-data/teachers" style={tabStyle}>المدرسون</NavLink>
        <NavLink to="/admin/master-data/students" style={tabStyle}>الطلاب</NavLink>
        <NavLink to="/admin/master-data/subjects" style={tabStyle}>المواد</NavLink>
        <NavLink to="/admin/master-data/sections" style={tabStyle}>الشعب</NavLink>
        <NavLink to="/admin/master-data/timetable" style={tabStyle}>الجدول الدراسي</NavLink>
        <NavLink to="/admin/master-data/guardians" style={tabStyle}>أولياء الأمور</NavLink>
      </nav>

      {isRoot && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { to: '/admin/master-data/teachers', label: 'المدرسون', icon: '👨‍🏫' },
            { to: '/admin/master-data/students', label: 'الطلاب', icon: '👨‍🎓' },
            { to: '/admin/master-data/subjects', label: 'المواد الدراسية', icon: '📚' },
            { to: '/admin/master-data/sections', label: 'الشعب', icon: '🏫' },
            { to: '/admin/master-data/timetable', label: 'الجدول الدراسي', icon: '🗓' },
            { to: '/admin/master-data/guardians', label: 'أولياء الأمور', icon: '👨‍👩‍👧' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '20px 12px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                textDecoration: 'none',
                color: 'var(--fg)',
                fontSize: '.9rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      <Outlet />
    </div>
  )
}
