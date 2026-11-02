import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../SettingsPage'

const { saveSettings, settings } = vi.hoisted(() => ({
  saveSettings: vi.fn().mockResolvedValue({ success: true }),
  settings: {
    name: 'إعدادية الرميلة للبنين', ministry: 'وزارة التربية', governorate: 'الأنبار',
    directorate: 'المديرية العامة لتربية الأنبار', location: 'الرمادي', contact: '',
    country: 'جمهورية العراق', logoUrl: '', disclaimer: 'إدارة المدرسة',
  },
}))
vi.mock('../AdminShell', () => ({ useAdmin: () => ({ user: null, role: 'owner' }) }))
vi.mock('../../../services/platform', () => ({ platform: { isDesktop: false, versionGuard: { getState: () => 'COMPATIBLE' } } }))
vi.mock('../../../lib/supabase', () => ({ supabase: {}, normalizePhone: (v: string) => v }))
vi.mock('../../../services/schoolSettings', () => ({
  useSchoolSettings: () => ({ loading: false, saveSettings, settings }),
}))

describe('school identity fields', () => {
  it('keeps the ministry fixed and derives the directorate when the governorate changes', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    expect(screen.getByLabelText('الوزارة التابعة')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('المديرية العامة للتربية')).toHaveValue('المديرية العامة لتربية الأنبار')
    fireEvent.change(screen.getByLabelText('المحافظة'), { target: { value: 'البصرة' } })
    expect(screen.getByLabelText('المديرية العامة للتربية')).toHaveValue('المديرية العامة لتربية البصرة')
    expect(screen.getByLabelText('اسم المدرسة الرسمي')).not.toHaveAttribute('readonly')
    expect(saveSettings).not.toHaveBeenCalled()
  })

  it('offers Baghdad directorates without guessing one', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('المحافظة'), { target: { value: 'بغداد' } })
    const directorate = screen.getByLabelText('المديرية العامة للتربية')
    expect(directorate).toHaveValue('')
    expect(screen.getByRole('option', { name: 'المديرية العامة لتربية بغداد الكرخ الأولى' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'المديرية العامة لتربية بغداد الرصافة الثالثة' })).toBeInTheDocument()
  })
})
