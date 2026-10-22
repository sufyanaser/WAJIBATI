import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, usernameToAdminEmail } from '../lib/supabase'
import { EyeIcon, EyeOffIcon } from '../components/Icons'

export default function AdminLogin() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    // Plain usernames (e.g. 'admin') resolve via @admin.rumaila.local convention.
    // Legacy full-email inputs pass through unchanged.
    const email = username.includes('@') ? username : usernameToAdminEmail(username)
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) {
      setErr('اسم المستخدم أو كلمة المرور غير صحيحة')
      setBusy(false)
      return
    }
    const userId = authData?.user?.id
    const baseQuery = supabase.from('admins').select('role')
    const { data, error: adminsErr } = await (userId ? baseQuery.eq('user_id', userId) : baseQuery).maybeSingle()
    if (adminsErr) {
      console.error('admins query error:', adminsErr)
      setErr('خطأ في النظام أثناء التحقق من الصلاحية')
      setBusy(false)
      return
    }
    if (!data) {
      await supabase.auth.signOut()
      setErr('ليس لديك صلاحية الدخول كمدير')
      setBusy(false)
      return
    }
    nav('/admin')
  }

  return (
    <main className="auth-page" dir="rtl">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            src="/icon-192.png"
            alt="شعار واجباتي"
            width={76}
            height={76}
            className="auth-logo"
          />
          <span className="auth-role-badge">الإدارة والمدرسون</span>
          <div>
            <h1 className="login-title">لوحة الإدارة</h1>
            <p className="school-subtitle" style={{ marginTop: 4 }}>
              إعدادية الرميلة للبنين
            </p>
          </div>
        </div>

        <div className="divider" style={{ margin: 0 }} />

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="auth-field">
            <label htmlFor="admin-username" className="auth-label">
              اسم المستخدم أو البريد الإلكتروني
            </label>
            <input
              id="admin-username"
              className="input"
              type="text"
              dir="ltr"
              placeholder="اسم المستخدم"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="admin-password" className="auth-label">
              كلمة المرور
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="admin-password"
                className="input"
                type={showPass ? 'text' : 'password'}
                dir="ltr"
                placeholder="كلمة المرور"
                value={pass}
                onChange={e => setPass(e.target.value)}
                autoComplete="current-password"
                required
                style={{ width: '100%', paddingLeft: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                style={{
                  position: 'absolute',
                  left: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  minHeight: 34,
                  minWidth: 34,
                }}
              >
                {showPass ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          {err && (
            <p className="err" role="alert" style={{ textAlign: 'center' }}>
              {err}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{ width: '100%', justifyContent: 'center', padding: '.85rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)' }}
          >
            {busy ? 'جارٍ الدخول…' : 'دخول'}
          </button>
        </form>

        <footer className="auth-footer">
          <span>ولي أمر طالب؟</span>
          <Link to="/login">بوابة أولياء الأمور</Link>
        </footer>
      </div>
    </main>
  )
}
