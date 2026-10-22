export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <p className="empty-msg">{title}</p>
      {subtitle && <p style={{ margin: 0, fontSize: '.875rem', color: 'var(--muted)' }}>{subtitle}</p>}
    </div>
  )
}
