import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import AdminShell from '../AdminShell'
import SettingsPage from '../SettingsPage'

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

describe('AdminShell — Reengineered Dashboard Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'admin-user-123',
            email: 'supervisor@admin.rumaila.local',
          },
        },
      },
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admins') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: 'owner' },
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
  })

  it('renders all 6 canonical school workflow sections in the sidebar', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="dashboard" element={<div>محتوى الرئيسية</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('لوحة المؤشرات والملخص')).toBeInTheDocument()
    })

    // Verify all 6 canonical workflow sections exist in the navigation
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الواجبات اليومية' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الجدول الدراسي' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الإعلانات والتنبيهات' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'قاعدة البيانات المدرسية' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الإعدادات والصلاحيات' })).toBeInTheDocument()

    // Verify user display name and owner role badge
    expect(screen.getAllByText('supervisor').length).toBeGreaterThan(0)
    expect(screen.getAllByText('مالك النظام').length).toBeGreaterThan(0)
  })

  it('toggles sidebar collapse state and persists to localStorage', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="dashboard" element={<div>محتوى الرئيسية</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('لوحة المؤشرات والملخص')).toBeInTheDocument()
    })

    const sidebar = container.querySelector('.admin-sidebar')
    expect(sidebar?.classList.contains('collapsed')).toBe(false)

    // Find and click collapse toggle button
    const toggleBtn = screen.getByRole('button', { name: 'طي القائمة الجانبية' })
    fireEvent.click(toggleBtn)

    expect(sidebar?.classList.contains('collapsed')).toBe(true)
    expect(localStorage.getItem('wajibati_sidebar_collapsed')).toBe('true')

    // Click again to expand
    fireEvent.click(toggleBtn)
    expect(sidebar?.classList.contains('collapsed')).toBe(false)
    expect(localStorage.getItem('wajibati_sidebar_collapsed')).toBe('false')
  })

  it('renders subnav pills for multi-entity sections (e.g. Students & Sections)', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/students']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="students" element={<div>دليل الطلاب هنا</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('دليل الطلاب وقوائم الفصول')).toBeInTheDocument()
    })

    // Subnav pills container must render sublinks
    const subnav = screen.getByRole('navigation', { name: 'أقسام فرعية' })
    expect(subnav).toBeInTheDocument()
    expect(screen.getAllByText('دليل الطلاب').length).toBeGreaterThan(0)
    expect(screen.getAllByText('الشعب الدراسية').length).toBeGreaterThan(0)
    expect(screen.getAllByText('أولياء الأمور').length).toBeGreaterThan(0)
  })
})

describe('SettingsPage — Administration & Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'admin-1',
            email: 'admin_principal@admin.rumaila.local',
          },
        },
      },
    })
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
    }))
  })

  it('renders current session, PIN reset form, and system environment info', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/settings']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('إدارة الحسابات وبيئة التشغيل')).toBeInTheDocument()
    })

    expect(screen.getByText('جلسة المشرف الحالية')).toBeInTheDocument()
    expect(screen.getByText('إعادة تعيين رمز دخول ولي الأمر')).toBeInTheDocument()
    expect(screen.getByText('بيانات المدرسة وبيئة التشغيل')).toBeInTheDocument()
    expect(screen.getByText('حفظ وتحديث رمز الدخول')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /إدارة حسابات المسؤولين/ })).toBeInTheDocument()
  })

  it('validates Iraqi phone format and 6-digit pin before invoking reset-pin', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/settings']}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('إدارة الحسابات وبيئة التشغيل')).toBeInTheDocument()
    })

    const phoneInput = screen.getByPlaceholderText('+9647XXXXXXXXX')
    const pinInput = screen.getByPlaceholderText('مثال: 123456')
    const submitBtn = screen.getByText('حفظ وتحديث رمز الدخول')

    // Try with invalid phone
    fireEvent.change(phoneInput, { target: { value: '07701234567' } })
    fireEvent.change(pinInput, { target: { value: '123456' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/يرجى كتابة رقم هاتف صالح بالصيغة العراقية الدولية/)).toBeInTheDocument()
    })
    expect(mockInvoke).not.toHaveBeenCalled()

    // Now valid phone and pin
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null })
    fireEvent.change(phoneInput, { target: { value: '+9647701234567' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('reset-pin', {
        body: { phone: '+9647701234567', new_pin: '123456' },
      })
      expect(screen.getByText(/تم تحديث رمز الدخول بنجاح/)).toBeInTheDocument()
    })
  })
})
