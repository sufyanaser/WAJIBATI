import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
    <main className="auth-page" dir="rtl">
      <div className="auth-card">
        {/* Brand identity */}
        <div className="auth-brand">
          <img
            src="/icon-192.png"
            alt="شعار واجباتي"
            width={76}
            height={76}
            className="auth-logo"
          />
          <span className="auth-role-badge">بوابة أولياء الأمور</span>
          <div>
            <h1 className="login-title">واجباتي</h1>
            <p className="school-subtitle" style={{ marginTop: 4 }}>
              إعدادية الرميلة للبنين
            </p>
          </div>
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {/* Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="auth-field">
            <label htmlFor="guardian-phone" className="auth-label">
              رقم الهاتف
            </label>
            <input
              id="guardian-phone"
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

          <div className="auth-field">
            <label htmlFor="guardian-pin" className="auth-label">
              رمز PIN (6 أرقام)
            </label>
            <input
              id="guardian-pin"
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
            <p className="err" role="alert" style={{ textAlign: 'center' }}>
              {err}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !phone || !pin}
            style={{ width: '100%', justifyContent: 'center', padding: '.85rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)' }}
          >
            {loading ? <Spinner size={20} /> : 'دخول'}
          </button>
        </form>

        <footer className="auth-footer">
          <span>هل أنت من كادر المدرسة؟</span>
          <Link to="/admin/login">دخول الإدارة</Link>
        </footer>
      </div>
    </main>
  )
}
