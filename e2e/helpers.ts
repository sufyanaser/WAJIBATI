/**
 * Shared Playwright helpers for Day 6 E2E tests
 */
import { Page, expect } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const SCREENS_DIR = join(__dirname, 'screenshots')

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(SCREENS_DIR, `${name}.png`), fullPage: true })
}

export async function checkNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(overflow, 'No horizontal overflow').toBe(false)
}

export async function checkRTL(page: Page) {
  const rtlEl = await page.evaluate(() => !!document.querySelector('[dir="rtl"]'))
  expect(rtlEl, 'RTL dir attribute present').toBe(true)
}

export async function checkDarkBackground(page: Page) {
  const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor)
  expect(bg, 'Body has dark background (not white)').not.toBe('rgb(255, 255, 255)')
}

export async function checkNoOverlappingButtons(page: Page) {
  const overlapping = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button:not([disabled])'))
    for (let i = 0; i < buttons.length; i++) {
      const r1 = buttons[i].getBoundingClientRect()
      if (r1.width === 0 || r1.height === 0) continue
      for (let j = i + 1; j < buttons.length; j++) {
        const r2 = buttons[j].getBoundingClientRect()
        if (r2.width === 0 || r2.height === 0) continue
        const overlap = !(r1.right <= r2.left || r2.right <= r1.left || r1.bottom <= r2.top || r2.bottom <= r1.top)
        if (overlap) return `"${buttons[i].textContent?.trim()}" overlaps "${buttons[j].textContent?.trim()}"`
      }
    }
    return null
  })
  expect(overlapping, 'No overlapping buttons').toBeNull()
}

/** Sign in as admin (uses real Supabase — only call in tests that need it) */
export async function adminSignIn(page: Page, username = 'admin', password = 'admin1') {
  await page.goto('/admin/login')
  await page.locator('input[type="text"], input[placeholder*="مستخدم"]').first().fill(username)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  // Wait for a non-login admin page — /admin/dashboard, /admin/homework, etc.
  try {
    await page.waitForURL(
      url => url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login'),
      { timeout: 15000 },
    )
    await page.waitForLoadState('networkidle')
  } catch {
    // auth failed — caller will detect via isAdminAuthenticated()
  }
}

/** Returns true if currently on an admin authenticated page */
export async function isAdminAuthenticated(page: Page) {
  return page.url().includes('/admin') && !page.url().includes('/login')
}
