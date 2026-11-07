import React from 'react'
import type { GuardianPeriodSlot, UnmatchedHomeworkItem } from '../../hooks/useGuardianSchedule'
import { PeriodCard } from './PeriodCard'
import { BookIcon, FileTextIcon, ImageIcon } from '../Icons'

interface SubjectGridProps {
  periods: GuardianPeriodSlot[]
  unmatchedHomework: UnmatchedHomeworkItem[]
  loading: boolean
  error: string | null
  isWeekend: boolean
  isTimetableAvailable: boolean
  onSelectPeriod: (slot: GuardianPeriodSlot) => void
  onSelectUnmatched: (item: UnmatchedHomeworkItem) => void
  onRetry: () => void
  activePeriodNumber: number | null
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({
  periods,
  unmatchedHomework,
  loading,
  error,
  isWeekend,
  isTimetableAvailable,
  onSelectPeriod,
  onSelectUnmatched,
  onRetry,
  activePeriodNumber,
}) => {
  // ── 1. Loading Skeleton Grid ──────────────────────────────────────────────
  if (loading) {
    return (
      <section className="subject-grid-container" aria-busy="true" aria-label="جارٍ تحميل الجدول">
        <div className="period-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="period-card skeleton">
              <div className="skeleton-header">
                <div className="skeleton-circle" />
                <div className="skeleton-pill" />
              </div>
              <div className="skeleton-body">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // ── 2. Error State with Retry Button ──────────────────────────────────────
  if (error) {
    return (
      <div className="schedule-error-card" dir="rtl">
        <p className="schedule-error-text">{error}</p>
        <button type="button" onClick={onRetry} className="schedule-retry-btn">
          إعادة المحاولة ↻
        </button>
      </div>
    )
  }

  // ── 3. Weekend State ──────────────────────────────────────────────────────
  if (isWeekend) {
    return (
      <div className="empty-state weekend-state" dir="rtl">
        <span className="empty-icon" aria-hidden="true">
          <BookIcon size={44} />
        </span>
        <h3 className="weekend-title">عطلة نهاية الأسبوع</h3>
        <p className="empty-msg">يومي الجمعة والسبت عطلة رسمية — استخدم الأسهم أعلاه لتصفح أيام الدوام المدرسي</p>
      </div>
    )
  }

  // ── 4. Empty State (No Periods Scheduled) ─────────────────────────────────
  if (periods.length === 0 && unmatchedHomework.length === 0) {
    return (
      <div className="empty-state" dir="rtl">
        <span className="empty-icon" aria-hidden="true">
          <BookIcon size={44} />
        </span>
        <p className="empty-msg">
          {isTimetableAvailable
            ? 'لا توجد حصص مسجلة لهذا اليوم في جدول الشعبة'
            : 'الجدول المدرسي قيد التحديث من إدارة المدرسة'}
        </p>
      </div>
    )
  }

  // ── 5. Standard Grid Render ───────────────────────────────────────────────
  return (
    <section className="subject-grid-container" dir="rtl">
      {!isTimetableAvailable && periods.length > 0 && (
        <div className="timetable-notice-banner">
          <span>⚠️ الجدول الأسبوعي قيد الإعداد — يتم عرض الواجبات المنشورة المتاحة</span>
        </div>
      )}

      {periods.length > 0 && (
        <div className="period-grid">
          {periods.map(slot => (
            <PeriodCard
              key={`${slot.period}_${slot.subject_id ?? 'empty'}`}
              slot={slot}
              onClick={() => onSelectPeriod(slot)}
              isActive={activePeriodNumber === slot.period}
            />
          ))}
        </div>
      )}

      {/* ── Unmatched Homework Section ───────────────────────────────────── */}
      {unmatchedHomework.length > 0 && (
        <div className="unmatched-hw-section">
          <h4 className="unmatched-hw-title">واجبات إضافية / غير مطابقة للجدول</h4>
          <div className="unmatched-hw-list">
            {unmatchedHomework.map((item, idx) => {
              const hw = item.homework
              const subjectColor = hw.subject_color || '#38bdf8'
              const reasonText =
                item.mismatch_reason === 'PERIOD_MATCH_SUBJECT_MISMATCH'
                  ? `واجب بتوقيت مخالف (حصة ${hw.period})`
                  : item.mismatch_reason === 'AMBIGUOUS_REPEATED_SUBJECT_NO_PERIOD'
                  ? 'واجب عام للمادة دون تحديد حصة'
                  : 'واجب إضافي خارج الجدول'

              return (
                <article
                  key={hw.id || idx}
                  className="unmatched-hw-card clickable"
                  onClick={() => onSelectUnmatched(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectUnmatched(item)
                    }
                  }}
                  aria-label={`واجب إضافي: ${hw.subject_name}`}
                >
                  <div className="unmatched-card-top">
                    <span
                      className="period-subject-chip"
                      style={{
                        borderColor: `${subjectColor}55`,
                        backgroundColor: `${subjectColor}1a`,
                        color: '#FFFFFF',
                      }}
                    >
                      {hw.subject_name}
                    </span>
                    <span className="unmatched-reason-badge">{reasonText}</span>
                  </div>
                  <p className="unmatched-body-preview">{hw.body}</p>
                  {hw.attachments && hw.attachments.length > 0 && (
                    <div className="attachment-indicator small">
                      {hw.attachments.some(a => a.mime.startsWith('image/')) ? (
                        <ImageIcon size={12} />
                      ) : (
                        <FileTextIcon size={12} />
                      )}
                      <span>{hw.attachments.length} مرفق</span>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
