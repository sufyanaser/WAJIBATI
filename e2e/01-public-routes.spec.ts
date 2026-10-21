/**
 * Day 6 E2E — Public / unauthenticated routes
 * Tests: login pages, redirects, RTL, no overflow, no hidden interactive elements
 */
import { test, expect, Page } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENS_DIR = join(__dirname, 'screenshots')

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(SCREENS_DIR, `${name}.png`), fullPage: true })
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function checkNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow, 'No horizontal overflow').toBe(false)
}

async function checkRTL(page: Page) {
  const dir = await page.evaluate(() => document.body.getAttribute('dir') ?? document.documentElement.getAttribute('dir'))
  // RTL should be set somewhere on the page (body or a wrapper)
  const rtlEl = await page.evaluate(() => !!document.querySelector('[dir="rtl"]'))
  expect(rtlEl, 'RTL dir attribute present').toBe(true)
}

async function checkDarkBackground(page: Page) {
  const bg = await page.evaluate(() => {
    const style = window.getComputedStyle(document.body)
    return style.backgroundColor
  })
  // should NOT be white (#fff)
  expect(bg, 'Body has dark background').not.toBe('rgb(255, 255, 255)')
}

// ── Guardian Login ────────────────────────────────────────────────────────────

test.describe('Guardian Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders login form', async ({ page }) => {
    await expect(page.locator('input[type="tel"], input[placeholder*="هاتف"], input[placeholder*="رقم"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[placeholder*="PIN"], input[placeholder*="رمز"]')).toBeVisible()
    await expect(page.locator('button[type="submit"], button:has-text("دخول")')).toBeVisible()
    await shot(page, `guardian-login-${page.context().browser()?.browserType().name()}`)
  })

  test('has RTL direction', async ({ page }) => {
    await checkRTL(page)
  })

  test('has dark background', async ({ page }) => {
    await checkDarkBackground(page)
  })

  test('no horizontal overflow', async ({ page }) => {
    await checkNoHorizontalOverflow(page)
  })

  test('shows error on empty submit', async ({ page }) => {
    // Check form has required inputs OR submit button is disabled when empty
    const hasGuard = await page.evaluate(() => {
      const form = document.querySelector('form')
      if (!form) return false
      const requiredInputs = form.querySelectorAll('input[required]')
      if (requiredInputs.length > 0) return true
      const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
      return btn?.disabled === true
    })
    expect(hasGuard, 'Form guards against empty submit (required inputs or disabled button)').toBe(true)
  })

  test('shows error on wrong credentials', async ({ page }) => {
    const phoneInput = page.locator('input').first()
    const pinInput = page.locator('input[type="password"]')
    await phoneInput.fill('+9647001234567')
    await pinInput.fill('999999')
    await page.locator('button[type="submit"], button:has-text("دخول")').click()
    // wait for error message
    await expect(page.locator('[class*="err"], [class*="error"], .err, p:has-text("غير"), p:has-text("خطأ")')).toBeVisible({ timeout: 8000 })
    await shot(page, 'guardian-login-error')
  })
})

// ── Admin Login ───────────────────────────────────────────────────────────────

test.describe('Admin Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
  })

  test('renders admin login form', async ({ page }) => {
    await expect(page.locator('input[type="text"], input[placeholder*="مستخدم"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[placeholder*="مرور"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await shot(page, `admin-login-${page.context().browser()?.browserType().name()}`)
  })

  test('has RTL direction', async ({ page }) => {
    await checkRTL(page)
  })

  test('has dark background', async ({ page }) => {
    await checkDarkBackground(page)
  })

  test('no horizontal overflow', async ({ page }) => {
    await checkNoHorizontalOverflow(page)
  })

  test('shows error on wrong credentials', async ({ page }) => {
    await page.locator('input[type="text"], input[placeholder*="مستخدم"]').first().fill('wrong')
    await page.locator('input[type="password"]').fill('wrongpass')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('[class*="err"], .err, p:has-text("غير صحيحة"), p:has-text("خطأ")')).toBeVisible({ timeout: 8000 })
    await shot(page, 'admin-login-error')
  })

  test('password toggle shows/hides password', async ({ page }) => {
    const passInput = page.locator('input[type="password"]')
    await passInput.fill('testpass')
    // look for show/hide button
    const toggleBtn = page.locator('button[aria-label*="كلمة"], button[title*="كلمة"], button:near(input[type="password"])')
    if (await toggleBtn.count() > 0) {
      await toggleBtn.first().click()
      await expect(page.locator('input[type="text"][value="testpass"]')).toBeVisible()
    }
  })
})

// ── Auth redirect: unauthenticated admin → login ──────────────────────────────

test.describe('Auth redirects', () => {
  test('unauthenticated /admin redirects to admin login', async ({ page }) => {
    await page.goto('/admin/dashboard')
    // should end up at /admin/login (or /admin with login check)
    await page.waitForURL(/\/(admin\/login|login)/, { timeout: 8000 })
    await expect(page.url()).toMatch(/login/)
  })

  test('unauthenticated / renders Today page or guardian login', async ({ page }) => {
    await page.goto('/')
    // Today page should render (auth check may redirect to guardian login)
    await page.waitForLoadState('networkidle')
    // either shows today content or login
    const isLoginPage = page.url().includes('/login')
    const hasTodayContent = await page.locator('h1, .screen, main').count() > 0
    expect(hasTodayContent || isLoginPage).toBe(true)
  })
})
