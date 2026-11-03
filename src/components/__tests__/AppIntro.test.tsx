import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppIntro } from '../AppIntro'

beforeEach(() => sessionStorage.clear())
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

function motionPreference(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches })))
}

it('keeps the mounted interface inert until the full logo reveal finishes in StrictMode', () => {
  vi.useFakeTimers()
  motionPreference(false)
  render(<StrictMode><AppIntro><button>الواجهة</button></AppIntro></StrictMode>)
  const content = screen.getByText('الواجهة').parentElement!
  expect(content).toHaveAttribute('inert')
  act(() => vi.advanceTimersByTime(6499))
  expect(screen.getByRole('status')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(content).not.toHaveAttribute('inert')
  expect(content).not.toHaveAttribute('aria-hidden')
})

it('shortens the intro for people who request reduced motion', () => {
  vi.useFakeTimers()
  motionPreference(true)
  render(<AppIntro><span>المحتوى</span></AppIntro>)
  expect(screen.getByRole('status')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(200))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('clears its timer when unmounted', () => {
  vi.useFakeTimers()
  motionPreference(false)
  const { unmount } = render(<AppIntro><span /></AppIntro>)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
