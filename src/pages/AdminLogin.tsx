import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, usernameToAdminEmail } from '../lib/supabase'

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
    if (error) { setErr('اسم المستخدم أو كلمة المرور غير صحيحة'); setBusy(false); return }
    const userId = authData.user?.id
    const { data, error: adminsErr } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', userId!)
      .maybeSingle()
    if (adminsErr) {
      console.error('admins query error:', adminsErr)
      setErr('خطأ في النظام أثناء التحقق من الصلاحية')
      setBusy(false); return
    }
    if (!data) {
      await supabase.auth.signOut()
      setErr('ليس لديك صلاحية الدخول كمدير')
      setBusy(false); return
    }
    nav('/admin')
  }

  return (
    <main className="screen" dir="rtl">
      <h1 className="login-title" style={{ marginTop: 48 }}>لوحة الإدارة</h1>
      <p className="muted" style={{ textAlign: 'center' }}>اعدادية الرميلة للبنين</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 8 }}>
        <input
          type="text"
          placeholder="اسم المستخدم"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="كلمة المرور"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoComplete="current-password"
            required
            style={{ width: '100%', paddingLeft: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            style={{
              position: 'absolute',
              left: 10,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '1rem',
              padding: 0,
              lineHeight: 1,
            }}
          >
            {showPass ? '🙈' : '👁'}
          </button>
        </div>
        {err && <p className="err">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? 'جارٍ الدخول…' : 'دخول'}</button>
      </form>
    </main>
  )
}
