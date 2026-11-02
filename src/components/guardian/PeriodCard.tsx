import React from 'react'
import type { GuardianPeriodSlot } from '../../hooks/useGuardianSchedule'
import {
  BookIcon,
  CalendarDaysIcon,
  GraduationCapIcon,
  DnaIcon,
  CalculatorIcon,
  ActivityIcon,
  MosqueIcon,
} from '../Icons'

interface PeriodCardProps {
  slot: GuardianPeriodSlot
  onClick: () => void
  isActive?: boolean
}

function getSubjectTheme(name: string, fallbackColor?: string | null) {
  const n = (name || '').trim()
  if (n.includes('أحياء') || n.includes('علوم')) {
    return { icon: <DnaIcon size={20} />, color: fallbackColor || '#00C29F' }
  }
  if (n.includes('تاريخ') || n.includes('اجتماعيات') || n.includes('جغرافيا')) {
    return { icon: <CalendarDaysIcon size={20} />, color: fallbackColor || '#6366F1' }
  }
  if (n.includes('رياضة') || n.includes('بدنية') || n.includes('رياضية')) {
    return { icon: <ActivityIcon size={20} />, color: fallbackColor || '#0EA5E9' }
  }
  if (n.includes('رياضيات') || n.includes('حساب')) {
    return { icon: <CalculatorIcon size={20} />, color: fallbackColor || '#3B82F6' }
  }
  if (n.includes('عربي') || n.includes('لغة عربية') || n.includes('قراءة') || n.includes('إملاء')) {
    return { icon: <BookIcon size={20} />, color: fallbackColor || '#10B981' }
  }
  if (n.includes('إسلامية') || n.includes('دين') || n.includes('قرآن')) {
    return { icon: <MosqueIcon size={20} />, color: fallbackColor || '#EC4899' }
  }
  if (n.includes('فيزياء')) {
    return { icon: <ActivityIcon size={20} />, color: fallbackColor || '#00B4D8' }
  }
  if (n.includes('كيمياء')) {
    return { icon: <DnaIcon size={20} />, color: fallbackColor || '#8B5CF6' }
  }
  if (n.includes('إنكليزي') || n.includes('انجليزي') || n.includes('إنجليزية')) {
    return { icon: <BookIcon size={20} />, color: fallbackColor || '#F59E0B' }
  }
  return { icon: <GraduationCapIcon size={20} />, color: fallbackColor || '#007BFE' }
}

/**
 * Guardian 2-column subject card matching Master UI Reference.
 * Subject name on left, colored icon circle on right.
 * Clicking opens PeriodDetailDrawer.
 */
export const PeriodCard: React.FC<PeriodCardProps> = ({ slot, onClick, isActive = false }) => {
  const hasHw = slot.has_homework && slot.homework != null
  const { icon, color } = getSubjectTheme(
    slot.subject_name,
    slot.subject_color || slot.homework?.subject_color
  )

  return (
    <button
      type="button"
      className={`period-card period-card--master ${hasHw ? 'has-homework' : 'no-homework'} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-label={`عرض تفاصيل مادة ${slot.subject_name}، الحصة ${slot.period}`}
      aria-expanded={isActive}
      dir="rtl"
      style={{
        borderColor: `${color}55`,
      }}
    >
      <span className="period-card-subject">{slot.subject_name}</span>
      <div
        className="period-card-icon-wrap"
        style={{
          backgroundColor: `${color}18`,
          color: color,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
    </button>
  )
}
