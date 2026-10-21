// POST { phone: string, new_pin: string } — admin JWT required
// Resets the 6-digit PIN for a guardian identified by phone number.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) return new Response('forbidden', { status: 403, headers: CORS })

  const { phone, new_pin } = await req.json()
  if (!phone || !new_pin) return new Response('missing phone or new_pin', { status: 400, headers: CORS })
  if (!/^\+9647[0-9]{9}$/.test(phone)) return new Response('invalid phone', { status: 400, headers: CORS })
  if (!/^[0-9]{6}$/.test(new_pin)) return new Response('PIN must be 6 digits', { status: 400, headers: CORS })

  const db = createClient(SUPABASE_URL, SERVICE_KEY)

  // Look up guardian by phone to get auth user_id directly (no listUsers pagination issue)
  const { data: guardian, error: gErr } = await db
    .from('guardians')
    .select('user_id')
    .eq('phone', phone)
    .single()

  if (gErr || !guardian?.user_id) return new Response('guardian not found', { status: 404, headers: CORS })

  const { error } = await db.auth.admin.updateUserById(guardian.user_id, { password: new_pin })
  if (error) return new Response(error.message, { status: 500, headers: CORS })

  return Response.json({ ok: true }, { headers: CORS })
})
