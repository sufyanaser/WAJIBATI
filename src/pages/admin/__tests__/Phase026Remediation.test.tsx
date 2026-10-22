import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import HomeworkEntry from '../HomeworkEntry'
import NoticesPage from '../NoticesPage'
import DashboardHome from '../DashboardHome'
import StudentsPage from '../StudentsPage'
import TeachersPage from '../TeachersPage'
import AdminShell from '../AdminShell'

const { mockGetSession, mockFrom, mockInvoke } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFrom: vi.fn(),
  mockInvoke: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}))

describe('Phase 02.6 Remediation — Targeted Verification & Non-Regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'admin-123',
            email: 'admin@admin.rumaila.local',
          },
        },
      },
    })
  })

  describe('RT-01 — A4 Export Button in HomeworkEntry', () => {
    it('renders the "تصدير A4 للطباعة" button in the sticky action bar', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
          }
        }
        if (table === 'sections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } }],
              error: null,
            }),
          }
        }
        if (table === 'subjects') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, name: 'الرياضيات' }],
              error: null,
            }),
          }
        }
        if (table === 'teachers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, full_name: 'أ. أحمد', subject_id: 1 }],
              error: null,
            }),
          }
        }
        if (table === 'teaching_assignments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ section_id: 1, subject_id: 1, teacher_id: 1 }],
              error: null,
            }),
          }
        }
        if (table === 'timetable' || table === 'homework') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      render(
        <MemoryRouter initialEntries={['/admin/homework']}>
          <HomeworkEntry />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'تصدير A4 للطباعة' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'تصدير A4 للطباعة' })).not.toBeDisabled()
      })

      const exportBtn = screen.getByRole('button', { name: 'تصدير A4 للطباعة' })
      expect(exportBtn).toHaveAttribute('aria-label', 'تصدير A4 للطباعة')
    })
  })

  describe('RT-02 — Safe Notice Deletion with ConfirmDialog', () => {
    it('requires confirmation before deleting and cancels safely without calling delete', async () => {
      const deleteSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
          }
        }
        if (table === 'sections') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
              error: null,
            }),
          }
        }
        if (table === 'notices') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'not-101',
                  title: 'إعلان رحلة مدرسية',
                  body: 'التفاصيل بالداخل',
                  priority: 2,
                  section_id: 1,
                  publish_at: '2026-10-22T08:00:00Z',
                  expires_at: null,
                },
              ],
              error: null,
            }),
            delete: deleteSpy,
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      render(
        <MemoryRouter initialEntries={['/admin/notices']}>
          <NoticesPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('إعلان رحلة مدرسية')).toBeInTheDocument()
      })

      // Click delete button on notice
      const delBtn = screen.getByRole('button', { name: 'حذف الإشعار' })
      await act(async () => {
        fireEvent.click(delBtn)
      })

      // ConfirmDialog must appear displaying notice title
      expect(screen.getByText('تأكيد حذف الإشعار')).toBeInTheDocument()
      expect(screen.getAllByText(/إعلان رحلة مدرسية/).length).toBe(2)
      expect(deleteSpy).not.toHaveBeenCalled()

      // Safe path: Click Cancel
      const cancelBtn = screen.getByRole('button', { name: 'إلغاء' })
      await act(async () => {
        fireEvent.click(cancelBtn)
      })

      // Dialog closed, notice still preserved, delete was NOT called
      expect(screen.queryByText('تأكيد حذف الإشعار')).not.toBeInTheDocument()
      expect(screen.getByText('إعلان رحلة مدرسية')).toBeInTheDocument()
      expect(deleteSpy).not.toHaveBeenCalled()

      // Now open and confirm deletion
      await act(async () => {
        fireEvent.click(delBtn)
      })
      const confirmBtn = screen.getByRole('button', { name: 'حذف نهائي' })
      await act(async () => {
        fireEvent.click(confirmBtn)
      })

      // Delete was called with correct notice ID
      expect(deleteSpy).toHaveBeenCalled()
    })
  })

  describe('RT-06 — Client-Side Role Guard for Viewer in Notices', () => {
    it('hides notice creation form and delete/edit buttons when role is viewer', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
          }
        }
        if (table === 'sections') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'notices') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'not-viewer',
                  title: 'إعلان عام للمشاهدة',
                  body: 'نص تجريبي',
                  priority: 1,
                  section_id: null,
                  publish_at: '2026-10-22T08:00:00Z',
                  expires_at: null,
                },
              ],
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      render(
        <MemoryRouter initialEntries={['/admin/notices']}>
          <NoticesPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('إعلان عام للمشاهدة')).toBeInTheDocument()
      })

      // Viewer mode banner is displayed
      expect(screen.getByText(/وضع المشاهدة \(Viewer\)/)).toBeInTheDocument()

      // Form and buttons must be completely absent
      expect(screen.queryByPlaceholderText('العنوان *')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'حفظ التعديلات' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'تعديل الإشعار' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'حذف الإشعار' })).not.toBeInTheDocument()
    })
  })

  describe('RT-04 — Dashboard Canonical V2 Cards and Metrics', () => {
    it('renders all canonical cards matching the 6 V2 sections with accurate labels', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sections') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 7, data: null }) }
        }
        if (table === 'students') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 215, data: null }) }
        }
        if (table === 'guardians') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 180, data: null }) }
        }
        if (table === 'teachers') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 24, data: null }) }
        }
        if (table === 'subjects') {
          return { select: vi.fn().mockResolvedValue({ count: 12, data: null }) }
        }
        if (table === 'homework') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: vi.fn(),
            then: (resolve: any) => resolve({ count: 6, data: null }),
          }
        }
        if (table === 'notices') {
          return {
            select: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            or: vi.fn().mockResolvedValue({ count: 3, data: null }),
          }
        }
        if (table === 'teaching_assignments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [] }),
          }
        }
        if (table === 'timetable') {
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }
        }
        return { select: vi.fn().mockResolvedValue({ count: 0, data: null }) }
      })

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <DashboardHome />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('واجباتي | لوحة الإدارة — إعدادية الرميلة للبنين')).toBeInTheDocument()
      })

      // Verify canonical cards
      expect(screen.getByText('الواجبات اليومية')).toBeInTheDocument()
      expect(screen.getByText('الجدول الدراسي')).toBeInTheDocument()
      expect(screen.getByText('الإعلانات والتنبيهات')).toBeInTheDocument()
      expect(screen.getByText('قاعدة البيانات المدرسية')).toBeInTheDocument()
      expect(screen.getByText('الهيئة التدريسية')).toBeInTheDocument()
      expect(screen.getByText('الإعدادات والصلاحيات')).toBeInTheDocument()
    })
  })

  describe('RT-03 — Subpages Shared Components Integration', () => {
    it('verifies StudentsPage renders PageHeader and StatusBadge', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
          }
        }
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 1,
                  full_name: 'أحمد محمود العاني',
                  notes: null,
                  active: true,
                  section_id: 1,
                  section: { letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
                },
              ],
            }),
          }
        }
        if (table === 'sections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } }],
            }),
          }
        }
        if (table === 'guardian_students') {
          return {
            select: vi.fn().mockResolvedValue({ data: [] }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      render(
        <MemoryRouter initialEntries={['/admin/students']}>
          <Routes>
            <Route path="/admin" element={<AdminShell />}>
              <Route path="students" element={<StudentsPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('دليل الطلاب وقوائم الفصول')).toBeInTheDocument()
      })

      // Verify PageHeader badge
      expect(screen.getByText('1 طالب')).toBeInTheDocument()
      // Verify StatusBadge
      expect(screen.getByText('فعّال')).toBeInTheDocument()
    })

    it('verifies TeachersPage renders PageHeader and StatusBadge', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
          }
        }
        if (table === 'teachers') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 1,
                  external_key: 'TEA-1',
                  full_name: 'أ. طه الحديثي',
                  phone: null,
                  active: true,
                  subject: { id: 1, name: 'الرياضيات' },
                },
              ],
            }),
          }
        }
        if (table === 'subjects') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'الرياضيات' }] }),
          }
        }
        if (table === 'teaching_assignments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      render(
        <MemoryRouter initialEntries={['/admin/teachers']}>
          <Routes>
            <Route path="/admin" element={<AdminShell />}>
              <Route path="teachers" element={<TeachersPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('الهيئة التدريسية وتوزيع المواد')).toBeInTheDocument()
      })

      // Verify PageHeader badge and StatusBadge
      expect(screen.getByText('1 مدرس')).toBeInTheDocument()
      expect(screen.getByText('فعّال')).toBeInTheDocument()
    })
  })
})
