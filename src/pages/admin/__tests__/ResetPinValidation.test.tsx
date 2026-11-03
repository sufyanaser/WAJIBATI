import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SettingsPage from '../SettingsPage'

const mockInvoke = vi.fn()
const mockGetSession = vi.fn()

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
  normalizePhone: (raw: string) => {
    const d = raw.replace(/\D/g, '')
    if (/^07\d{9}$/.test(d)) return d
    if (/^9647\d{9}$/.test(d)) return '0' + d.slice(3)
    if (/^\+9647\d{9}$/.test(raw.trim())) return '0' + raw.trim().slice(4)
    throw new Error('invalid_phone')
  },
  isValidPhone: (raw: string) => {
    try {
      const d = raw.replace(/\D/g, '')
      return /^07\d{9}$/.test(d) || /^9647\d{9}$/.test(d) || /^\+9647\d{9}$/.test(raw.trim())
    } catch {
      return false
    }
  },
  isValidPin: (pin: string) => /^[0-9]{6}$/.test(pin),
}))

vi.mock('../AdminShell', () => ({
  useAdmin: () => ({
    role: 'owner',
    user: { id: 'admin-1', email: 'admin@admin.rumaila.local' },
  }),
}))

describe('SettingsPage — Guardian PIN Reset Phone Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'admin-1', email: 'admin@admin.rumaila.local' },
        },
      },
    })
  })

  function renderSettings() {
    return render(
      <MemoryRouter initialEntries={['/admin/settings']}>
        <Routes>
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders the PIN reset section with local Iraqi phone format hint and placeholder', () => {
    renderSettings()

    expect(screen.getByText('إعادة تعيين رمز دخول ولي الأمر')).toBeInTheDocument()
    expect(screen.getByText(/رقم هاتف ولي الأمر \(11 رقماً يبدأ بـ 07\)/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('07XXXXXXXXX')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('مثال: 123456')).toBeInTheDocument()
  })

  it('rejects phone numbers with invalid prefixes or incorrect digit counts', async () => {
    renderSettings()

    const phoneInput = screen.getByPlaceholderText('07XXXXXXXXX')
    const pinInput = screen.getByPlaceholderText('مثال: 123456')
    const submitBtn = screen.getByRole('button', { name: /حفظ وتحديث رمز الدخول/ })

    // Non-07 prefix (e.g. 05...)
    fireEvent.change(phoneInput, { target: { value: '05801234567' } })
    fireEvent.change(pinInput, { target: { value: '123456' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/يرجى كتابة رقم هاتف عراقي صالح مكون من 11 رقماً يبدأ بـ 07/)).toBeInTheDocument()
    })
    expect(mockInvoke).not.toHaveBeenCalled()

    // Too short (10 digits)
    fireEvent.change(phoneInput, { target: { value: '0780123456' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/يرجى كتابة رقم هاتف عراقي صالح مكون من 11 رقماً يبدأ بـ 07/)).toBeInTheDocument()
    })
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('rejects invalid PIN length (less or more than 6 digits)', async () => {
    renderSettings()

    const phoneInput = screen.getByPlaceholderText('07XXXXXXXXX')
    const pinInput = screen.getByPlaceholderText('مثال: 123456')
    const submitBtn = screen.getByRole('button', { name: /حفظ وتحديث رمز الدخول/ })

    fireEvent.change(phoneInput, { target: { value: '07801234567' } })
    fireEvent.change(pinInput, { target: { value: '12345' } }) // 5 digits

    // Button is disabled when PIN is not 6 digits
    expect(submitBtn).toBeDisabled()

    // Direct form submit triggers the explicit validation error
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/رمز الدخول يجب أن يتكون من 6 أرقام بالضبط/)).toBeInTheDocument()
    })
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('successfully invokes reset-pin with valid local 07XXXXXXXXX phone format', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { ok: true }, error: null })
    renderSettings()

    const phoneInput = screen.getByPlaceholderText('07XXXXXXXXX')
    const pinInput = screen.getByPlaceholderText('مثال: 123456')
    const submitBtn = screen.getByRole('button', { name: /حفظ وتحديث رمز الدخول/ })

    fireEvent.change(phoneInput, { target: { value: '07801234567' } })
    fireEvent.change(pinInput, { target: { value: '654321' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('reset-pin', {
        body: { phone: '07801234567', new_pin: '654321' },
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/تم تحديث رمز الدخول بنجاح لرقم الهاتف \(07801234567\)/)).toBeInTheDocument()
    })

    // Inputs should be cleared on success
    expect(phoneInput).toHaveValue('')
    expect(pinInput).toHaveValue('')
  })

  it('normalizes +9647XXXXXXXXX international format to local 07XXXXXXXXX when submitting', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { ok: true }, error: null })
    renderSettings()

    const phoneInput = screen.getByPlaceholderText('07XXXXXXXXX')
    const pinInput = screen.getByPlaceholderText('مثال: 123456')
    const submitBtn = screen.getByRole('button', { name: /حفظ وتحديث رمز الدخول/ })

    // User pastes international format
    fireEvent.change(phoneInput, { target: { value: '+9647801234567' } })
    fireEvent.change(pinInput, { target: { value: '112233' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('reset-pin', {
        body: { phone: '07801234567', new_pin: '112233' },
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/تم تحديث رمز الدخول بنجاح لرقم الهاتف \(07801234567\)/)).toBeInTheDocument()
    })
  })

  it('displays error message when Edge Function returns an error', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('guardian not found') })
    renderSettings()

    const phoneInput = screen.getByPlaceholderText('07XXXXXXXXX')
    const pinInput = screen.getByPlaceholderText('مثال: 123456')
    const submitBtn = screen.getByRole('button', { name: /حفظ وتحديث رمز الدخول/ })

    fireEvent.change(phoneInput, { target: { value: '07809999999' } })
    fireEvent.change(pinInput, { target: { value: '999999' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/تعذر تحديث الرمز: guardian not found/)).toBeInTheDocument()
    })
  })
})
