// POST { phone: string, new_pin: string } — admin JWT required
// Resets the 6-digit PIN for a guardian identified by phone number.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) return new Response('forbidden', { status: 403 })

  const { phone, new_pin } = await req.json()
  if (!phone || !new_pin) return new Response('missing phone or new_pin', { status: 400 })
  if (!/^\+9647[0-9]{9}$/.test(phone)) return new Response('invalid phone', { status: 400 })
  if (!/^[0-9]{6}$/.test(new_pin)) return new Response('PIN must be 6 digits', { status: 400 })

  const email = `${phone.replace('+', '')}@guardian.rumaila.local`
  const db = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: list } = await db.auth.admin.listUsers()
  const user = (list?.users ?? []).find(u => u.email === email)
  if (!user) return new Response('guardian not found', { status: 404 })

  const { error } = await db.auth.admin.updateUserById(user.id, { password: new_pin })
  if (error) return new Response(error.message, { status: 500 })

  return Response.json({ ok: true })
})
