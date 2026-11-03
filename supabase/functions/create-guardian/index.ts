// POST { phone: "07XXXXXXXXX", pin: "000000", full_name?, alt_phone?, student_id?, relation? }
// admin JWT required. Creates the guardian's login (email = <phone>@guardian.rumaila.local, password = PIN)
// and the guardians row linked to that auth user. Never overwrites an existing login.
// Returns: { ok: true, guardian_id } | error status with a plain-text message.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json('method not allowed', 405)

  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) return json('forbidden', 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json('invalid json', 400)
  }

  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
  const fullName = typeof body.full_name === 'string' && body.full_name.trim() ? body.full_name.trim() : null
  const altPhone = typeof body.alt_phone === 'string' && body.alt_phone.trim() ? body.alt_phone.trim() : null
  const relation = typeof body.relation === 'string' && body.relation.trim() ? body.relation.trim() : null
  const studentId = body.student_id == null || body.student_id === '' ? null : Number(body.student_id)

  if (!/^07[0-9]{9}$/.test(phone)) return json('invalid phone (expected 07XXXXXXXXX)', 400)
  if (!/^[0-9]{6}$/.test(pin)) return json('PIN must be 6 digits', 400)
  if (studentId !== null && !Number.isInteger(studentId)) return json('invalid student_id', 400)
  if (altPhone && !/^07[0-9]{9}$/.test(altPhone)) return json('invalid alt_phone', 400)

  const db = createClient(SUPABASE_URL, SERVICE_KEY)
  const email = `${phone}@guardian.rumaila.local`

  // Refuse duplicates before touching auth: never change an existing login's PIN here.
  const { data: dupPhone } = await db.from('guardians').select('id').eq('phone', phone).maybeSingle()
  if (dupPhone) return json('phone already registered', 409)

  const { data: created, error: authErr } = await db.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  })
  if (authErr || !created?.user) {
    const msg = authErr?.message ?? 'auth create failed'
    const exists = /already|registered|exists/i.test(msg)
    return json(exists ? 'login already exists for this phone' : msg, exists ? 409 : 500)
  }
  const userId = created.user.id

  const extKey = `GUA-${Date.now().toString(36).toUpperCase()}`
  const { data: row, error: gErr } = await db
    .from('guardians')
    .insert({ external_key: extKey, full_name: fullName, phone, alt_phone: altPhone, user_id: userId, active: true })
    .select('id')
    .single()

  if (gErr || !row) {
    // Roll back the login we just created so no orphan auth user is left behind.
    await db.auth.admin.deleteUser(userId)
    return json(gErr?.message ?? 'guardian insert failed', 500)
  }

  if (studentId !== null) {
    const { error: linkErr } = await db
      .from('guardian_students')
      .insert({ guardian_id: row.id, student_id: studentId, relation })
    if (linkErr) return json({ ok: true, guardian_id: row.id, warning: 'student link failed' }, 207)
  }

  return json({ ok: true, guardian_id: row.id })
})
