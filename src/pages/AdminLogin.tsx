import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) { setErr(error.message); setBusy(false); return }
    const { data } = await supabase.from('admins').select('role').maybeSingle()
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
        <input type="email" placeholder="البريد الإلكتروني" value={email}
          onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        <input type="password" placeholder="كلمة المرور" value={pass}
          onChange={e => setPass(e.target.value)} autoComplete="current-password" required />
        {err && <p className="err">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? 'جارٍ الدخول…' : 'دخول'}</button>
      </form>
    </main>
  )
}
