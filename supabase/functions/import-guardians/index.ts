// POST multipart/form-data { file: CSV } — admin JWT required
// CSV columns (header row required):
//   student_name, stage, branch, section, guardian_name, phone, pin
//
// phone format: +9647XXXXXXXXX   |   pin: exactly 6 digits
// Returns: { created, skipped, errors: [{row, message}] }
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
  // ── auth guard ──────────────────────────────────────────────────────────────
  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) return new Response('forbidden', { status: 403 })

  // ── parse multipart ─────────────────────────────────────────────────────────
  let csvText: string
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return new Response('missing file', { status: 400 })
    csvText = await (file as File).text()
  } catch {
    return new Response('invalid multipart', { status: 400 })
  }

  const rows = parseCSV(csvText)
  if (rows.length < 2) return new Response('empty CSV', { status: 400 })

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
      { status: 400 },
    )
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY)

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
    if (!/^\+9647[0-9]{9}$/.test(phone)) {
      errors.push({ row: rowNum, message: `رقم الهاتف غير صالح: ${phone}` }); continue
    }
    if (!/^[0-9]{6}$/.test(pin)) {
      errors.push({ row: rowNum, message: `PIN غير صالح (يجب 6 أرقام): ${pin}` }); continue
    }

    const sectionId = sectionMap.get(`${stage}|${branch}|${sectionLtr}`)
    if (!sectionId) {
      errors.push({ row: rowNum, message: `شعبة غير موجودة: ${stage} ${branch} / ${sectionLtr}` }); continue
    }

    const email = `${phone.replace('+', '')}@guardian.rumaila.local`

    try {
      // ── upsert auth user ──────────────────────────────────────────────────
      const { data: existing } = await db.auth.admin.listUsers()
      const existingUser = (existing?.users ?? []).find(u => u.email === email)

      let userId: string
      if (existingUser) {
        userId = existingUser.id
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

        // ── upsert student ──────────────────────────────────────────────────
        const { data: stRow, error: stErr } = await db
          .from('students')
          .upsert({ full_name: studentName, section_id: sectionId }, { onConflict: 'full_name,section_id' })
          .select('id').single()
        if (stErr || !stRow) {
          errors.push({ row: rowNum, message: stErr?.message ?? 'فشل إنشاء الطالب' }); continue
        }

        // ── upsert guardian ─────────────────────────────────────────────────
        const { data: gRow, error: gErr } = await db
          .from('guardians')
          .upsert({ user_id: userId, full_name: guardianName, phone }, { onConflict: 'phone' })
          .select('id').single()
        if (gErr || !gRow) {
          errors.push({ row: rowNum, message: gErr?.message ?? 'فشل إنشاء ولي الأمر' }); continue
        }

        // ── guardian_students link ──────────────────────────────────────────
        await db.from('guardian_students')
          .upsert({ guardian_id: gRow.id, student_id: stRow.id, relation: 'أب' }, { onConflict: 'guardian_id,student_id' })

        created++
      }
    } catch (e: any) {
      errors.push({ row: rowNum, message: e?.message ?? 'خطأ غير متوقع' })
    }
  }

  return Response.json({ created, skipped, errors })
})
