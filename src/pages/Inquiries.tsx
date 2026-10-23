import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSchoolSettings } from '../services/schoolSettings'
import {
  ChevronRightIcon,
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
    <main
      className="screen"
      dir="rtl"
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 'max(16px, env(safe-area-inset-top, 0px)) 16px max(32px, env(safe-area-inset-bottom, 0px)) 16px',
        minHeight: '100dvh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Top Header with Back Navigation */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          onClick={() => nav('/')}
          className="icon-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: '.9rem',
            color: 'var(--fg)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          <ChevronRightIcon size={18} />
          <span>العودة للرئيسية</span>
        </button>

        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--fg-muted)' }}>{settings.name}</span>
        </div>
      </header>

      {/* Page Title */}
      <div>
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--accent)',
            margin: '0 0 6px 0',
          }}
        >
          استفسارات أولياء الأمور
        </h1>
        <p style={{ margin: 0, fontSize: '.9rem', color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
          منصة التواصل والاستفسار المباشر مع إدارة وكادر المدرسة حول التحاضير والواجبات والملاحظات اليومية.
        </p>
      </div>

      {/* Notice Banner: Coming Soon */}
      <div
        role="status"
        style={{
          background: 'rgba(232, 176, 74, 0.12)',
          border: '1.5px solid rgba(232, 176, 74, 0.4)',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>
          <FileTextIcon size={22} />
        </div>
        <div style={{ fontSize: '.9rem', lineHeight: 1.6, color: '#F8FAFC' }}>
          <strong style={{ display: 'block', color: 'var(--accent)', marginBottom: 2 }}>
            تنويه تنظيمي لخدمة المراسلة
          </strong>
          خدمة إرسال واستقبال الاستفسارات المباشرة قيد التجهيز الفني والربط المباشر مع قسم شؤون الطلاب، وستُفعّل قريباً لتسهيل التواصل الفوري مع كادر المدرسة.
        </div>
      </div>

      {/* Inquiries Form Container */}
      <form
        onSubmit={e => e.preventDefault()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 8px 24px var(--shadow)',
        }}
      >
        {/* Guardian and Account Info (Read-only Auto-filled) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            background: 'var(--card2)',
            padding: 14,
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '.8rem', color: 'var(--fg-muted)', marginBottom: 4 }}>
              اسم ولي الأمر
            </label>
            <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--fg)' }}>
              {loading ? 'جارٍ التحميل…' : (guardianName || 'ولي الأمر')}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '.8rem', color: 'var(--fg-muted)', marginBottom: 4 }}>
              رقم الهاتف المعتمد
            </label>
            <div dir="ltr" style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--fg)', textAlign: 'right' }}>
              {loading ? 'جارٍ التحميل...' : (guardianPhone || 'غير مسجل')}
            </div>
          </div>
        </div>

        {/* Student Selection */}
        <div>
          <label
            htmlFor="inquiry-student"
            style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--fg-secondary)' }}
          >
            الطالب المرتبط بالاستفسار
          </label>
          {children.length > 1 ? (
            <select
              id="inquiry-student"
              value={selectedChildId ?? ''}
              onChange={e => setSelectedChildId(Number(e.target.value))}
              className="input"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
            >
              {children.map(c => (
                <option key={c.student_id} value={c.student_id}>
                  {c.full_name} ({c.section_label})
                </option>
              ))}
            </select>
          ) : children.length === 1 ? (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--card2)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontWeight: 600,
                color: 'var(--fg)',
                fontSize: '.95rem',
              }}
            >
              {children[0].full_name} <span style={{ color: 'var(--fg-muted)', fontSize: '.85rem' }}>({children[0].section_label})</span>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', background: 'var(--card2)', borderRadius: 8, color: 'var(--fg-muted)' }}>
              لا يوجد طالب مسجل حالياً
            </div>
          )}
        </div>

        {/* Inquiry Category */}
        <div>
          <label
            htmlFor="inquiry-type"
            style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--fg-secondary)' }}
          >
            نوع الاستفسار
          </label>
          <select
            id="inquiry-type"
            value={inquiryType}
            onChange={e => setInquiryType(e.target.value)}
            className="input"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
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
            style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--fg-secondary)' }}
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
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
          />
        </div>

        {/* Inquiry Body */}
        <div>
          <label
            htmlFor="inquiry-body"
            style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--fg-secondary)' }}
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
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 8,
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Submit Action: Disabled with Clear Notice */}
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            disabled
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1rem',
              fontWeight: 700,
              justifyContent: 'center',
              opacity: 0.55,
              cursor: 'not-allowed',
            }}
          >
            <SendIcon size={18} />
            <span>إرسال الاستفسار (سيُفعّل قريباً)</span>
          </button>
          <span style={{ fontSize: '.78rem', color: 'var(--fg-muted)', textAlign: 'center' }}>
            الزر معطل مؤقتاً لحين استكمال ربط الخادم السحابي للاستفسارات.
          </span>
        </div>
      </form>
    </main>
  )
}
