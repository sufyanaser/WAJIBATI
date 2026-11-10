import { AuthScenery } from '../components/AuthScenery'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, phoneToEmail, toWesternDigits, classifyAuthError, authErrorMessage } from '../lib/supabase'
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
        password: toWesternDigits(pin.trim()),
      })
      if (error) throw error
      nav('/')
    } catch (e) {
      // normalizePhone throws a plain Error('invalid_phone'): that is bad input,
      // not a network failure, so it maps to the invalid-credentials message.
      const kind = e instanceof Error && e.message === 'invalid_phone'
        ? 'invalid_credentials' as const
        : classifyAuthError(e)
      setErr(authErrorMessage(kind, 'رقم الهاتف أو الرمز غير صحيح'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page auth-page--guardian" dir="rtl">
      <AuthScenery />
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
          <div>
            <h1 className="login-title">دخول أولياء الأمور</h1>
          </div>
        </div>

        <div className="divider divider--flush" />

        {/* Form */}
        <form onSubmit={submit} className="auth-form">
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
            <p className="err err--center" role="alert">
              {err}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block auth-submit"
            disabled={loading || !phone || !pin}
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
