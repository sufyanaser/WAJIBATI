import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MASTER_SHEETS, readSchoolMasterWorkbook } from '../../lib/schoolMasterData'

type Issue = { sheet: string; row: number; field?: string; message: string }
type Preview = { batch_id: string | null; valid: boolean; counts: Record<string, number>; differences: Record<string, { add: number; update: number }>; issues: Issue[] }

export default function ImportPage() {
  const nav = useNavigate()
  const [role, setRole] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [resetPhone, setResetPhone] = useState('')
  const [resetPin, setResetPin] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/admin/login'); return }
      const { data: adm } = await supabase.from('admins').select('role').eq('user_id', data.session.user.id).maybeSingle()
      if (!adm) { await supabase.auth.signOut(); nav('/admin/login'); return }
      setRole(adm.role)
    })
  }, [nav])

  async function handleFile(file?: File) {
    if (!file) return
    setBusy(true); setPreview(null); setMessage(''); setConfirmed(false)
    try {
      const payload = await readSchoolMasterWorkbook(file)
      const { data, error } = await supabase.functions.invoke('import-school-master', { body: { action: 'preview', source_name: file.name, payload } })
      if (error) throw error
      setPreview(data as Preview)
    } catch (error) {
      setMessage(`تعذر قراءة الملف أو معاينته: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    } finally { setBusy(false) }
  }

  async function applyImport() {
    if (!preview?.valid || !preview.batch_id || role !== 'owner') return
    setBusy(true); setMessage('')
    const { data, error } = await supabase.functions.invoke('import-school-master', { body: { action: 'apply', batch_id: preview.batch_id } })
    setMessage(error ? `فشل التطبيق: ${error.message}` : `تم التطبيق بنجاح. العناصر المعالجة: ${data?.affected ?? 0}`)
    setBusy(false)
  }

  async function resetGuardianPin(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\+9647[0-9]{9}$/.test(resetPhone) || !/^[0-9]{6}$/.test(resetPin)) {
      setMessage('تحقق من رقم الهاتف والرمز المكون من 6 أرقام.'); return
    }
    setBusy(true); setMessage('')
    const { error } = await supabase.functions.invoke('reset-pin', { body: { phone: resetPhone, new_pin: resetPin } })
    setMessage(error ? `فشل تحديث الرمز: ${error.message}` : 'تم تحديث رمز الدخول بنجاح.')
    if (!error) { setResetPhone(''); setResetPin('') }
    setBusy(false)
  }

  return <div dir="rtl" className="master-import">
    <section className="import-section">
      <h2 className="import-heading">بيانات المدرسة الرئيسية</h2>
      <div className="master-steps">
        <p><strong>١.</strong> نزّل القالب وافتح ورقة «اقرأني».</p>
        <p><strong>٢.</strong> املأ البيانات ثم اختر الملف هنا. سنفحصه فقط.</p>
        <p><strong>٣.</strong> راجع النتيجة واضغط «تطبيق» إذا كانت صحيحة.</p>
      </div>
      <a className="icon-btn master-template" href="/templates/school-master-data.xlsx" download>⬇ تنزيل ملف المدرسة الجاهز</a>
      <p className="master-warning">مهم: لا تكتب الرقم السري أو كلمة المرور في الملف.</p>
      <label className="btn-publish-all master-picker">
        {busy ? 'جارٍ الفحص…' : '📂 اختر ملف Excel للمعاينة'}
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden disabled={busy} onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = '' }} />
      </label>
    </section>
    {preview && <section className="import-result">
      <h3 className="import-heading">معاينة الفروقات والتحقق</h3>
      <div className="master-counts">{MASTER_SHEETS.map(sheet => <span key={sheet}><strong>{sheet}</strong><br />إضافة {preview.differences?.[sheet]?.add ?? 0}، تحديث {preview.differences?.[sheet]?.update ?? 0}</span>)}</div>
      {preview.valid ? <p className="master-ok" role="status">الملف صالح للتطبيق. لم تُغيّر أي بيانات بعد.</p> : <p className="err" role="alert">يوجد {preview.issues.length} خطأ. أصلحها ثم أعد المعاينة.</p>}
      {!!preview.issues.length && <div className="import-errors" role="alert">{preview.issues.map((issue, i) => <p key={i} className="import-err-row">ورقة {issue.sheet}، صف {issue.row}{issue.field ? `، ${issue.field}` : ''}: {issue.message}</p>)}</div>}
      {preview.valid && <label className="master-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> راجعت الملخص وأوافق على تحديث بيانات المدرسة.</label>}
      <button type="button" className="btn-publish-all" disabled={busy || !confirmed || !preview.valid || !preview.batch_id || role !== 'owner'} onClick={() => void applyImport()}>
        {role === 'owner' ? 'تطبيق الدفعة المصرح بها' : 'التطبيق متاح لمالك النظام فقط'}
      </button>
    </section>}
    {message && <p role="alert" className={message.startsWith('تم') ? 'master-ok' : 'err'}>{message}</p>}
    <hr className="import-divider" />
    <section className="import-section">
      <h2 className="import-heading">تغيير رمز دخول ولي الأمر</h2>
      <p className="muted" style={{ textAlign: 'right', padding: 0 }}>هذه العملية منفصلة عن ملف Excel ولا تحفظ الرمز في بيانات المدرسة.</p>
      <form className="notice-form" style={{ padding: 0, border: 'none', boxShadow: 'none' }} onSubmit={event => void resetGuardianPin(event)}>
        <input aria-label="رقم الهاتف" placeholder="رقم الهاتف (+9647XXXXXXXXX)" value={resetPhone} onChange={e => setResetPhone(e.target.value)} dir="ltr" />
        <input aria-label="الرمز الجديد" placeholder="الرمز الجديد (6 أرقام)" value={resetPin} maxLength={6} onChange={e => setResetPin(e.target.value.replace(/\D/g,''))} dir="ltr" />
        <button type="submit" className="btn-publish-all" disabled={busy || !resetPhone || resetPin.length !== 6}>تحديث رمز الدخول</button>
      </form>
    </section>
  </div>
}
