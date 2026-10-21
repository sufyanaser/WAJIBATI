import { usePushSubscription } from '../hooks/usePushSubscription'

interface Props {
  sectionId: string
}

export function PushOptIn({ sectionId }: Props) {
  const { supported, permission, subscribed, subscribe, unsubscribe, loading } =
    usePushSubscription(sectionId)

  // Not supported — render nothing
  if (!supported) return null

  // Permission explicitly blocked
  if (permission === 'denied') {
    return (
      <p className="muted" style={{ fontSize: '.82rem', textAlign: 'center', padding: '6px 0' }}>
        الإشعارات محجوبة في المتصفح
      </p>
    )
  }

  // Already subscribed
  if (subscribed) {
    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: '.88rem',
        }}
      >
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>الإشعارات مفعّلة ✓</span>
        <button
          onClick={unsubscribe}
          disabled={loading}
          style={{
            padding: '6px 14px',
            fontSize: '.82rem',
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? '…' : 'إيقاف'}
        </button>
      </div>
    )
  }

  // Not subscribed yet — show opt-in banner
  return (
    <div className="push-banner">
      <span>فعّل الإشعارات لتصلك الواجبات فور نشرها</span>
      <button
        onClick={subscribe}
        disabled={loading}
        style={{ padding: '8px 16px', fontSize: '.85rem', borderRadius: 8, flexShrink: 0 }}
      >
        {loading ? '…' : 'تفعيل الإشعارات'}
      </button>
    </div>
  )
}
