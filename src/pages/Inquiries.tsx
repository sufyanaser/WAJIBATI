import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSchoolSettings } from '../services/schoolSettings'
import { PageHeader } from '../components/PageHeader'
import { BottomNavBar } from '../components/BottomNavBar'
import {
  SendIcon,
  FamilyIcon,
  BookIcon,
  FileTextIcon,
} from '../components/Icons'

interface ChildInfo {
  student_id: number
  full_name: string
  section_label: string
}

export default function Inquiries() {
  const nav = useNavigate()
  const { settings } = useSchoolSettings()

  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [inquiryType, setInquiryType] = useState('واجب مدرسي')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: sess } = await supabase.auth.getSession()
        if (!sess.session) {
          nav('/login')
          return
        }

        // Fetch guardian profile
        const { data: gData } = await supabase
          .from('guardians')
          .select('full_name, phone')
          .maybeSingle()

        if (gData) {
          setGuardianName(gData.full_name || 'ولي الأمر')
          setGuardianPhone(gData.phone || '')
        } else if (sess.session.user.email) {
          // Fallback phone from email format <phone>@guardian...
          const phonePart = sess.session.user.email.split('@')[0]
          setGuardianPhone(phonePart ? '0' + phonePart.slice(-10) : '')
          setGuardianName('ولي الأمر')
        }

        // Fetch linked students
        type GS = {
          student_id: number
          student: {
            full_name: string
            section: {
              letter: string
              stage: { name: string; branch: string }
            }
          }
        }

        const { data: gsData } = await supabase
          .from('guardian_students')
          .select('student_id, student:students!inner(full_name, section:sections!inner(letter, stage:stages!inner(name, branch)))')

        const rows = (gsData ?? []) as unknown as GS[]
        const childList = rows.map(r => ({
          student_id: r.student_id,
          full_name: r.student.full_name,
          section_label: `${r.student.section.stage.name} ${r.student.section.stage.branch} / ${r.student.section.letter}`,
        }))

        setChildren(childList)
        if (childList.length > 0) {
          setSelectedChildId(childList[0].student_id)
        }
      } catch (err) {
        console.error('Failed to load inquiry context', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [nav])

  return (
    <main className="screen inq-page" dir="rtl">
      {/* ── Unified Header ── */}
      <PageHeader
        title="الاستفسارات والتواصل"
        subtitle={settings.name}
        onBack={() => nav('/')}
        backLabel="العودة للرئيسية"
      />

      {/* ── Notice Banner: Coming Soon ── */}
      <div role="status" className="info-banner">
        <div className="info-banner-icon">
          <FileTextIcon size={22} />
        </div>
        <div className="info-banner-content">
          <strong className="info-banner-title">
            تنويه تنظيمي لخدمة المراسلة
          </strong>
          خدمة إرسال واستقبال الاستفسارات المباشرة قيد التجهيز الفني والربط المباشر مع قسم شؤون الطلاب، وستُفعّل قريباً لتسهيل التواصل الفوري مع كادر المدرسة.
        </div>
      </div>

      {/* Inquiries Form Container */}
      <form onSubmit={e => e.preventDefault()} className="inq-form">
        {/* Guardian and Account Info (Read-only Auto-filled) */}
        <div className="inq-info">
          <div>
            <label className="inq-info-label">
              اسم ولي الأمر
            </label>
            <div className="inq-info-value">
              {loading ? 'جارٍ التحميل…' : (guardianName || 'ولي الأمر')}
            </div>
          </div>

          <div>
            <label className="inq-info-label">
              رقم الهاتف المعتمد
            </label>
            <div dir="ltr" className="inq-info-value inq-info-value--ltr">
              {loading ? 'جارٍ التحميل...' : (guardianPhone || 'غير مسجل')}
            </div>
          </div>
        </div>

        {/* Student Selection */}
        <div>
          <label
            htmlFor="inquiry-student"
            className="field-label"
          >
            الطالب المرتبط بالاستفسار
          </label>
          {children.length > 1 ? (
            <select
              id="inquiry-student"
              value={selectedChildId ?? ''}
              onChange={e => setSelectedChildId(Number(e.target.value))}
              className="input"
            >
              {children.map(c => (
                <option key={c.student_id} value={c.student_id}>
                  {c.full_name} ({c.section_label})
                </option>
              ))}
            </select>
          ) : children.length === 1 ? (
            <div className="inq-readonly">
              {children[0].full_name} <span className="inq-muted">({children[0].section_label})</span>
            </div>
          ) : (
            <div className="inq-readonly inq-readonly--empty">
              لا يوجد طالب مسجل حالياً
            </div>
          )}
        </div>

        {/* Inquiry Category */}
        <div>
          <label
            htmlFor="inquiry-type"
            className="field-label"
          >
            نوع الاستفسار
          </label>
          <select
            id="inquiry-type"
            value={inquiryType}
            onChange={e => setInquiryType(e.target.value)}
            className="input"
          >
            <option value="واجب مدرسي">استفسار عن واجب مدرسي</option>
            <option value="استفسار إداري">استفسار إداري أو شؤون مدرسية</option>
            <option value="ملاحظة دراسية">ملاحظة على سير الدروس والمواد</option>
            <option value="تواصل مع مدرس">طلب توضيح أو تواصل مع مدرس المادة</option>
            <option value="أخرى">استفسار عام آخر</option>
          </select>
        </div>

        {/* Inquiry Subject */}
        <div>
          <label
            htmlFor="inquiry-subject"
            className="field-label"
          >
            عنوان الرسالة
          </label>
          <input
            id="inquiry-subject"
            type="text"
            className="input"
            placeholder="مثال: استفسار حول مسألة الرياضيات ليوم الخميس"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        {/* Inquiry Body */}
        <div>
          <label
            htmlFor="inquiry-body"
            className="field-label"
          >
            نص الرسالة أو الاستفسار
          </label>
          <textarea
            id="inquiry-body"
            rows={5}
            className="input"
            placeholder="اكتب تفاصيل الاستفسار هنا بوضوح…"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        {/* Submit Action: Disabled with Clear Notice */}
        <div className="inq-submit">
          <button type="button" disabled className="btn btn-primary btn-block">
            <SendIcon size={18} />
            <span>إرسال الاستفسار (سيُفعّل قريباً)</span>
          </button>
          <span className="inq-hint">
            الزر معطل مؤقتاً لحين استكمال ربط الخادم السحابي للاستفسارات.
          </span>
        </div>
      </form>

      {/* ── Unified 5-Item Bottom Navigation Bar ── */}
      <BottomNavBar
        onLogout={async () => {
          await supabase.auth.signOut()
          nav('/login')
        }}
      />
    </main>
  )
}
