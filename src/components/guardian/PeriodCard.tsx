import React from 'react'
import type { GuardianPeriodSlot } from '../../hooks/useGuardianSchedule'
import { FileTextIcon, ImageIcon } from '../Icons'

interface PeriodCardProps {
  slot: GuardianPeriodSlot
  onClick: () => void
  isActive?: boolean
}

export const PeriodCard: React.FC<PeriodCardProps> = ({ slot, onClick, isActive = false }) => {
  const hasHw = slot.has_homework && slot.homework != null
  const hw = slot.homework

  // Extract single line preview
  const previewText = hw ? hw.body.replace(/\s+/g, ' ').trim() : ''

  const hasAttachments = Boolean(hw && hw.attachments && hw.attachments.length > 0)
  const isImageAttachment = Boolean(hasAttachments && hw?.attachments.some(a => a.mime.startsWith('image/')))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  const subjectColor = slot.subject_color || hw?.subject_color || '#38bdf8'

  return (
    <article
      className={`period-card ${hasHw ? 'has-homework' : 'no-homework'} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`الحصة ${slot.period}: ${slot.subject_name}، ${hasHw ? 'يوجد واجب' : 'لا يوجد واجب'}`}
      dir="rtl"
    >
      <div className="period-card-header">
        <span
          className="period-badge"
          style={{
            borderColor: `${subjectColor}66`,
          }}
        >
          {slot.period > 0 ? slot.period : '•'}
        </span>

        <span
          className="period-subject-chip"
          style={{
            borderColor: `${subjectColor}55`,
            backgroundColor: `${subjectColor}1a`,
            color: '#FFFFFF',
          }}
        >
          {slot.subject_name}
        </span>
      </div>

      <div className="period-card-body">
        {slot.teacher_name && (
          <p className="period-teacher-name">{slot.teacher_name}</p>
        )}

        {hasHw ? (
          <div className="period-hw-status">
            <span className="hw-status-badge has-hw">
              يوجد واجب 📝
            </span>
            {previewText && (
              <p className="hw-preview-text">{previewText}</p>
            )}
          </div>
        ) : (
          <div className="period-hw-status">
            <span className="hw-status-badge no-hw">
              لا يوجد واجب
            </span>
          </div>
        )}
      </div>

      {hasAttachments && (
        <div className="period-card-footer">
          <span className="attachment-indicator" title="يوجد مرفقات">
            {isImageAttachment ? <ImageIcon size={13} /> : <FileTextIcon size={13} />}
            <span>مرفق</span>
          </span>
        </div>
      )}
    </article>
  )
}
