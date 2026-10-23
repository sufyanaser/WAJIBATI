import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExportModal } from '../ExportModal'

const exportData = {
  schoolName: 'إعدادية الرميلة للبنين',
  sectionName: 'الخامس علمي أ',
  date: '2026-10-23',
  items: [],
}

describe('ExportModal', () => {
  it('exposes an accessible dialog and closes with Escape', () => {
    const onClose = vi.fn()
    render(<ExportModal isOpen onClose={onClose} data={exportData} />)

    expect(screen.getByRole('dialog', { name: 'تصدير جدول الواجبات' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render when closed', () => {
    render(<ExportModal isOpen={false} onClose={vi.fn()} data={exportData} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
