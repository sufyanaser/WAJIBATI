export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>{icon}</div>
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--fg)', fontSize: '1rem' }}>{title}</p>
      {subtitle && <p style={{ margin: '.4rem 0 0', fontSize: '.875rem' }}>{subtitle}</p>}
    </div>
  )
}
