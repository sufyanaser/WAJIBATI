import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, usernameToAdminEmail } from '../lib/supabase'
import { EyeIcon, EyeOffIcon, ShieldIcon } from '../components/Icons'
import { useSchoolSettings } from '../services/schoolSettings'
import { AuthScenery } from '../components/AuthScenery'

export default function AdminLogin() {
  const nav = useNavigate()
  const { settings } = useSchoolSettings()
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
    <main className="auth-page auth-page--admin" dir="rtl">
      <AuthScenery />
      <div className="auth-card auth-card-admin">
        <div className="auth-brand">
          <div className="auth-logo-wrap">
            <img
              src="/icon-192.png"
              alt="شعار واجباتي"
              width={76}
              height={76}
              className="auth-logo"
            />
            <span
              className="admin-shield-badge"
              title="لوحة الإدارة المؤمنة"
            >
              <ShieldIcon size={16} />
            </span>
          </div>

          <span className="auth-role-badge auth-role-badge-admin auth-role-badge--inline">
            <ShieldIcon size={14} />
            <span>بوابة الإدارة المدرسية</span>
          </span>

          <div>
            <h1 className="login-title login-title--admin">
              لوحة التحكم والإشراف
            </h1>
            <p className="school-subtitle school-subtitle--admin">
              {settings.name}
            </p>
          </div>
        </div>

        <div className="divider divider--flush" />

        <form onSubmit={submit} className="auth-form">
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
            <div className="pass-wrap">
              <input
                id="admin-password"
                type={showPass ? 'text' : 'password'}
                dir="ltr"
                placeholder="كلمة المرور"
                value={pass}
                onChange={e => setPass(e.target.value)}
                autoComplete="current-password"
                required
                className="input pass-input"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="pass-toggle"
              >
                {showPass ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          {err && (
            <p className="err err--center" role="alert">
              {err}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block auth-submit"
            disabled={busy}
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
