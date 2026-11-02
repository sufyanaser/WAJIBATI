import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TimetablePage from '../TimetablePage'

const { mockFrom, mockWrite, mockResult, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(), mockWrite: vi.fn(), mockResult: vi.fn(), mockToast: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({ supabase: { from: mockFrom } }))
vi.mock('../AdminShell', () => ({ useAdmin: () => ({ ready: true, role: 'owner' }) }))
vi.mock('../../../components/Toast', () => ({
  Toast: () => null,
  useToast: () => ({ toast: null, show: mockToast, clear: vi.fn() }),
}))

const rows: Record<string, unknown[]> = {
  sections: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
  subjects: [{ id: 1, name: 'العربية', color: null }, { id: 2, name: 'الرياضيات', color: null }],
  teachers: [{ id: 10, full_name: 'أ. سامي', subject_id: 1 }, { id: 20, full_name: 'أ. كريم', subject_id: 2 }, { id: 30, full_name: 'أ. آخر', subject_id: 2 }],
  teaching_assignments: [{ section_id: 1, subject_id: 2, teacher_id: 20 }],
  timetable: [{ id: 5, weekday: 0, period: 1, subject_id: 1, teacher_id: 10, subject: { name: 'العربية', color: null }, teacher: { full_name: 'أ. سامي' } }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockResult.mockResolvedValue({ data: { id: 5 }, error: null })
  mockFrom.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq']) chain[method] = vi.fn(() => chain)
    chain.order = vi.fn().mockResolvedValue({ data: rows[table], error: null })
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve({ data: rows[table], error: null }).then(resolve)
    chain.update = vi.fn((payload: unknown) => { mockWrite('update', payload); return chain })
    chain.insert = vi.fn((payload: unknown) => { mockWrite('insert', payload); return chain })
    chain.delete = vi.fn(() => { mockWrite('delete'); return chain })
    chain.maybeSingle = mockResult
    return chain
  })
})

describe('timetable autosave', () => {
  it('saves a changed subject with its assigned teacher, then saves a manual teacher change', async () => {
    render(<TimetablePage />)
    await waitFor(() => expect(screen.getByLabelText('مادة الأحد الحصة 1')).toHaveValue('1'))
    const subject = screen.getByLabelText('مادة الأحد الحصة 1')
    fireEvent.change(subject, { target: { value: '2' } })
    await waitFor(() => expect(mockWrite).toHaveBeenCalledWith('update', expect.objectContaining({ subject_id: 2, teacher_id: 20 })))
    await waitFor(() => expect(screen.getByLabelText('مدرس الأحد الحصة 1')).toHaveValue('20'))
    await waitFor(() => expect(subject).not.toBeDisabled())
    fireEvent.change(screen.getByLabelText('مدرس الأحد الحصة 1'), { target: { value: '30' } })
    await waitFor(() => expect(mockWrite).toHaveBeenCalledWith('update', expect.objectContaining({ subject_id: 2, teacher_id: 30 })))
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument()
  })

  it('restores the original values and reports a failed save', async () => {
    mockResult.mockResolvedValueOnce({ data: null, error: { message: 'فشل الاتصال' } })
    render(<TimetablePage />)
    await waitFor(() => expect(screen.getByLabelText('مادة الأحد الحصة 1')).toHaveValue('1'))
    const subject = screen.getByLabelText('مادة الأحد الحصة 1')
    fireEvent.change(subject, { target: { value: '2' } })
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('تعذر تأكيد الحفظ'), 'error'))
    expect(subject).toHaveValue('1')
    expect(screen.getByLabelText('مدرس الأحد الحصة 1')).toHaveValue('10')
  })
})
