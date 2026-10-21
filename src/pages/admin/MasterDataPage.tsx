import { useEffect, useMemo, useState } from 'react'
import ImportPage from './ImportPage'
import { supabase } from '../../lib/supabase'

type Row = Record<string, unknown>
type Option = { value: string | number; label: string }
type Field = { key: string; label: string; required?: boolean; type?: 'text'|'number'|'phone'|'email'|'boolean'|'select'; options?: Option[] }
type Entity = { key: string; label: string; table: string; fields: Field[]; active?: boolean; ownerOnly?: boolean; id?: string; summary: (row: Row) => string }

const keyOf = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`

export default function MasterDataPage() {
  const [mode,setMode]=useState<'manual'|'excel'>('manual')
  const [entityKey,setEntityKey]=useState('subjects')
  const [rows,setRows]=useState<Row[]>([])
  const [lookups,setLookups]=useState<Record<string,Option[]>>({})
  const [form,setForm]=useState<Row>({})
  const [editing,setEditing]=useState<Row|null>(null)
  const [role,setRole]=useState('viewer')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  useEffect(()=>{ void loadLookups() },[])

  async function loadLookups() {
    const [{data:subjects},{data:teachers},{data:sections},{data:students},{data:guardians},{data:years},{data:stages},{data:admin}] = await Promise.all([
      supabase.from('subjects').select('id,name').order('sort'), supabase.from('teachers').select('id,full_name').eq('active',true),
      supabase.from('sections').select('id,letter,stage:stages(name,branch)').eq('active',true), supabase.from('students').select('id,full_name').eq('active',true),
      supabase.from('guardians').select('id,full_name,phone').eq('active',true), supabase.from('academic_years').select('id,label').order('id',{ascending:false}),
      supabase.from('stages').select('id,name,branch').order('sort'), supabase.from('admins').select('role').eq('user_id',(await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle(),
    ])
    setRole(admin?.role ?? 'viewer')
    setLookups({
      subjects:(subjects??[]).map(x=>({value:x.id,label:x.name})), teachers:(teachers??[]).map(x=>({value:x.id,label:x.full_name})),
      sections:(sections??[]).map(x=>({value:x.id,label:`${(x.stage as unknown as {name:string;branch:string}).name} ${(x.stage as unknown as {name:string;branch:string}).branch} ${x.letter}`})),
      students:(students??[]).map(x=>({value:x.id,label:x.full_name})), guardians:(guardians??[]).map(x=>({value:x.id,label:`${x.full_name ?? ''} ${x.phone}`})),
      years:(years??[]).map(x=>({value:x.id,label:x.label})), stages:(stages??[]).map(x=>({value:x.id,label:`${x.name} ${x.branch}`})),
    })
  }

  const entities=useMemo<Entity[]>(()=>[
    {key:'subjects',label:'المواد',table:'subjects',active:false,fields:[{key:'external_key',label:'رمز ثابت',required:true},{key:'name',label:'اسم المادة',required:true},{key:'color',label:'اللون'},{key:'sort',label:'الترتيب',type:'number'}],summary:r=>String(r.name??'')},
    {key:'teachers',label:'المدرسون',table:'teachers',active:true,fields:[{key:'external_key',label:'رمز ثابت',required:true},{key:'full_name',label:'اسم المدرس',required:true},{key:'subject_id',label:'المادة',required:true,type:'select',options:lookups.subjects},{key:'phone',label:'رقم الهاتف',type:'phone'}],summary:r=>String(r.full_name??'')},
    {key:'sections',label:'الشعب',table:'sections',active:true,fields:[{key:'external_key',label:'رمز ثابت',required:true},{key:'year_id',label:'العام الدراسي',required:true,type:'select',options:lookups.years},{key:'stage_id',label:'المرحلة والفرع',required:true,type:'select',options:lookups.stages},{key:'letter',label:'حرف الشعبة',required:true}],summary:r=>`شعبة ${r.letter??''}`},
    {key:'timetable',label:'الجداول',table:'timetable',fields:[{key:'section_id',label:'الشعبة',required:true,type:'select',options:lookups.sections},{key:'weekday',label:'اليوم',required:true,type:'select',options:[{value:0,label:'الأحد'},{value:1,label:'الاثنين'},{value:2,label:'الثلاثاء'},{value:3,label:'الأربعاء'},{value:4,label:'الخميس'}]},{key:'period',label:'الحصة',required:true,type:'number'},{key:'subject_id',label:'المادة',required:true,type:'select',options:lookups.subjects},{key:'teacher_id',label:'المدرس',type:'select',options:lookups.teachers}],summary:r=>`اليوم ${Number(r.weekday)+1}، الحصة ${r.period}`},
    {key:'students',label:'الطلاب',table:'students',active:true,fields:[{key:'external_key',label:'رمز ثابت',required:true},{key:'full_name',label:'اسم الطالب',required:true},{key:'section_id',label:'الشعبة',required:true,type:'select',options:lookups.sections},{key:'notes',label:'ملاحظات'}],summary:r=>String(r.full_name??'')},
    {key:'guardians',label:'أولياء الأمور',table:'guardians',active:true,fields:[{key:'external_key',label:'رمز ثابت',required:true},{key:'full_name',label:'اسم ولي الأمر',required:true},{key:'phone',label:'رقم الهاتف',required:true,type:'phone'},{key:'alt_phone',label:'رقم بديل',type:'phone'}],summary:r=>`${r.full_name??''} — ${r.phone??''}`},
    {key:'guardian_students',label:'ربط الطلاب بالأولياء',table:'guardian_students',id:'guardian_id',fields:[{key:'guardian_id',label:'ولي الأمر',required:true,type:'select',options:lookups.guardians},{key:'student_id',label:'الطالب',required:true,type:'select',options:lookups.students},{key:'relation',label:'صلة القرابة'}],summary:r=>String(r.relation??'صلة قرابة')},
    {key:'accounts',label:'الحسابات والصلاحيات',table:'school_account_profiles',id:'external_key',active:true,ownerOnly:true,fields:[{key:'external_key',label:'رمز الحساب',required:true},{key:'email',label:'البريد الإلكتروني',required:true,type:'email'},{key:'full_name',label:'اسم المستخدم',required:true},{key:'role',label:'الصلاحية',required:true,type:'select',options:[{value:'owner',label:'مالك النظام'},{value:'editor',label:'محرر'},{value:'viewer',label:'مشاهد'}]}],summary:r=>`${r.full_name??''} — ${r.role??''}`},
  ],[lookups])
  const entity=entities.find(x=>x.key===entityKey)??entities[0]

  useEffect(()=>{ void loadRows(entity) },[entityKey,lookups])
  async function loadRows(current:Entity) { setBusy(true); const {data,error}=await supabase.from(current.table).select('*').limit(300); setRows(data??[]); setMessage(error?`تعذر تحميل البيانات: ${error.message}`:''); setBusy(false) }
  function startAdd(){ const initial:Row={}; if(entity.fields.some(f=>f.key==='external_key')) initial.external_key=keyOf(entity.key.slice(0,3).toUpperCase()); if(entity.active) initial.active=true; setForm(initial); setEditing(null) }
  function startEdit(row:Row){ setForm({...row}); setEditing(row) }
  async function save(event:React.FormEvent){ event.preventDefault(); setBusy(true); setMessage(''); const id=entity.id??'id'; const payload=Object.fromEntries(entity.fields.map(f=>[f.key,form[f.key]??null])); if(entity.active) payload.active=form.active??true; const query=editing?supabase.from(entity.table).update(payload).eq(id,editing[id] as never):supabase.from(entity.table).insert(payload); const {error}=await query; setMessage(error?`لم يتم الحفظ: ${error.message}`:'تم حفظ البيانات بنجاح.'); if(!error){setForm({});setEditing(null);await loadRows(entity);await loadLookups()} setBusy(false) }
  async function deactivate(row:Row){ if(!confirm(entity.active?'هل تريد تعطيل هذا السجل؟ يمكن إعادته لاحقاً.':'هل تريد حذف هذا الربط أو الموعد؟'))return; setBusy(true); const id=entity.id??'id'; const query=entity.active?supabase.from(entity.table).update({active:false}).eq(id,row[id] as never):supabase.from(entity.table).delete().eq(id,row[id] as never); const {error}=await query; setMessage(error?`تعذر التنفيذ: ${error.message}`:'تم التنفيذ بنجاح.'); await loadRows(entity); setBusy(false) }
  const canEdit=role==='owner'||role==='editor'; const allowed=!entity.ownerOnly||role==='owner'

  return <div className="master-data" dir="rtl">
    <div className="master-mode"><button className={mode==='manual'?'active':''} onClick={()=>setMode('manual')}>إضافة وتعديل</button><button className={mode==='excel'?'active':''} onClick={()=>setMode('excel')}>استيراد Excel</button></div>
    {mode==='excel'?<ImportPage/>:<>
      <div className="master-entities">{entities.map(item=><button key={item.key} className={entityKey===item.key?'active':''} onClick={()=>{setEntityKey(item.key);setForm({});setEditing(null)}}>{item.label}</button>)}</div>
      {!allowed?<p className="master-warning">إدارة الحسابات والصلاحيات متاحة لمالك النظام فقط.</p>:<>
        <div className="master-toolbar"><h2>{entity.label}</h2>{canEdit&&<button className="btn-publish-all" onClick={startAdd}>إضافة جديد</button>}</div>
        {Object.keys(form).length>0&&<form className="master-form" onSubmit={e=>void save(e)}>{entity.fields.map(field=><label key={field.key}><span>{field.label}{field.required?' *':''}</span>{field.type==='select'?<select required={field.required} value={String(form[field.key]??'')} onChange={e=>setForm({...form,[field.key]:e.target.value})}><option value="">اختر…</option>{field.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input required={field.required} type={field.type==='number'?'number':field.type==='email'?'email':'text'} value={String(form[field.key]??'')} onChange={e=>setForm({...form,[field.key]:field.type==='number'?Number(e.target.value):e.target.value})}/>}</label>)}<div className="master-form-actions"><button type="submit" disabled={busy}>حفظ</button><button type="button" className="icon-btn" onClick={()=>{setForm({});setEditing(null)}}>إلغاء</button></div></form>}
        {message&&<p className={message.startsWith('تم')?'master-ok':'err'}>{message}</p>}
        <div className="master-list">{busy&&<p className="muted">جارٍ التحميل…</p>}{rows.map((row,index)=><article key={String(row[entity.id??'id']??index)}><div><strong>{entity.summary(row)}</strong>{row.active===false&&<small>معطّل</small>}</div>{canEdit&&<div><button className="icon-btn" onClick={()=>startEdit(row)}>تعديل</button><button className="icon-btn danger" onClick={()=>void deactivate(row)}>{entity.active?'تعطيل':'حذف'}</button></div>}</article>)}</div>
      </>}
    </>}
  </div>
}
