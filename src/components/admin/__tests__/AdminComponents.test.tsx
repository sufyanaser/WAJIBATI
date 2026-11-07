import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { StatusBadge } from '../StatusBadge'
import { PageHeader } from '../PageHeader'
import { ConfirmDialog } from '../ConfirmDialog'
import { RecordDrawer } from '../RecordDrawer'
import { AdminDataTable } from '../AdminDataTable'

describe('Admin Shared Components Foundation', () => {
  describe('StatusBadge', () => {
    it('renders with default labels based on variant', () => {
      const { rerender } = render(<StatusBadge variant="published" />)
      expect(screen.getByText('منشور')).toBeInTheDocument()

      rerender(<StatusBadge variant="draft" />)
      expect(screen.getByText('مسودة')).toBeInTheDocument()

      rerender(<StatusBadge variant="active" />)
      expect(screen.getByText('نشط')).toBeInTheDocument()
    })

    it('renders custom label when provided', () => {
      render(<StatusBadge variant="gold" label="مخصص" />)
      expect(screen.getByText('مخصص')).toBeInTheDocument()
    })
  })

  describe('PageHeader', () => {
    it('renders title and subtitle', () => {
      render(<PageHeader title="إدارة الواجبات" subtitle="تفاصيل الواجبات اليومية" />)
      expect(screen.getByText('إدارة الواجبات')).toBeInTheDocument()
      expect(screen.getByText('تفاصيل الواجبات اليومية')).toBeInTheDocument()
    })

    it('renders badge and action elements', () => {
      render(
        <PageHeader
          title="قاعدة البيانات"
          badgeText="محدث"
          actions={<button>إجراء جديد</button>}
        />
      )
      expect(screen.getByText('محدث')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'إجراء جديد' })).toBeInTheDocument()
    })
  })

  describe('ConfirmDialog', () => {
    it('renders when isOpen is true and triggers handlers', () => {
      const onConfirm = vi.fn()
      const onCancel = vi.fn()

      const { rerender } = render(
        <ConfirmDialog
          isOpen={false}
          title="تأكيد الحذف"
          message="هل أنت متأكد؟"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )
      expect(screen.queryByText('تأكيد الحذف')).not.toBeInTheDocument()

      rerender(
        <ConfirmDialog
          isOpen={true}
          title="تأكيد الحذف"
          message="هل أنت متأكد؟"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )
      expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument()
      expect(screen.getByText('هل أنت متأكد؟')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'تأكيد الإجراء' }))
      expect(onConfirm).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('RecordDrawer', () => {
    it('renders drawer body and handles save/close', () => {
      const onClose = vi.fn()
      const onSave = vi.fn()

      render(
        <RecordDrawer
          isOpen={true}
          title="ملف الطالب"
          onClose={onClose}
          onSave={onSave}
        >
          <div>محتوى الملف</div>
        </RecordDrawer>
      )

      expect(screen.getByText('ملف الطالب')).toBeInTheDocument()
      expect(screen.getByText('محتوى الملف')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }))
      expect(onSave).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('AdminDataTable', () => {
    interface TestItem {
      id: string
      name: string
      score: number
    }

    const testData: TestItem[] = [
      { id: '1', name: 'أحمد', score: 95 },
      { id: '2', name: 'محمد', score: 88 },
      { id: '3', name: 'علي', score: 92 },
    ]

    const columns = [
      { key: 'name', header: 'الاسم', sortable: true },
      { key: 'score', header: 'الدرجة', sortable: true },
    ]

    it('renders table headers and rows', () => {
      render(
        <AdminDataTable<TestItem>
          columns={columns}
          data={testData}
          keyField="id"
        />
      )

      expect(screen.getByText('الاسم')).toBeInTheDocument()
      expect(screen.getByText('الدرجة')).toBeInTheDocument()
      expect(screen.getByText('أحمد')).toBeInTheDocument()
      expect(screen.getByText('محمد')).toBeInTheDocument()
      expect(screen.getByText('علي')).toBeInTheDocument()
    })

    it('filters rows based on search input', () => {
      render(
        <AdminDataTable<TestItem>
          columns={columns}
          data={testData}
          keyField="id"
        />
      )

      const searchInput = screen.getByPlaceholderText('ابحث في السجلات...')
      fireEvent.change(searchInput, { target: { value: 'محمد' } })

      expect(screen.getByText('محمد')).toBeInTheDocument()
      expect(screen.queryByText('أحمد')).not.toBeInTheDocument()
    })
  })
})
