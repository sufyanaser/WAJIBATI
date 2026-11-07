import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, normalizePhone } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { platform } from '../../services/platform'
import { useSchoolSettings, SchoolSettings } from '../../services/schoolSettings'
import {
  ShieldIcon,
  KeyIcon,
  CheckIcon,
  SchoolIcon,
  UsersIcon,
  TableIcon,
} from '../../components/Icons'

const ROLE_LABELS: Record<'owner' | 'editor' | 'viewer', { title: string; desc: string; badgeClass: string }> = {
  owner: {
    title: 'مالك النظام (Owner)',
    desc: 'صلاحيات كاملة تشمل إدارة حسابات المسؤولين، استيراد بيانات المدرسة الرئيسية، وتحديث الإعدادات.',
    badgeClass: 'badge-gold',
  },
  editor: {
    title: 'محرر ومسؤول محتوى (Editor)',
    desc: 'صلاحيات كتابة وتعديل الواجبات اليومية، الجدول الدراسي، والإشعارات المدرسية وبيانات الطلاب.',
    badgeClass: 'badge-blue',
  },
  viewer: {
    title: 'مشاهد ومطلع (Viewer)',
    desc: 'صلاحيات قراءة فقط لمتابعة الواجبات والإحصائيات دون إمكانية التعديل.',
    badgeClass: 'badge-muted',
  },
}

export default function SettingsPage() {
  const { user, role } = useAdmin()
  const { settings, saveSettings, loading: loadingSchool } = useSchoolSettings()
  const [schoolForm, setSchoolForm] = useState<SchoolSettings>(settings)
  const [savingSchool, setSavingSchool] = useState(false)
  const [schoolMsg, setSchoolMsg] = useState<{ text: string; isError: boolean } | null>(null)

  const [resetPhone, setResetPhone] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  useEffect(() => {
    setSchoolForm(settings)
  }, [settings])

  async function handleSaveSchool(e: React.FormEvent) {
    e.preventDefault()
    setSavingSchool(true)
    setSchoolMsg(null)
    const res = await saveSettings(schoolForm)
    setSavingSchool(false)
    if (res.success) {
      setSchoolMsg({ text: 'تم حفظ وتحديث بيانات المدرسة والتقارير بنجاح.', isError: false })
    } else {
      setSchoolMsg({ text: res.error || 'فشل حفظ الإعدادات', isError: true })
    }
  }

  const displayName = user?.email
    ? user.email.replace(/@admin\.rumaila\.local$/i, '')
    : 'المشرف'

  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.viewer
  const guardState = platform.versionGuard.getState()
  const isDesktop = platform.isDesktop

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault()
    let cleanPhone = resetPhone.trim()
    try {
      cleanPhone = normalizePhone(cleanPhone)
    } catch {
      // keep raw if normalization fails
    }
    const cleanPin = resetPin.trim()

    if (!/^07[0-9]{9}$/.test(cleanPhone)) {
      setMessage({
        text: 'يرجى كتابة رقم هاتف عراقي صالح مكون من 11 رقماً يبدأ بـ 07 (مثال: 07801234567)',
        isError: true,
      })
      return
    }

    if (!/^[0-9]{6}$/.test(cleanPin)) {
      setMessage({
        text: 'رمز الدخول يجب أن يتكون من 6 أرقام بالضبط.',
        isError: true,
      })
      return
    }

    setBusy(true)
    setMessage(null)

    try {
      const { error } = await supabase.functions.invoke('reset-pin', {
        body: { phone: cleanPhone, new_pin: cleanPin },
      })

      if (error) {
        throw error
      }

      setMessage({
        text: `تم تحديث رمز الدخول بنجاح لرقم الهاتف (${cleanPhone}).`,
        isError: false,
      })
      setResetPhone('')
      setResetPin('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الرمز.'
      setMessage({
        text: `تعذر تحديث الرمز: ${msg}`,
        isError: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div dir="rtl" className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">الإعدادات والصلاحيات</h2>
          <p className="admin-page-desc">
            إدارة صلاحيات الحسابات، إعادة تعيين رموز أولياء الأمور، والتحقق من حالة النظام وبيئة التشغيل.
          </p>
        </div>
      </div>

      <div className="admin-cards-grid" style={{ display: 'grid', gap: 20 }}>
        {/* School Identity & Official Report Settings Card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="card-icon-wrapper" style={{ background: 'rgba(0, 123, 254, 0.10)', padding: 10, borderRadius: 10 }}>
              <SchoolIcon size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)' }}>
                بيانات وهوية المدرسة الرسمية
              </h3>
              <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
                المصدر المركزي لاسم المدرسة وبيانات الترويسة والتذييل المستخدمة في الواجهات وتقارير التصدير والطباعة.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSchool} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  اسم المدرسة الرسمي
                </label>
                <input
                  type="text"
                  className="input"
                  value={schoolForm.name}
                  onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="مثال: إعدادية الرميلة للبنين"
                  disabled={savingSchool || role === 'viewer'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  الوزارة التابعة
                </label>
                <input
                  type="text"
                  className="input"
                  value={schoolForm.ministry}
                  onChange={e => setSchoolForm(f => ({ ...f, ministry: e.target.value }))}
                  required
                  placeholder="مثال: وزارة التربية"
                  disabled={savingSchool || role === 'viewer'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  المديرية العامة للتربية
                </label>
                <input
                  type="text"
                  className="input"
                  value={schoolForm.directorate}
                  onChange={e => setSchoolForm(f => ({ ...f, directorate: e.target.value }))}
                  required
                  placeholder="مثال: المديرية العامة لتربية الأنبار"
                  disabled={savingSchool || role === 'viewer'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  المحافظة
                </label>
                <input
                  type="text"
                  className="input"
                  value={schoolForm.governorate}
                  onChange={e => setSchoolForm(f => ({ ...f, governorate: e.target.value }))}
                  required
                  placeholder="مثال: الأنبار"
                  disabled={savingSchool || role === 'viewer'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  الموقع الجغرافي / القضاء
                </label>
                <input
                  type="text"
                  className="input"
                  value={schoolForm.location}
                  onChange={e => setSchoolForm(f => ({ ...f, location: e.target.value }))}
                  required
                  placeholder="مثال: الرمادي - الرميلة"
                  disabled={savingSchool || role === 'viewer'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  هاتف التواصل أو الاستعلامات
                </label>
                <input
                  type="text"
                  className="input"
                  value={schoolForm.contact}
                  onChange={e => setSchoolForm(f => ({ ...f, contact: e.target.value }))}
                  dir="ltr"
                  placeholder="+964..."
                  disabled={savingSchool || role === 'viewer'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                نص المسؤولية والاعتماد (يظهر في تذييل التقارير الرسمية A4)
              </label>
              <input
                type="text"
                className="input"
                value={schoolForm.disclaimer}
                onChange={e => setSchoolForm(f => ({ ...f, disclaimer: e.target.value }))}
                required
                placeholder="مثال: مسؤول إدخال البيانات والواجبات: إدارة المدرسة"
                disabled={savingSchool || role === 'viewer'}
              />
            </div>

            {schoolMsg && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: '.9rem',
                  background: schoolMsg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  border: `1px solid ${schoolMsg.isError ? '#ef4444' : '#22c55e'}`,
                  color: schoolMsg.isError ? '#fca5a5' : '#86efac',
                }}
              >
                {schoolMsg.text}
              </div>
            )}

            {role !== 'viewer' && (
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingSchool}
                >
                  <CheckIcon size={18} />
                  <span>{savingSchool ? 'جارٍ حفظ الإعدادات…' : 'حفظ وتحديث بيانات المدرسة'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Session & Role Card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="card-icon-wrapper" style={{ background: 'rgba(232, 176, 74, 0.12)', padding: 10, borderRadius: 10 }}>
              <ShieldIcon size={24} style={{ color: '#E8B04A' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)' }}>
                جلسة المشرف الحالية
              </h3>
              <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
                المعرف: <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: 600 }}>{displayName}</span>
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className={`badge ${roleInfo.badgeClass}`} style={{ fontSize: '.85rem', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                {roleInfo.title}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '.9rem', color: 'var(--fg-secondary)', lineHeight: 1.6 }}>
              {roleInfo.desc}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              to="/admin/master-data?entity=accounts"
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <UsersIcon size={18} />
              <span>إدارة حسابات المسؤولين</span>
            </Link>
            <Link
              to="/admin/master-data"
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <TableIcon size={18} />
              <span>سجل الجداول وقاعدة البيانات</span>
            </Link>
          </div>
        </div>

        {/* Guardian PIN Reset Card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="card-icon-wrapper" style={{ background: 'rgba(0, 123, 254, 0.10)', padding: 10, borderRadius: 10 }}>
              <KeyIcon size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)' }}>
                إعادة تعيين رمز دخول ولي الأمر
              </h3>
              <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
                تحديث الرمز السري المكون من 6 أرقام لحساب ولي الأمر المرتبط برقم هاتفه.
              </p>
            </div>
          </div>

          <p className="muted" style={{ fontSize: '.85rem', lineHeight: 1.5, marginBottom: 16 }}>
            ملاحظة أمنية: يتم تنفيذ هذه العملية عبر دالة السحابة المؤمنة مباشرة دون حفظ الرمز في ملفات Excel.
          </p>

          <form onSubmit={handleResetPin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  رقم هاتف ولي الأمر (11 رقماً يبدأ بـ 07)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="07XXXXXXXXX"
                  value={resetPhone}
                  onChange={e => setResetPhone(e.target.value)}
                  dir="ltr"
                  disabled={busy}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.85rem', marginBottom: 6, color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  الرمز السري الجديد (6 أرقام)
                </label>
                <input
                  type="text"
                  className="input"
                  maxLength={6}
                  placeholder="مثال: 123456"
                  value={resetPin}
                  onChange={e => setResetPin(e.target.value.replace(/\D/g, ''))}
                  dir="ltr"
                  disabled={busy}
                  style={{ letterSpacing: '3px' }}
                />
              </div>
            </div>

            {message && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: '.9rem',
                  background: message.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  border: `1px solid ${message.isError ? '#ef4444' : '#22c55e'}`,
                  color: message.isError ? '#fca5a5' : '#86efac',
                }}
              >
                {message.text}
              </div>
            )}

            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !resetPhone || resetPin.length !== 6}
              >
                <CheckIcon size={18} />
                <span>{busy ? 'جارٍ تحديث الرمز…' : 'حفظ وتحديث رمز الدخول'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* System & Environment Info */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="card-icon-wrapper" style={{ background: 'rgba(0, 123, 254, 0.08)', padding: 10, borderRadius: 10 }}>
              <SchoolIcon size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)' }}>
                بيانات المدرسة وبيئة التشغيل
              </h3>
              <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
                المعلومات التقنية والامتثال الأمني للتطبيق
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: '.78rem', display: 'block' }}>المؤسسة التعليمية</span>
              <span style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '.9rem' }}>{settings.name}</span>
            </div>
            <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: '.78rem', display: 'block' }}>البيئة الحالية</span>
              <span style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '.9rem' }}>
                {isDesktop ? 'تطبيق سطح المكتب (Windows Tauri 2)' : 'تطبيق الويب (PWA Web Browser)'}
              </span>
            </div>
            <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: '.78rem', display: 'block' }}>حالة حماية التوافق (Version Guard)</span>
              <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '.9rem', direction: 'ltr', display: 'inline-block' }}>
                {guardState}
              </span>
            </div>
            <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: '.78rem', display: 'block' }}>قاعدة البيانات السحابية</span>
              <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '.9rem' }}>Supabase Postgres + RLS Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
