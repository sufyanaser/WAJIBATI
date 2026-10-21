import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface ImportResult {
  created: number
  skipped: number
  errors: { row: number; message: string }[]
}

export default function ImportPage() {
  const nav = useNavigate()
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [resetPhone, setResetPhone] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/admin/login'); return }
      const { data: adm } = await supabase.from('admins').select('role').eq('user_id', data.session.user.id).maybeSingle()
      if (!adm) { await supabase.auth.signOut(); nav('/admin/login'); return }
    })
  }, [nav])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const form = new FormData()
    form.append('file', file)
    const res = await supabase.functions.invoke('import-guardians', { body: form })
    if (res.error) {
      setImportResult({ created: 0, skipped: 0, errors: [{ row: 0, message: res.error.message }] })
    } else {
      setImportResult(res.data as ImportResult)
    }
    setImporting(false)
    e.target.value = ''
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault()
    if (!resetPhone.trim() || !resetPin.trim()) return
    setResetting(true)
    setResetMsg('')
    const res = await supabase.functions.invoke('reset-pin', {
      body: { phone: resetPhone.trim(), new_pin: resetPin.trim() },
    })
    setResetMsg(res.error ? `خطأ: ${res.error.message}` : 'تم تحديث الـ PIN بنجاح ✓')
    setResetting(false)
    if (!res.error) { setResetPhone(''); setResetPin('') }
  }

  function downloadTemplate() {
    const header = 'student_name,stage,branch,section,guardian_name,phone,pin'
    const example = 'عمر أحمد محمد,الرابع,علمي,أ,أحمد محمد الدليمي,+9647801234567,123456'
    const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'import_template.csv'
    a.click()
  }

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 16 }}>
      <div className="import-section">
        <h2 className="import-heading">استيراد الطلاب وأولياء الأمور</h2>
        <p className="muted">ارفع ملف CSV يحتوي على بيانات الطلاب وأولياء الأمور.</p>
        <button className="icon-btn" style={{ width: '100%', marginBottom: 8 }} onClick={downloadTemplate}>
          ⬇ تنزيل قالب CSV
        </button>
        <label className="btn-publish-all" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
          {importing ? 'جارٍ الاستيراد…' : '📂 اختر ملف CSV للاستيراد'}
          <input type="file" accept=".csv,text/csv" hidden disabled={importing}
            onChange={handleImport} />
        </label>
      </div>

      {importResult && (
        <div className="import-result">
          <p className="import-stat">✅ تم إنشاء: <strong>{importResult.created}</strong></p>
          <p className="import-stat">⏭ موجود مسبقاً: <strong>{importResult.skipped}</strong></p>
          {importResult.errors.length > 0 && (
            <div className="import-errors">
              <p className="import-err-title">أخطاء ({importResult.errors.length}):</p>
              {importResult.errors.map((er, i) => (
                <p key={i} className="import-err-row">
                  سطر {er.row}: {er.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <hr className="import-divider" />

      <div className="import-section">
        <h2 className="import-heading">إعادة تعيين PIN</h2>
        <form className="notice-form" onSubmit={handleResetPin}>
          <input placeholder="رقم الهاتف (+9647XXXXXXXXX)" value={resetPhone}
            onChange={e => setResetPhone(e.target.value)} dir="ltr" />
          <input placeholder="PIN الجديد (6 أرقام)" value={resetPin} maxLength={6}
            onChange={e => setResetPin(e.target.value)} dir="ltr" />
          <button type="submit" disabled={resetting || !resetPhone || !resetPin}>
            {resetting ? '…' : 'تحديث الـ PIN'}
          </button>
        </form>
        {resetMsg && <p className={resetMsg.startsWith('خطأ') ? 'err' : 'muted'}>{resetMsg}</p>}
      </div>
    </div>
  )
}
