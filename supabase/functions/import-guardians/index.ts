// POST multipart/form-data { file: CSV } — admin JWT required
// CSV columns (header row required):
//   student_name, stage, branch, section, guardian_name, phone, pin
//
// phone format: 07XXXXXXXXX (local Iraqi, 11 digits)  |  pin: exactly 6 digits
// Returns: { created, skipped, errors: [{row, message}] }
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

// ── simple CSV parser (handles quoted fields) ─────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  for (const rawLine of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"' && !inQ) { inQ = true; continue }
      if (c === '"' && inQ && line[i + 1] === '"') { cur += '"'; i++; continue }
      if (c === '"' && inQ) { inQ = false; continue }
      if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue }
      cur += c
    }
    cells.push(cur.trim())
    rows.push(cells)
  }
  return rows
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // ── auth guard ──────────────────────────────────────────────────────────────
  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) return new Response('forbidden', { status: 403, headers: CORS })

  // ── parse multipart ─────────────────────────────────────────────────────────
  let csvText: string
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return new Response('missing file', { status: 400, headers: CORS })
    csvText = await (file as File).text()
  } catch {
    return new Response('invalid multipart', { status: 400, headers: CORS })
  }

  const rows = parseCSV(csvText)
  if (rows.length < 2) return new Response('empty CSV', { status: 400, headers: CORS })

  // ── header → index map ──────────────────────────────────────────────────────
  const header = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const col = (name: string) => header.indexOf(name)
  const iStudent  = col('student_name')
  const iStage    = col('stage')
  const iBranch   = col('branch')
  const iSection  = col('section')
  const iGuardian = col('guardian_name')
  const iPhone    = col('phone')
  const iPin      = col('pin')

  if ([iStudent, iStage, iBranch, iSection, iGuardian, iPhone, iPin].includes(-1)) {
    return new Response(
      'CSV missing required columns: student_name, stage, branch, section, guardian_name, phone, pin',
      { status: 400, headers: CORS },
    )
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY)

  // ── pre-fetch all auth users once (with pagination) ─────────────────────────
  const existingByEmail = new Map<string, string>() // email → user_id
  let page = 1
  while (true) {
    const { data: list } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    for (const u of list?.users ?? []) {
      if (u.email) existingByEmail.set(u.email, u.id)
    }
    if (!list?.users?.length || list.users.length < 1000) break
    page++
  }

  // ── cache sections for the current academic year ────────────────────────────
  const { data: sectionsRaw } = await db
    .from('sections')
    .select('id, letter, stage:stages!inner(name, branch), year:academic_years!inner(is_current)')
    .eq('academic_years.is_current', true)
  const sectionMap = new Map<string, number>()
  for (const s of sectionsRaw ?? []) {
    const key = `${(s.stage as any).name}|${(s.stage as any).branch}|${s.letter}`
    sectionMap.set(key, s.id)
  }

  // ── process rows ─────────────────────────────────────────────────────────────
  let created = 0, skipped = 0
  const errors: { row: number; message: string }[] = []

  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri]
    const rowNum = ri + 1

    const studentName  = r[iStudent]?.trim()
    const stage        = r[iStage]?.trim()
    const branch       = r[iBranch]?.trim()
    const sectionLtr   = r[iSection]?.trim()
    const guardianName = r[iGuardian]?.trim()
    const phone        = r[iPhone]?.trim()
    const pin          = r[iPin]?.trim()

    if (!studentName || !stage || !branch || !sectionLtr || !guardianName || !phone || !pin) {
      errors.push({ row: rowNum, message: 'حقول ناقصة' }); continue
    }
    if (!/^07[0-9]{9}$/.test(phone)) {
      errors.push({ row: rowNum, message: `رقم الهاتف غير صالح (يجب 07XXXXXXXXX): ${phone}` }); continue
    }
    if (!/^[0-9]{6}$/.test(pin)) {
      errors.push({ row: rowNum, message: `PIN غير صالح (يجب 6 أرقام): ${pin}` }); continue
    }

    const sectionId = sectionMap.get(`${stage}|${branch}|${sectionLtr}`)
    if (!sectionId) {
      errors.push({ row: rowNum, message: `شعبة غير موجودة: ${stage} ${branch} / ${sectionLtr}` }); continue
    }

    const email = `${phone}@guardian.rumaila.local`

    try {
      let userId: string
      const existingUserId = existingByEmail.get(email)

      if (existingUserId) {
        userId = existingUserId
        skipped++
      } else {
        const { data: newUser, error: authErr } = await db.auth.admin.createUser({
          email,
          password: pin,
          email_confirm: true,
        })
        if (authErr || !newUser?.user) {
          errors.push({ row: rowNum, message: authErr?.message ?? 'فشل إنشاء حساب المستخدم' }); continue
        }
        userId = newUser.user.id
        existingByEmail.set(email, userId)
        created++
      }

      // ── upsert student (always, even for existing guardians) ───────────────
      const { data: stRow, error: stErr } = await db
        .from('students')
        .upsert({ full_name: studentName, section_id: sectionId }, { onConflict: 'full_name,section_id' })
        .select('id').single()
      if (stErr || !stRow) {
        errors.push({ row: rowNum, message: stErr?.message ?? 'فشل إنشاء الطالب' }); continue
      }

      // ── upsert guardian ────────────────────────────────────────────────────
      const { data: gRow, error: gErr } = await db
        .from('guardians')
        .upsert({ user_id: userId, full_name: guardianName, phone }, { onConflict: 'phone' })
        .select('id').single()
      if (gErr || !gRow) {
        errors.push({ row: rowNum, message: gErr?.message ?? 'فشل إنشاء ولي الأمر' }); continue
      }

      // ── guardian_students link ─────────────────────────────────────────────
      await db.from('guardian_students')
        .upsert({ guardian_id: gRow.id, student_id: stRow.id, relation: 'أب' }, { onConflict: 'guardian_id,student_id' })

    } catch (e: any) {
      errors.push({ row: rowNum, message: e?.message ?? 'خطأ غير متوقع' })
    }
  }

  return Response.json({ created, skipped, errors }, { headers: CORS })
})
