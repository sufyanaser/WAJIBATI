import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, phoneToEmail } from '../lib/supabase'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()

  async function submit() {
    setErr('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password: pin })
      if (error) throw error
      nav('/')
    } catch { setErr('رقم الهاتف أو الرمز غير صحيح') }
  }

  return (
    <main className="screen">
      <h1>واجبات الرميلة</h1>
      <input inputMode="tel" placeholder="رقم هاتف ولي الأمر 07XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
      <input inputMode="numeric" maxLength={6} placeholder="الرمز السري" value={pin} onChange={e => setPin(e.target.value)} />
      {err && <p className="err">{err}</p>}
      <button onClick={submit}>دخول</button>
    </main>
  )
}
