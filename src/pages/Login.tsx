import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, phoneToEmail } from '../lib/supabase'
import { Spinner } from '../components/Spinner'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(phone),
        password: pin,
      })
      if (error) throw error
      nav('/')
    } catch {
      setErr('رقم الهاتف أو الرمز غير صحيح')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '1.25rem',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        {/* Logo + titles */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem' }}>
          <img
            src="/icon-192.png"
            alt="واجبات الرميلة"
            width={72}
            height={72}
            style={{ borderRadius: '1rem', boxShadow: '0 4px 16px rgba(0,0,0,.4)' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)', letterSpacing: '.01em' }}>
              واجبات الرميلة
            </h1>
            <p style={{ margin: '.2rem 0 0', fontSize: '.85rem', color: 'var(--muted)' }}>
              اعدادية الرميلة للبنين
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <label style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--muted)' }}>
              رقم الهاتف
            </label>
            <input
              className="input"
              type="tel"
              dir="ltr"
              placeholder="07XXXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <label style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--muted)' }}>
              رمز PIN
            </label>
            <input
              className="input"
              type="password"
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && (
            <p style={{ margin: 0, color: 'var(--err)', fontSize: '.875rem', fontWeight: 600, textAlign: 'center' }}>
              {err}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !phone || !pin}
            style={{ width: '100%', justifyContent: 'center', padding: '.8rem', fontSize: '1rem', borderRadius: '.75rem' }}
          >
            {loading ? <Spinner size={20} /> : 'دخول'}
          </button>
        </form>
      </div>
    </main>
  )
}
