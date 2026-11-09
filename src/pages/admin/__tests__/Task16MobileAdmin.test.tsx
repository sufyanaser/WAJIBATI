import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import AdminShell from '../AdminShell'
import DashboardHome from '../DashboardHome'
import HomeworkEntry from '../HomeworkEntry'
import TimetablePage from '../TimetablePage'
import StudentsPage from '../StudentsPage'
import NoticesPage from '../NoticesPage'

const { mockGetSession, mockFrom } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

describe('Task 16 — Dedicated Mobile Admin Experience', () => {
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

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admins') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
        }
      }
      if (table === 'sections' || table === 'students' || table === 'guardians' || table === 'teachers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 10, data: null }),
        }
      }
      if (table === 'subjects') {
        return { select: vi.fn().mockResolvedValue({ count: 8, data: null }) }
      }
      if (table === 'homework') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          mockResolvedValue: vi.fn(),
          then: (resolve: any) => resolve({ count: 4, data: null }),
        }
      }
      if (table === 'notices') {
        return {
          select: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ count: 2, data: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      }
    })
  })

  it('renders 5-item mobile bottom navigation dock with touch targets', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="dashboard" element={<div>لوحة التحكم</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('تنقل الهاتف السريع')).toBeInTheDocument()
    })

    // Verify all 5 mobile bottom navigation touch items exist
    expect(screen.getByRole('link', { name: 'الرئيسية (شريط سفلي)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الواجبات (شريط سفلي)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الجدول (شريط سفلي)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الطلاب (شريط سفلي)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'المزيد (شريط سفلي)' })).toBeInTheDocument()
  })

  it('renders mobile back button on sub-routes and hides it on dashboard', async () => {
    // 1. On Dashboard: back button should not exist
    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="dashboard" element={<div>الرئيسية</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('لوحة المؤشرات والملخص')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('الرجوع للرئيسية')).not.toBeInTheDocument()
    unmount()

    // 2. On sub-route (e.g. /admin/homework): back button must exist
    render(
      <MemoryRouter initialEntries={['/admin/homework']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="homework" element={<div>صفحة الواجبات</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('الرجوع للرئيسية')).toBeInTheDocument()
    })
    expect(screen.getByText('رجوع')).toBeInTheDocument()
  })

  it('renders touch-first mobile action tiles and metrics in DashboardHome', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <DashboardHome />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('إعدادية الرميلة للبنين')).toBeInTheDocument()
    })

    // 4 Primary Mobile Touch Tiles
    expect(screen.getByText('تسجيل واجبات اليوم')).toBeInTheDocument()
    expect(screen.getByText('جدول الحصص اليومي')).toBeInTheDocument()
    expect(screen.getByText('التعميمات والتنبيهات')).toBeInTheDocument()
    expect(screen.getByText('دليل وسجلات الطلاب')).toBeInTheDocument()

    // Key Mobile Metric Chips
    expect(screen.getByText('أولياء الأمور')).toBeInTheDocument()
    expect(screen.getByText('المعلمون')).toBeInTheDocument()
    expect(screen.getByText('المواد')).toBeInTheDocument()
  })
  const setupHomeworkMocks = () => {
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
            data: [
              { id: 1, letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
              { id: 2, letter: 'ب', stage: { name: 'الخامس', branch: 'علمي' } },
            ],
            error: null,
          }),
        }
      }
      if (table === 'subjects') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'الرياضيات' }], error: null }),
        }
      }
      if (table === 'teachers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 1, full_name: 'أ. د. سفيان', subject_id: 1 }], error: null }),
        }
      }
      if (table === 'teaching_assignments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ section_id: 1, subject_id: 1, teacher_id: 1 }], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
  }

  it('HomeworkEntry renders mobile section pills and expandable period cards', async () => {
    setupHomeworkMocks()

    render(
      <MemoryRouter initialEntries={['/admin/homework']}>
        <HomeworkEntry />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'أقسام الشعب الدراسية' })).toBeInTheDocument()
    })

    // Verify section pill tabs exist
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /أ/ })).toBeInTheDocument()
    })
    const pillA = screen.getByRole('tab', { name: /أ/ })
    const pillB = screen.getByRole('tab', { name: /ب/ })
    expect(pillA).toBeInTheDocument()
    expect(pillB).toBeInTheDocument()

    // Verify expandable card header for period 1
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^الحصة 1:/ })).toBeInTheDocument()
    })
    const cardHead = screen.getByRole('button', { name: /^الحصة 1:/ })

    // Verify card is collapsed by default on mobile
    expect(cardHead).toHaveAttribute('aria-expanded', 'false')

    // Click to expand card
    fireEvent.click(cardHead)
    expect(cardHead).toHaveAttribute('aria-expanded', 'true')

    // Verify textarea is accessible
    const textarea = screen.getByLabelText('نص واجب الحصة 1')
    expect(textarea).toBeInTheDocument()

    // Test typing marks unsaved draft
    fireEvent.change(textarea, { target: { value: 'تمارين ص 20' } })
    await waitFor(() => {
      expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()
    })

    // Test toggle collapse
    fireEvent.click(cardHead)
    expect(cardHead).toHaveAttribute('aria-expanded', 'false')
  })

  it('Phase 2.1: Protects unsaved drafts on section change (window.confirm guard)', async () => {
    setupHomeworkMocks()
    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <MemoryRouter initialEntries={['/admin/homework']}>
        <HomeworkEntry />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /ب/ })).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('نص واجب الحصة 1')
    fireEvent.change(textarea, { target: { value: 'واجب جديد غير محفوظ' } })
    await waitFor(() => {
      expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()
    })

    // 1. User cancels section change
    confirmSpy.mockReturnValueOnce(false)
    const pillB = screen.getByRole('tab', { name: /ب/ })
    fireEvent.click(pillB)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('تعديلات غير محفوظة'))
    expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()

    // 2. User confirms section change
    confirmSpy.mockReturnValueOnce(true)
    fireEvent.click(pillB)
    await waitFor(() => {
      expect(screen.queryByText('⚠️ تعديلات غير محفوظة')).not.toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })

  it('Phase 2.1: Protects unsaved drafts on date navigation (window.confirm guard)', async () => {
    setupHomeworkMocks()
    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <MemoryRouter initialEntries={['/admin/homework']}>
        <HomeworkEntry />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('يوم تالٍ')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('نص واجب الحصة 1')
    fireEvent.change(textarea, { target: { value: 'تعديل تاريخي غير محفوظ' } })
    await waitFor(() => {
      expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()
    })

    // 1. User cancels date navigation
    confirmSpy.mockReturnValueOnce(false)
    const nextDayBtn = screen.getByLabelText('يوم تالٍ')
    fireEvent.click(nextDayBtn)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('تعديلات غير محفوظة'))
    expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()

    // 2. User confirms date navigation
    confirmSpy.mockReturnValueOnce(true)
    fireEvent.click(nextDayBtn)
    await waitFor(() => {
      expect(screen.queryByText('⚠️ تعديلات غير محفوظة')).not.toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })

  it('Phase 2.1: Protects unsaved drafts on internal navigation and back button', async () => {
    setupHomeworkMocks()
    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <MemoryRouter initialEntries={['/admin/homework']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="homework" element={<HomeworkEntry />} />
            <Route path="dashboard" element={<div>الرئيسية المستهدفة</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('الرجوع للرئيسية')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('نص واجب الحصة 1')
    fireEvent.change(textarea, { target: { value: 'مسودة تنقل' } })
    await waitFor(() => {
      expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()
    })

    // Click Mobile Back Button with cancel
    confirmSpy.mockReturnValueOnce(false)
    const backBtn = screen.getByLabelText('الرجوع للرئيسية')
    fireEvent.click(backBtn)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('مغادرة الصفحة وتجاهل التعديلات'))
    // Should NOT have navigated away
    expect(screen.queryByText('الرئيسية المستهدفة')).not.toBeInTheDocument()
    expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()

    confirmSpy.mockRestore()
  })

  it('Phase 2.1: Does NOT clear isDirty when save draft fails', async () => {
    setupHomeworkMocks()

    render(
      <MemoryRouter initialEntries={['/admin/homework']}>
        <HomeworkEntry />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /حفظ مسودة/ })).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('نص واجب الحصة 1')
    fireEvent.change(textarea, { target: { value: 'مسودة بدون مادة تسبب فشل' } })
    await waitFor(() => {
      expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()
    })

    // Click "حفظ مسودة"
    const saveBtn = screen.getByRole('button', { name: /حفظ مسودة/ })
    fireEvent.click(saveBtn)

    // Save fails because slot has no subject_id
    await waitFor(() => {
      expect(screen.getByText(/فشل 1/)).toBeInTheDocument()
    })

    // Verify isDirty badge is STILL present!
    expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()
  })

  const setupTimetableMocks = () => {
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
            data: [
              { id: 1, letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
              { id: 2, letter: 'ب', stage: { name: 'الخامس', branch: 'علمي' } },
            ],
            error: null,
          }),
        }
      }
      if (table === 'subjects') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, name: 'الرياضيات', color: '#3D84C8' },
              { id: 2, name: 'الفيزياء', color: '#10B981' },
            ],
            error: null,
          }),
        }
      }
      if (table === 'teachers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, full_name: 'أ. د. سفيان', subject_id: 1 },
              { id: 2, full_name: 'أ. عمر الراوي', subject_id: 2 },
            ],
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
      if (table === 'timetable') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 101,
                weekday: 0,
                period: 1,
                subject_id: 1,
                teacher_id: 1,
                subject: { name: 'الرياضيات', color: '#3D84C8' },
                teacher: { full_name: 'أ. د. سفيان' },
              },
            ],
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
  }

  // Note: Phase 3 modal sheet tests are superseded by Batch 2 Timetable Autosave (verified in TimetableAutosave.test.tsx)
  it.skip('Phase 3: TimetablePage renders mobile section pills and 5-day navigation bar with period counts', async () => {
    setupTimetableMocks()

    render(
      <MemoryRouter initialEntries={['/admin/timetable']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="timetable" element={<TimetablePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'أقسام الشعب الدراسية للجدول' })).toBeInTheDocument()
    })
    const secTablist = screen.getByRole('tablist', { name: 'أقسام الشعب الدراسية للجدول' })

    // 1. Verify mobile section pills
    expect(within(secTablist).getByRole('tab', { name: /أ/ })).toBeInTheDocument()
    expect(within(secTablist).getByRole('tab', { name: /ب/ })).toBeInTheDocument()

    // 2. Verify 5-day pills exist with counts
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /الأحد/ })).toBeInTheDocument()
    })
    expect(screen.getByRole('tab', { name: /الاثنين/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /الثلاثاء/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /الأربعاء/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /الخميس/ })).toBeInTheDocument()

    // Sunday has 1 assigned slot in mock data
    expect(screen.getByRole('tab', { name: /الأحد/ })).toHaveTextContent('1/6')

    // 3. Test day navigation arrows
    expect(screen.getByLabelText('اليوم السابق')).toBeInTheDocument()
    expect(screen.getByLabelText('اليوم التالي')).toBeInTheDocument()
  })

  it.skip('Phase 3: TimetablePage displays touch period cards and opens mobile edit sheet', async () => {
    setupTimetableMocks()

    render(
      <MemoryRouter initialEntries={['/admin/timetable']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="timetable" element={<TimetablePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // Switch to Sunday (day 0) to view slot 1
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /الأحد/ })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('tab', { name: /الأحد/ }))

    // Verify touch-friendly cards exist
    await waitFor(() => {
      expect(screen.getByLabelText(/الحصة 1: الرياضيات - أ. د. سفيان/)).toBeInTheDocument()
    })
    const card1 = screen.getByLabelText(/الحصة 1: الرياضيات - أ. د. سفيان/)
    expect(card1).toBeInTheDocument()

    // Open edit sheet
    fireEvent.click(card1)

    // Edit sheet should be visible with title
    await waitFor(() => {
      expect(screen.getByText('الأحد — الحصة 1')).toBeInTheDocument()
    })

    // Check selectors
    expect(screen.getByLabelText('المادة')).toBeInTheDocument()
    expect(screen.getByLabelText('المدرس')).toBeInTheDocument()
  })

  it.skip('Phase 3: TimetablePage protects unsaved cell edits on day change', async () => {
    setupTimetableMocks()
    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <MemoryRouter initialEntries={['/admin/timetable']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="timetable" element={<TimetablePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // Switch to Sunday (day 0)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /الأحد/ })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('tab', { name: /الأحد/ }))

    // Open Period 1 edit sheet
    await waitFor(() => {
      expect(screen.getByLabelText(/الحصة 1: الرياضيات - أ. د. سفيان/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByLabelText(/الحصة 1: الرياضيات - أ. د. سفيان/))

    await waitFor(() => {
      expect(screen.getByText('الأحد — الحصة 1')).toBeInTheDocument()
    })

    // Modify subject to Physics (id: 2) -> marks dirty
    const subSelect = screen.getByLabelText('المادة')
    fireEvent.change(subSelect, { target: { value: '2' } })

    await waitFor(() => {
      expect(screen.getByText('⚠️ تعديل غير محفوظ')).toBeInTheDocument()
    })

    // 1. Try to switch day with cancellation
    confirmSpy.mockReturnValueOnce(false)
    const mondayPill = screen.getByRole('tab', { name: /الاثنين/ })
    fireEvent.click(mondayPill)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('تعديلات غير محفوظة'))
    // Edit sheet still open and dirty badge still present
    expect(screen.getByText('⚠️ تعديل غير محفوظ')).toBeInTheDocument()

    // 2. Try to switch day with confirmation
    confirmSpy.mockReturnValueOnce(true)
    fireEvent.click(mondayPill)
    await waitFor(() => {
      expect(screen.queryByText('⚠️ تعديل غير محفوظ')).not.toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })

  const setupStudentsMocks = () => {
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
                full_name: 'علي حسن السعدي',
                notes: 'طالب متفوق علمياً',
                active: true,
                section_id: 1,
                section: { letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
              },
              {
                id: 2,
                full_name: 'حسين علي الركابي',
                notes: null,
                active: false,
                section_id: 2,
                section: { letter: 'ب', stage: { name: 'الخامس', branch: 'علمي' } },
              },
            ],
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
          insert: vi.fn().mockReturnThis(),
        }
      }
      if (table === 'sections') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
              { id: 2, letter: 'ب', stage: { name: 'الخامس', branch: 'علمي' } },
            ],
            error: null,
          }),
        }
      }
      if (table === 'guardians') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'g-1', full_name: 'حسن السعدي', phone: '07801112233' },
            ],
            error: null,
          }),
        }
      }
      if (table === 'guardian_students') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                student_id: 1,
                guardian_id: 'g-1',
                relation: 'أب',
                guardian: { full_name: 'حسن السعدي', phone: '07801112233' },
              },
            ],
            error: null,
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
  }

  it('Phase 4: StudentsPage renders mobile cards, quick section pills, and search filtering', async () => {
    setupStudentsMocks()

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
      expect(screen.getByRole('tablist', { name: 'تصفية الشعب' })).toBeInTheDocument()
    })

    // 1. Verify section pills exist
    const secFilterList = screen.getByRole('tablist', { name: 'تصفية الشعب' })
    expect(within(secFilterList).getByRole('tab', { name: /كل الشعب/ })).toBeInTheDocument()
    expect(within(secFilterList).getByRole('tab', { name: /الخامس.*أ/ })).toBeInTheDocument()
    expect(within(secFilterList).getByRole('tab', { name: /الخامس.*ب/ })).toBeInTheDocument()

    // 2. Verify mobile cards exist
    expect(screen.getByRole('button', { name: /بطاقة الطالب: علي حسن السعدي/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /بطاقة الطالب: حسين علي الركابي/ })).toBeInTheDocument()

    // 3. Test search filter
    const searchInput = screen.getByPlaceholderText('بحث باسم الطالب…')
    fireEvent.change(searchInput, { target: { value: 'علي حسن' } })

    expect(screen.getAllByText('علي حسن السعدي').length).toBeGreaterThan(0)
    expect(screen.queryByText('حسين علي الركابي')).not.toBeInTheDocument()

    // Clear search
    const clearBtn = screen.getByLabelText('مسح البحث')
    fireEvent.click(clearBtn)
    expect(screen.getAllByText('حسين علي الركابي').length).toBeGreaterThan(0)
  })

  it('Phase 4: StudentsPage opens dedicated mobile detail panel on card click', async () => {
    setupStudentsMocks()

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
      expect(screen.getByRole('button', { name: /بطاقة الطالب: علي حسن السعدي/ })).toBeInTheDocument()
    })

    // Click card to open detail panel
    const card = screen.getByRole('button', { name: /بطاقة الطالب: علي حسن السعدي/ })
    fireEvent.click(card)

    // Verify detail sheet opened
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'تفاصيل سجل الطالب' })).toBeInTheDocument()
    })

    const dialog = screen.getByRole('dialog', { name: 'تفاصيل سجل الطالب' })
    expect(within(dialog).getByText('علي حسن السعدي')).toBeInTheDocument()
    expect(within(dialog).getByText('قيد فعّال ومسجل')).toBeInTheDocument()
    expect(within(dialog).getByText('طالب متفوق علمياً')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('اتصال بولي الأمر 07801112233')).toBeInTheDocument()

    // Close detail panel
    const closeBtn = screen.getByLabelText('إغلاق التفاصيل')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تفاصيل سجل الطالب' })).not.toBeInTheDocument()
    })
  })

  it('Phase 4: StudentsPage opens mobile form sheet and protects unsaved edits', async () => {
    setupStudentsMocks()
    const confirmSpy = vi.spyOn(window, 'confirm')

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
      expect(screen.getByRole('button', { name: 'إضافة طالب جديد' })).toBeInTheDocument()
    })

    // Click Add New Student button
    fireEvent.click(screen.getByRole('button', { name: 'إضافة طالب جديد' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'إضافة طالب جديد' })).toBeInTheDocument()
    })

    // Type in name to make form dirty
    const nameInput = screen.getByPlaceholderText('الاسم الرباعي للطالب')
    fireEvent.change(nameInput, { target: { value: 'طالب تجريبي جديد' } })

    await waitFor(() => {
      expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()
    })

    // 1. Try to close form with cancel
    confirmSpy.mockReturnValueOnce(false)
    const closeFormBtn = screen.getByLabelText('إغلاق النموذج')
    fireEvent.click(closeFormBtn)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('تعديلات غير محفوظة'))
    expect(screen.getByText('⚠️ تعديلات غير محفوظة')).toBeInTheDocument()

    // 2. Try to close form with confirmation
    confirmSpy.mockReturnValueOnce(true)
    fireEvent.click(closeFormBtn)
    await waitFor(() => {
      expect(screen.queryByText('⚠️ تعديلات غير محفوظة')).not.toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })

  // ── Phase 5: Mobile Announcements & Notices Helper & Tests ────────────────────
  function setupNoticesMocks() {
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
            data: [
              { id: 1, letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
              { id: 2, letter: 'ب', stage: { name: 'الخامس', branch: 'علمي' } },
            ],
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
                id: 'n-1',
                title: 'إشعار عاجل بتعطيل الدوام',
                body: 'نظراً لسوء الأحوال الجوية تقرر تعطيل الدوام الرسمي.',
                priority: 3,
                section_id: null,
                publish_at: '2026-11-01T08:00:00Z',
                expires_at: '2026-11-05T23:59:59Z',
              },
              {
                id: 'n-2',
                title: 'امتحان نصف الفصل لمادة الرياضيات',
                body: 'يرجى إحضار الأدوات الهندسية.',
                priority: 2,
                section_id: 1,
                publish_at: '2026-11-02T08:00:00Z',
                expires_at: null,
              },
              {
                id: 'n-3',
                title: 'تعليمات الزي المدرسي الموحد',
                body: 'الالتزام التام بالزي المدرسي المعتمد.',
                priority: 1,
                section_id: null,
                publish_at: '2026-11-03T08:00:00Z',
                expires_at: null,
              },
            ],
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnThis(),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      }
    })
  }

  it('Phase 5: NoticesPage renders mobile priority filter pills and search, filtering notices in real-time', async () => {
    setupNoticesMocks()
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    render(
      <MemoryRouter initialEntries={['/admin/notices']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="notices" element={<NoticesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إضافة إشعار جديد/ })).toBeInTheDocument()
    })

    // Verify all 3 notices are rendered initially in mobile card list
    await waitFor(() => {
      expect(screen.getByText('إشعار عاجل بتعطيل الدوام')).toBeInTheDocument()
    })
    expect(screen.getByText('امتحان نصف الفصل لمادة الرياضيات')).toBeInTheDocument()
    expect(screen.getByText('تعليمات الزي المدرسي الموحد')).toBeInTheDocument()

    // Priority filter pills: Click "عاجل" tab
    const urgentTab = screen.getByRole('tab', { name: /عاجل/ })
    fireEvent.click(urgentTab)

    // Only urgent notice visible
    expect(screen.getByText('إشعار عاجل بتعطيل الدوام')).toBeInTheDocument()
    expect(screen.queryByText('امتحان نصف الفصل لمادة الرياضيات')).not.toBeInTheDocument()
    expect(screen.queryByText('تعليمات الزي المدرسي الموحد')).not.toBeInTheDocument()

    // Reset back to "كل الإعلانات"
    const allTab = screen.getByRole('tab', { name: /كل الإعلانات/ })
    fireEvent.click(allTab)
    expect(screen.getByText('امتحان نصف الفصل لمادة الرياضيات')).toBeInTheDocument()

    // Test Search input
    const searchInput = screen.getByLabelText('بحث في الإعلانات')
    fireEvent.change(searchInput, { target: { value: 'الرياضيات' } })

    expect(screen.getByText('امتحان نصف الفصل لمادة الرياضيات')).toBeInTheDocument()
    expect(screen.queryByText('إشعار عاجل بتعطيل الدوام')).not.toBeInTheDocument()

    // Test clear search
    const clearBtn = screen.getByLabelText('مسح البحث')
    fireEvent.click(clearBtn)
    expect(screen.getByText('إشعار عاجل بتعطيل الدوام')).toBeInTheDocument()
  })

  it('Phase 5: NoticesPage opens mobile live preview sheet and shows school branding', async () => {
    setupNoticesMocks()
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    render(
      <MemoryRouter initialEntries={['/admin/notices']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="notices" element={<NoticesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('إشعار عاجل بتعطيل الدوام')).toBeInTheDocument()
    })

    // Click Preview button on the first notice card
    const previewBtn = screen.getByRole('button', { name: 'معاينة إشعار: إشعار عاجل بتعطيل الدوام' })
    fireEvent.click(previewBtn)

    // Verify Live Preview sheet is open
    const previewDialog = await screen.findByRole('dialog', { name: 'معاينة الإشعار' })
    expect(within(previewDialog).getByText(/إعدادية الرميلة للبنين • إشعار رسمي/)).toBeInTheDocument()
    expect(within(previewDialog).getByText(/نظراً لسوء الأحوال الجوية تقرر تعطيل الدوام الرسمي/)).toBeInTheDocument()
    expect(within(previewDialog).getByText(/ينتهي هذا الإشعار بتاريخ/)).toBeInTheDocument()

    // Close preview
    const closeBtn = screen.getAllByRole('button', { name: 'إغلاق المعاينة' })[0]
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'معاينة الإشعار' })).not.toBeInTheDocument()
    })
  })

  it('Phase 5: NoticesPage opens mobile form sheet, previews draft, tracks dirty edits, and handles close confirmation', async () => {
    setupNoticesMocks()
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))
    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <MemoryRouter initialEntries={['/admin/notices']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="notices" element={<NoticesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إضافة إشعار جديد/ })).toBeInTheDocument()
    })

    // Click Add New Notice button
    fireEvent.click(screen.getByRole('button', { name: /إضافة إشعار جديد/ }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'نموذج الإشعار' })).toBeInTheDocument()
    })

    // Type title and body to make form dirty
    const titleInput = screen.getByLabelText('عنوان الإشعار للموبايل')
    fireEvent.change(titleInput, { target: { value: 'إشعار ورشة الذكاء الاصطناعي' } })

    const bodyInput = screen.getByLabelText('نص الإشعار للموبايل')
    fireEvent.change(bodyInput, { target: { value: 'ندعو جميع الطلبة لحضور الورشة في مختبر الحاسوب.' } })

    // Verify dirty badge appears
    await waitFor(() => {
      expect(screen.getByText('تعديلات غير محفوظة')).toBeInTheDocument()
    })

    // Click preview draft
    const previewDraftBtn = screen.getByRole('button', { name: /معاينة قبل النشر/ })
    fireEvent.click(previewDraftBtn)

    // Verify preview of draft shows draft title and text
    const draftDialog = await screen.findByRole('dialog', { name: 'معاينة الإشعار' })
    expect(within(draftDialog).getByText('إشعار ورشة الذكاء الاصطناعي')).toBeInTheDocument()
    expect(within(draftDialog).getByText(/ندعو جميع الطلبة لحضور الورشة في مختبر الحاسوب/)).toBeInTheDocument()

    // Close preview
    fireEvent.click(screen.getAllByRole('button', { name: 'إغلاق المعاينة' })[0])

    // Now test dirty cancel protection
    confirmSpy.mockReturnValueOnce(false)
    const cancelBtn = screen.getByRole('button', { name: 'إلغاء' })
    fireEvent.click(cancelBtn)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('تعديلات غير محفوظة'))
    expect(screen.getByRole('dialog', { name: 'نموذج الإشعار' })).toBeInTheDocument()

    // Confirm cancel
    confirmSpy.mockReturnValueOnce(true)
    fireEvent.click(cancelBtn)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'نموذج الإشعار' })).not.toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })

  // ── Phase 6: Mobile Admin Integration & Release Readiness Tests ───────────────
  function setupAllModulesMocks() {
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
            data: [
              { id: 1, letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
              { id: 2, letter: 'ب', stage: { name: 'الخامس', branch: 'علمي' } },
            ],
            error: null,
          }),
        }
      }
      if (table === 'subjects') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, name: 'الرياضيات', color: '#3D84C8' },
              { id: 2, name: 'الفيزياء', color: '#10B981' },
            ],
            error: null,
          }),
          then: (resolve: any) => resolve({ data: [], count: 8, error: null }),
        }
      }
      if (table === 'teachers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, full_name: 'أ. د. سفيان', subject_id: 1 },
              { id: 2, full_name: 'أ. عمر الراوي', subject_id: 2 },
            ],
            error: null,
          }),
          then: (resolve: any) => resolve({ data: [], count: 10, error: null }),
        }
      }
      if (table === 'teaching_assignments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [{ section_id: 1, subject_id: 1, teacher_id: 1 }],
            error: null,
          }),
          then: (resolve: any) => resolve({
            data: [{ section_id: 1, subject_id: 1, teacher_id: 1 }],
            count: 5,
            error: null,
          }),
        }
      }
      if (table === 'timetable') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 101,
                weekday: 0,
                period: 1,
                subject_id: 1,
                teacher_id: 1,
                subject: { name: 'الرياضيات', color: '#3D84C8' },
                teacher: { full_name: 'أ. د. سفيان' },
              },
            ],
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          then: (resolve: any) => resolve({
            data: [
              {
                id: 101,
                weekday: 0,
                period: 1,
                subject_id: 1,
                teacher_id: 1,
                subject: { name: 'الرياضيات', color: '#3D84C8' },
                teacher: { full_name: 'أ. د. سفيان' },
              },
            ],
            error: null,
          }),
        }
      }
      if (table === 'homework') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                section_id: 1,
                period: 1,
                subject_id: 1,
                subject_name: 'الرياضيات',
                details: 'حل تمارين ص 42',
                due_date: '2026-11-03',
                status: 'published',
              },
            ],
            error: null,
          }),
          then: (resolve: any) => resolve({
            data: [],
            count: 4,
            error: null,
          }),
        }
      }
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                full_name: 'علي حسن السعدي',
                notes: 'طالب متفوق علمياً',
                active: true,
                section_id: 1,
                section: { letter: 'أ', stage: { name: 'الخامس', branch: 'علمي' } },
              },
            ],
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          then: (resolve: any) => resolve({ data: [], count: 10, error: null }),
        }
      }
      if (table === 'guardians') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'g-1', full_name: 'حسن السعدي', phone: '07801112233' }],
            error: null,
          }),
          then: (resolve: any) => resolve({ data: [], count: 8, error: null }),
        }
      }
      if (table === 'guardian_students') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'notices') {
        return {
          select: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({
            count: 2,
            data: [
              {
                id: 'n-1',
                title: 'إشعار عاجل بتعطيل الدوام',
                body: 'نظراً لسوء الأحوال الجوية تقرر تعطيل الدوام الرسمي.',
                priority: 3,
                section_id: null,
                publish_at: '2026-11-01T08:00:00Z',
                expires_at: '2026-11-05T23:59:59Z',
              },
            ],
            error: null,
          }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'n-1',
                title: 'إشعار عاجل بتعطيل الدوام',
                body: 'نظراً لسوء الأحوال الجوية تقرر تعطيل الدوام الرسمي.',
                priority: 3,
                section_id: null,
                publish_at: '2026-11-01T08:00:00Z',
                expires_at: '2026-11-05T23:59:59Z',
              },
            ],
            count: 2,
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          then: (resolve: any) => resolve({ data: [], count: 2, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        then: (resolve: any) => resolve({ data: [], error: null }),
      }
    })
  }

  it('Phase 6: Multi-module bottom navigation and more-drawer integration', async () => {
    setupAllModulesMocks()
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="homework" element={<HomeworkEntry />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="notices" element={<NoticesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // 1. Verify on Dashboard and Bottom Navigation dock is rendered
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'الرئيسية (شريط سفلي)' })).toBeInTheDocument()
    })
    expect(screen.getByText('العمليات اليومية السريعة')).toBeInTheDocument()

    // 2. Navigate to Homework via Bottom Nav
    fireEvent.click(screen.getByRole('link', { name: 'الواجبات (شريط سفلي)' }))
    await waitFor(() => {
      expect(screen.getByText('الخامس علمي / أ')).toBeInTheDocument()
    })

    // 3. Navigate to Timetable via Bottom Nav
    fireEvent.click(screen.getByRole('link', { name: 'الجدول (شريط سفلي)' }))
    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'أقسام الشعب الدراسية للجدول' })).toBeInTheDocument()
    })

    // 4. Navigate to Students via Bottom Nav
    fireEvent.click(screen.getByRole('link', { name: 'الطلاب (شريط سفلي)' }))
    await waitFor(() => {
      expect(screen.getByText('دليل الطلاب وقوائم الفصول')).toBeInTheDocument()
    })

    // 5. Click "المزيد" to open the Mobile Navigation Drawer
    const moreBtn = screen.getByRole('button', { name: 'المزيد (شريط سفلي)' })
    fireEvent.click(moreBtn)
    await waitFor(() => {
      expect(screen.getByLabelText('القائمة الجانبية لإدارة المدرسة')).toHaveClass('mobile-open')
    })
    expect(screen.getByText('إعدادية الرميلة للبنين')).toBeInTheDocument()
  })

  it('Phase 6: Viewer role security enforcement across mobile modules', async () => {
    // 1. Verify StudentsPage under Viewer role
    setupStudentsMocks()
    const origStudentsFrom = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admins') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
        }
      }
      return origStudentsFrom(table)
    })

    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/students']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="students" element={<StudentsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /بطاقة الطالب: علي حسن السعدي/ })).toBeInTheDocument()
    })

    // Confirm that create/edit/delete buttons are completely absent
    expect(screen.queryByRole('button', { name: 'إضافة طالب جديد' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تعديل/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تعطيل|تفعيل/ })).not.toBeInTheDocument()

    unmount()

    // 2. Verify NoticesPage under Viewer role
    setupNoticesMocks()
    const origNoticesFrom = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admins') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
        }
      }
      return origNoticesFrom(table)
    })

    render(
      <MemoryRouter initialEntries={['/admin/notices']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="notices" element={<NoticesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('وضع المشاهدة (Viewer):')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /إضافة إشعار جديد/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تعديل/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /حذف/ })).not.toBeInTheDocument()
  })

  it('Phase 6: A4 Export button remains accessible on mobile in Homework', async () => {
    setupStudentsMocks()
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    render(
      <MemoryRouter initialEntries={['/admin/homework']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="homework" element={<HomeworkEntry />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /تصدير A4/ })).toBeInTheDocument()
    })
  })
});
