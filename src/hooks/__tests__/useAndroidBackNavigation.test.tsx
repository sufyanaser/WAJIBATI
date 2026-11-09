import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AndroidBackNavigationHandler } from '../useAndroidBackNavigation'
import { Capacitor } from '@capacitor/core'

const mockExitApp = vi.fn()
let backButtonCallback: ((data: { canGoBack: boolean }) => void) | null = null
const mockRemove = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}))

vi.mock('@capacitor/app', () => ({
  App: {
    exitApp: () => mockExitApp(),
    addListener: vi.fn((event: string, cb: (data: { canGoBack: boolean }) => void) => {
      if (event === 'backButton') {
        backButtonCallback = cb
      }
      return Promise.resolve({ remove: mockRemove })
    }),
  },
}))

function TestApp({ initialEntry = '/' }: { initialEntry?: string }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <AndroidBackNavigationHandler />
      <LocationDisplay />
    </MemoryRouter>
  )
}

function LocationDisplay() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

describe('useAndroidBackNavigation & AndroidBackNavigationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    backButtonCallback = null
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('does nothing when running on non-native platform (web)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

    render(<TestApp initialEntry="/admin/dashboard" />)
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/dashboard')
    expect(backButtonCallback).toBeNull()
  })

  it('registers backButton listener on native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    render(<TestApp initialEntry="/admin/dashboard" />)

    await act(async () => {
      // allow dynamic import to resolve
      await new Promise(r => setTimeout(r, 10))
    })

    expect(backButtonCallback).toBeTypeOf('function')
  })

  it('clicks lightbox close button if present on back button press', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    const lightboxBtn = document.createElement('button')
    lightboxBtn.className = 'drawer-lightbox-close'
    const clickSpy = vi.fn()
    lightboxBtn.addEventListener('click', clickSpy)
    document.body.appendChild(lightboxBtn)

    render(<TestApp initialEntry="/admin/dashboard" />)

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    expect(backButtonCallback).not.toBeNull()
    backButtonCallback!({ canGoBack: true })

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(mockExitApp).not.toHaveBeenCalled()
  })

  it('clicks drawer close button if visible on back button press', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    const drawerBtn = document.createElement('button')
    drawerBtn.className = 'drawer-close-btn'
    // JSDOM has offsetParent as null by default; define it as non-null
    Object.defineProperty(drawerBtn, 'offsetParent', { value: document.body, configurable: true })
    const clickSpy = vi.fn()
    drawerBtn.addEventListener('click', clickSpy)
    document.body.appendChild(drawerBtn)

    render(<TestApp initialEntry="/admin/dashboard" />)

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    backButtonCallback!({ canGoBack: true })
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(mockExitApp).not.toHaveBeenCalled()
  })

  it('exits app on root route /', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    render(<TestApp initialEntry="/" />)

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    backButtonCallback!({ canGoBack: false })
    expect(mockExitApp).toHaveBeenCalledTimes(1)
  })

  it('exits app on /login root route', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    render(<TestApp initialEntry="/login" />)

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    backButtonCallback!({ canGoBack: false })
    expect(mockExitApp).toHaveBeenCalledTimes(1)
  })

  it('cleans up listener on unmount', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    const { unmount } = render(<TestApp initialEntry="/admin" />)

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    unmount()
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })
})
