import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../Login'
import {
  normalizePhone,
  toWesternDigits,
  classifyAuthError,
  authErrorMessage,
} from '../../lib/supabase'

// Mock Supabase
const { mockSignInWithPassword } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
}))

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/supabase')>()
  return {
    ...actual,
    supabase: {
      auth: {
        signInWithPassword: mockSignInWithPassword,
      },
    },
  }
})

function fillAndSubmit(phone = '07708111744', pin = '123456') {
  fireEvent.change(screen.getByLabelText(/رقم الهاتف/i), { target: { value: phone } })
  fireEvent.change(screen.getByLabelText(/رمز PIN/i), { target: { value: pin } })
  fireEvent.click(screen.getByRole('button', { name: /دخول/i }))
}

describe('Digit normalization (Arabic-Indic / Persian)', () => {
  it('converts Arabic-Indic digits to ASCII', () => {
    expect(toWesternDigits('٠٧٧٠٨١١١٧٤٤')).toBe('07708111744')
  })

  it('converts Persian (Extended Arabic-Indic) digits to ASCII', () => {
    expect(toWesternDigits('۰۷۷۰۸۱۱۱۷۴۴')).toBe('07708111744')
  })

  it('preserves leading zeros in a PIN', () => {
    expect(toWesternDigits('٠٠١٢٣٤')).toBe('001234')
  })

  it('normalizePhone accepts Arabic-Indic phone numbers', () => {
    expect(normalizePhone('٠٧٧٠٨١١١٧٤٤')).toBe('07708111744')
  })

  it('normalizePhone accepts Persian digits with country code', () => {
    expect(normalizePhone('۹۶۴۷۷۰۸۱۱۱۷۴۴')).toBe('07708111744')
  })

  it('normalizePhone still rejects genuinely invalid input', () => {
    expect(() => normalizePhone('12345')).toThrow('invalid_phone')
  })
})

describe('Auth error classification', () => {
  it('classifies status 0 / fetch failures as network', () => {
    expect(
      classifyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 })
    ).toBe('network')
  })

  it('classifies 429 as rate_limit and 5xx as server', () => {
    expect(classifyAuthError({ status: 429, message: 'Too many requests' })).toBe('rate_limit')
    expect(classifyAuthError({ status: 503, message: 'Service unavailable' })).toBe('server')
  })

  it('classifies 400 invalid credentials as invalid_credentials', () => {
    expect(
      classifyAuthError({ name: 'AuthApiError', message: 'Invalid login credentials', status: 400 })
    ).toBe('invalid_credentials')
  })

  it('maps each class to a distinct Arabic message', () => {
    const invalid = 'رقم الهاتف أو الرمز غير صحيح'
    expect(authErrorMessage('network', invalid)).toContain('تعذر الاتصال بالخادم')
    expect(authErrorMessage('rate_limit', invalid)).toContain('الحد المسموح')
    expect(authErrorMessage('server', invalid)).toContain('خطأ في الخادم')
    expect(authErrorMessage('invalid_credentials', invalid)).toBe(invalid)
  })
})

describe('Parent Login error display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a connectivity message, not "wrong credentials", on network failure', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        name: 'AuthRetryableFetchError',
        message: 'Failed to fetch',
        status: 0,
        __isAuthError: true,
      },
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('تعذر الاتصال بالخادم')
    })
    expect(screen.queryByText('رقم الهاتف أو الرمز غير صحيح')).not.toBeInTheDocument()
  })

  it('shows the invalid-credentials message only when the server rejects credentials', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        message: 'Invalid login credentials',
        status: 400,
        __isAuthError: true,
      },
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('رقم الهاتف أو الرمز غير صحيح')).toBeInTheDocument()
    })
  })

  it('logs in with an Arabic-Indic phone and Arabic-digit PIN (PIN converted, zeros kept)', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'u1' }, session: {} },
      error: null,
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fillAndSubmit('٠٧٧٠٨١١١٧٤٤', '٠٠١٢٣٤')

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: '07708111744@guardian.rumaila.local',
        password: '001234',
      })
    })
  })
})
