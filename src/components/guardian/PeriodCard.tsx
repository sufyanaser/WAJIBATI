import React from 'react'
import type { GuardianPeriodSlot } from '../../hooks/useGuardianSchedule'

interface PeriodCardProps {
  slot: GuardianPeriodSlot
  onClick: () => void
  isActive?: boolean
}

/**
 * Compact guardian subject tile. Homework, teacher and attachment details
 * remain available in PeriodDetailDrawer after selecting the subject.
 */
export const PeriodCard: React.FC<PeriodCardProps> = ({ slot, onClick, isActive = false }) => {
  const hasHw = slot.has_homework && slot.homework != null
  const subjectColor = slot.subject_color || slot.homework?.subject_color || '#38bdf8'

  return (
    <button
      type="button"
      className={`period-card period-card--compact ${hasHw ? 'has-homework' : 'no-homework'} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-label={`عرض تفاصيل مادة ${slot.subject_name}، الحصة ${slot.period}`}
      aria-expanded={isActive}
      dir="rtl"
      style={{ borderInlineStartColor: subjectColor }}
    >
      <span className="period-card-subject">{slot.subject_name}</span>
    </button>
  )
}
