import { createClient } from 'jsr:@supabase/supabase-js@2'
import { crypto } from 'jsr:@std/crypto@1'
import { encodeHex } from 'jsr:@std/encoding@1/hex'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const allowedSheets = ['subjects','teachers','sections','timetable','students','guardians','guardian_students','accounts'] as const

type Payload = Record<(typeof allowedSheets)[number], Record<string, unknown>[]>
type Issue = { sheet: string; row: number; field?: string; message: string }

function cleanPayload(input: unknown): Payload {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  return Object.fromEntries(allowedSheets.map(k => [k, Array.isArray(source[k]) ? source[k] : []])) as Payload
}

function required(issues: Issue[], sheet: string, rows: Record<string, unknown>[], fields: string[]) {
  const keys = new Set<string>()
  rows.forEach((row, index) => {
    fields.forEach(field => { if (!String(row[field] ?? '').trim()) issues.push({ sheet, row: index + 2, field, message: 'حقل مطلوب' }) })
    const key = String(row.external_key ?? '').trim()
    if (key && keys.has(key)) issues.push({ sheet, row: index + 2, field: 'external_key', message: 'مفتاح مكرر داخل الملف' })
    keys.add(key)
    if ('pin' in row || 'password' in row) issues.push({ sheet, row: index + 2, message: 'يُمنع تضمين PIN أو password في ملف البيانات' })
  })
}

function validate(payload: Payload) {
  const issues: Issue[] = []
  required(issues,'subjects',payload.subjects,['external_key','name'])
  required(issues,'teachers',payload.teachers,['external_key','full_name','subject_key'])
  required(issues,'sections',payload.sections,['external_key','academic_year','stage','branch','letter'])
  required(issues,'timetable',payload.timetable,['section_key','weekday','period','subject_key'])
  required(issues,'students',payload.students,['external_key','full_name','section_key'])
  required(issues,'guardians',payload.guardians,['external_key','full_name','phone'])
  required(issues,'guardian_students',payload.guardian_students,['guardian_key','student_key'])
  required(issues,'accounts',payload.accounts,['external_key','email','full_name','role'])
  payload.guardians.forEach((r,i) => { if (!/^\+9647[0-9]{9}$/.test(String(r.phone ?? ''))) issues.push({sheet:'guardians',row:i+2,field:'phone',message:'استخدم +9647XXXXXXXXX'}) })
  payload.accounts.forEach((r,i) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(r.email ?? ''))) issues.push({sheet:'accounts',row:i+2,field:'email',message:'بريد غير صالح'})
    if (!['owner','editor','viewer'].includes(String(r.role ?? ''))) issues.push({sheet:'accounts',row:i+2,field:'role',message:'الدور يجب أن يكون owner أو editor أو viewer'})
  })
  payload.timetable.forEach((r,i) => {
    const weekday=Number(r.weekday), period=Number(r.period)
    if (!Number.isInteger(weekday)||weekday<0||weekday>4) issues.push({sheet:'timetable',row:i+2,field:'weekday',message:'القيمة من 0 إلى 4'})
    if (!Number.isInteger(period)||period<1||period>6) issues.push({sheet:'timetable',row:i+2,field:'period',message:'القيمة من 1 إلى 6'})
  })
  const refs = (sheet: keyof Payload) => new Set(payload[sheet].map(r => String(r.external_key ?? '')))
  const subjectKeys=refs('subjects'), teacherKeys=refs('teachers'), sectionKeys=refs('sections'), studentKeys=refs('students'), guardianKeys=refs('guardians')
  payload.teachers.forEach((r,i)=>{if(!subjectKeys.has(String(r.subject_key)))issues.push({sheet:'teachers',row:i+2,field:'subject_key',message:'المادة غير موجودة في الملف'})})
  payload.students.forEach((r,i)=>{if(!sectionKeys.has(String(r.section_key)))issues.push({sheet:'students',row:i+2,field:'section_key',message:'الشعبة غير موجودة في الملف'})})
  payload.guardian_students.forEach((r,i)=>{if(!guardianKeys.has(String(r.guardian_key))||!studentKeys.has(String(r.student_key)))issues.push({sheet:'guardian_students',row:i+2,message:'مرجع الطالب أو ولي الأمر غير موجود'})})
  payload.timetable.forEach((r,i)=>{if(!sectionKeys.has(String(r.section_key))||!subjectKeys.has(String(r.subject_key))||(r.teacher_key&&!teacherKeys.has(String(r.teacher_key))))issues.push({sheet:'timetable',row:i+2,message:'مرجع الشعبة أو المادة أو المدرس غير موجود'})})
  return issues
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null,{headers:CORS})
  const auth=req.headers.get('Authorization')??''
  const userDb=createClient(URL,ANON,{global:{headers:{Authorization:auth}}})
  const {data:{user}}=await userDb.auth.getUser()
  if(!user) return new Response('unauthorized',{status:401,headers:CORS})
  const {data:admin}=await userDb.from('admins').select('role').eq('user_id',user.id).maybeSingle()
  if(!admin||admin.role!=='owner') return new Response('owner required',{status:403,headers:CORS})
  const body=await req.json().catch(()=>null) as {action?:string;source_name?:string;payload?:unknown;batch_id?:string}|null
  if(!body) return new Response('invalid json',{status:400,headers:CORS})
  if(body.action==='apply') {
    const {data,error}=await userDb.rpc('apply_school_master_data',{p_batch_id:body.batch_id})
    return error ? Response.json({error:error.message},{status:400,headers:CORS}) : Response.json(data,{headers:CORS})
  }
  if(body.action!=='preview') return new Response('invalid action',{status:400,headers:CORS})
  const payload=cleanPayload(body.payload)
  const issues=validate(payload)
  const encoded=new TextEncoder().encode(JSON.stringify(payload))
  const contentHash=encodeHex(await crypto.subtle.digest('SHA-256',encoded))
  const service=createClient(URL,SERVICE)
  const counts=Object.fromEntries(allowedSheets.map(k=>[k,payload[k].length]))
  const keyTables = {subjects:'subjects',teachers:'teachers',sections:'sections',students:'students',guardians:'guardians',accounts:'school_account_profiles'} as const
  const existing: Record<string,Set<string>> = {}
  await Promise.all(Object.entries(keyTables).map(async ([sheet,table]) => {
    const {data}=await service.from(table).select('external_key')
    existing[sheet]=new Set((data??[]).map(row=>String(row.external_key)))
  }))
  const differences=Object.fromEntries(allowedSheets.map(sheet => {
    if(!existing[sheet]) return [sheet,{add:payload[sheet].length,update:0}]
    const update=payload[sheet].filter(row=>existing[sheet].has(String(row.external_key))).length
    return [sheet,{add:payload[sheet].length-update,update}]
  }))
  const preview={counts,differences,issues,valid:issues.length===0}
  if(issues.length) return Response.json({...preview,batch_id:null},{headers:CORS})
  const {data,error}=await service.from('school_import_batches').upsert({created_by:user.id,source_name:body.source_name||'school-master-data.xlsx',content_hash:contentHash,payload,preview,status:'previewed'},{onConflict:'created_by,content_hash'}).select('id,status').single()
  return error ? Response.json({error:error.message},{status:400,headers:CORS}) : Response.json({...preview,batch_id:data.id,status:data.status},{headers:CORS})
})
