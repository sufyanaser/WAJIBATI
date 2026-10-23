import React, { useEffect, useState } from 'react'
import type { GuardianPeriodSlot, UnmatchedHomeworkItem } from '../../hooks/useGuardianSchedule'
import { CloseIcon, FileTextIcon, ImageIcon } from '../Icons'

interface PeriodDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  slot: GuardianPeriodSlot | null
  unmatchedItem: UnmatchedHomeworkItem | null
  signedUrls: Record<string, string>
}

export const PeriodDetailDrawer: React.FC<PeriodDetailDrawerProps> = ({
  isOpen,
  onClose,
  slot,
  unmatchedItem,
  signedUrls,
}) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // ── 1. Scroll-lock effect with verified prior-value restoration ─────────────
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // ── 2. ESC key listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (lightboxUrl) {
          setLightboxUrl(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, lightboxUrl, onClose])

  if (!isOpen || (!slot && !unmatchedItem)) {
    return null
  }

  const isUnmatched = unmatchedItem != null
  const hw = isUnmatched ? unmatchedItem.homework : slot?.homework
  const subjectName = isUnmatched ? hw?.subject_name : slot?.subject_name
  const subjectColor = (isUnmatched ? hw?.subject_color : slot?.subject_color) || '#38bdf8'
  const teacherName = isUnmatched ? hw?.teacher_name : slot?.teacher_name
  const periodNumber = isUnmatched ? hw?.period : slot?.period
  const hasHw = Boolean(hw && hw.body.trim())
  const attachments = hw?.attachments ?? []

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        className="period-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-up Drawer Container ─────────────────────────────────────── */}
      <aside
        className="period-drawer-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`تفاصيل ${subjectName}`}
        dir="rtl"
      >
        {/* Drag handle pill for mobile */}
        <div className="drawer-drag-handle" aria-hidden="true" />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="drawer-header">
          <div className="drawer-header-start">
            <button
              type="button"
              className="drawer-back-btn"
              onClick={onClose}
              aria-label="العودة إلى جدول المواد"
            >
              <span>← العودة</span>
            </button>

            <div className="drawer-title-group">
              <span
                className="drawer-period-pill"
                style={{
                  borderColor: `${subjectColor}66`,
                  backgroundColor: `${subjectColor}1a`,
                }}
              >
                {periodNumber && periodNumber > 0 ? `الحصة ${periodNumber}` : 'واجب إضافي'}
              </span>
              <h2 className="drawer-subject-title">{subjectName}</h2>
            </div>
          </div>

          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <CloseIcon size={18} />
          </button>
        </header>

        {/* ── Scrollable Body ──────────────────────────────────────────────── */}
        <div className="drawer-body-content">
          {teacherName && (
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">المدرس:</span>
              <span className="drawer-meta-value">{teacherName}</span>
            </div>
          )}

          {isUnmatched && (
            <div className="drawer-mismatch-banner">
              <span>
                {unmatchedItem.mismatch_reason === 'PERIOD_MATCH_SUBJECT_MISMATCH'
                  ? 'ملاحظة: هذا الواجب نُشر بتوقيت مخالف لجدول الحصص المعتمد.'
                  : unmatchedItem.mismatch_reason === 'AMBIGUOUS_REPEATED_SUBJECT_NO_PERIOD'
                  ? 'ملاحظة: هذا الواجب نُشر دون تحديد رقم الحصة لمادة مكررة اليوم.'
                  : 'ملاحظة: هذا الواجب إضافي خارج مواد جدول اليوم.'}
              </span>
            </div>
          )}

          <div className="drawer-section">
            <h3 className="drawer-section-title">محتوى الواجب</h3>
            {hasHw ? (
              <div className="drawer-homework-text">
                <p>{hw?.body}</p>
              </div>
            ) : (
              <div className="drawer-empty-hw">
                <p>لا يوجد واجب بيتي مسجل لهذه الحصة — تم إكمال الدرس في الصف.</p>
              </div>
            )}
          </div>

          {/* ── Attachments ────────────────────────────────────────────────── */}
          {attachments.length > 0 && (
            <div className="drawer-section">
              <h3 className="drawer-section-title">المرفقات ({attachments.length})</h3>
              <div className="drawer-attachments-grid">
                {attachments.map(att => {
                  const url = signedUrls[att.storage_path]
                  const isImg = att.mime.startsWith('image/')
                  const fileName = att.storage_path.split('/').pop() ?? 'مرفق'

                  if (isImg && url) {
                    return (
                      <div key={att.id} className="drawer-attach-img-card">
                        <button
                          type="button"
                          className="drawer-img-thumb-btn"
                          onClick={() => setLightboxUrl(url)}
                          aria-label={`عرض الصورة ${fileName}`}
                        >
                          <img src={url} alt={fileName} className="drawer-img-thumb" />
                          <span className="drawer-img-zoom-hint">تكبير 🔍</span>
                        </button>
                      </div>
                    )
                  }

                  return (
                    <a
                      key={att.id}
                      href={url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="drawer-attach-file-btn"
                    >
                      <span aria-hidden="true">
                        {isImg ? <ImageIcon size={18} /> : <FileTextIcon size={18} />}
                      </span>
                      <span className="drawer-file-name">{fileName}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Image Lightbox Modal ─────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الصورة"
          className="drawer-lightbox-overlay"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="معاينة المرفق"
            className="drawer-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            className="drawer-lightbox-close"
            onClick={() => setLightboxUrl(null)}
            aria-label="إغلاق المعاينة"
          >
            <CloseIcon size={20} />
          </button>
        </div>
      )}
    </>
  )
}
