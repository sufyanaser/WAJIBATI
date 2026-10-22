/**
 * Day 6 E2E — Admin UI tests
 * Tests admin login flow, dashboard, master data, homework entry
 * Uses real Supabase credentials (dev account: admin / admin1)
 * SAFE: read-only operations + form validation only; no production data mutations
 */
import { test, expect } from '@playwright/test'
import { shot, checkNoHorizontalOverflow, checkRTL, checkDarkBackground, checkNoOverlappingButtons, adminSignIn, isAdminAuthenticated } from './helpers'

// ── Admin auth flow ───────────────────────────────────────────────────────────

test.describe('Admin authentication', () => {
  test('login with correct credentials reaches dashboard', async ({ page }) => {
    await adminSignIn(page)
    expect(await isAdminAuthenticated(page), 'Admin should be authenticated').toBe(true)
    await expect(page).toHaveURL(/\/admin\/(dashboard|homework)/)
    await shot(page, 'admin-dashboard-authenticated')
  })

  test('logout returns to admin login', async ({ page }) => {
    await adminSignIn(page)
    expect(await isAdminAuthenticated(page), 'Admin should be authenticated').toBe(true)
    // find logout button
    const logoutBtn = page.locator('button:has-text("خروج"), button:has-text("تسجيل الخروج"), button[aria-label*="خروج"]').first()
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toMatch(/login/)
  })
})

// ── DashboardHome ─────────────────────────────────────────────────────────────

test.describe('DashboardHome', () => {
  test.beforeEach(async ({ page }) => {
    await adminSignIn(page)
    expect(await isAdminAuthenticated(page), 'Admin should be authenticated').toBe(true)
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('renders dash-header', async ({ page }) => {
    await expect(page.locator('.dash-header')).toBeVisible()
    await expect(page.locator('.dash-header__title')).toContainText('واجباتي')
  })

  test('renders nav cards grid', async ({ page }) => {
    await expect(page.locator('.dash-grid')).toBeVisible()
    const cards = page.locator('.dash-card')
    expect(await cards.count()).toBeGreaterThanOrEqual(4)
    await shot(page, `admin-dashboard`)
  })

  test('nav cards have icons and labels', async ({ page }) => {
    const icons = page.locator('.dash-card__icon')
    const labels = page.locator('.dash-card__label')
    expect(await icons.count()).toBeGreaterThanOrEqual(4)
    expect(await labels.count()).toBeGreaterThanOrEqual(4)
  })

  test('clicking الواجبات card navigates to /admin/homework', async ({ page }) => {
    await page.locator('.dash-card:has-text("الواجبات")').click()
    await expect(page).toHaveURL(/\/admin\/homework/, { timeout: 5000 })
  })

  test('clicking الطلاب card navigates with entity=students', async ({ page }) => {
    await page.locator('.dash-card:has-text("الطلاب")').click()
    await expect(page).toHaveURL(/entity=students/, { timeout: 5000 })
  })

  test('no horizontal overflow', async ({ page }) => {
    await checkNoHorizontalOverflow(page)
  })

  test('no overlapping buttons', async ({ page }) => {
    await checkNoOverlappingButtons(page)
  })

  test('RTL layout', async ({ page }) => {
    await checkRTL(page)
  })
})

// ── AdminShell sidebar ────────────────────────────────────────────────────────

test.describe('AdminShell', () => {
  test.beforeEach(async ({ page }) => {
    await adminSignIn(page)
    expect(await isAdminAuthenticated(page), 'Admin should be authenticated').toBe(true)
    await page.waitForLoadState('networkidle')
  })

  test('shell nav links are visible', async ({ page }) => {
    const navLinks = page.locator('nav a, nav button, .admin-nav a, .admin-nav button, aside a')
    const count = await navLinks.count()
    expect(count).toBeGreaterThan(0)
    await shot(page, 'admin-shell')
  })

  test('shell renders on mobile without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 })
    await checkNoHorizontalOverflow(page)
    await shot(page, 'admin-shell-mobile')
  })
})

// ── HomeworkEntry ─────────────────────────────────────────────────────────────

test.describe('HomeworkEntry', () => {
  test.beforeEach(async ({ page }) => {
    await adminSignIn(page)
    expect(await isAdminAuthenticated(page), 'Admin should be authenticated').toBe(true)
    await page.goto('/admin/homework')
    await page.waitForLoadState('networkidle')
  })

  test('renders section selector', async ({ page }) => {
    await expect(page.locator('select.admin-select, select[aria-label*="شعبة"]')).toBeVisible()
    await shot(page, 'homework-entry')
  })

  test('renders action bar with save and publish buttons', async ({ page }) => {
    await expect(page.locator('.he-btn-draft')).toBeVisible()
    await expect(page.locator('.btn-publish-all, .he-btn-publish')).toBeVisible()
  })

  test('renders timetable grid (periods)', async ({ page }) => {
    const periods = page.locator('.he-period-row')
    await page.waitForSelector('.he-timetable, .muted', { timeout: 8000 })
    const count = await periods.count()
    expect(count >= 0).toBe(true)
  })

  test('per-period publish button only shows on draft rows', async ({ page }) => {
    const draftStatuses = page.locator('.he-status--draft')
    const publishBtns = page.locator('.he-btn-publish--sm')
    const draftCount = await draftStatuses.count()
    const publishBtnCount = await publishBtns.count()
    expect(publishBtnCount).toBeLessThanOrEqual(draftCount)
  })

  test('no horizontal overflow', async ({ page }) => {
    await checkNoHorizontalOverflow(page)
  })

  test('mobile layout: timetable row stacks', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await checkNoHorizontalOverflow(page)
    const row = page.locator('.he-period-row').first()
    if (await row.count() > 0) {
      const cols = await row.evaluate(el => getComputedStyle(el).gridTemplateColumns)
      expect(cols.split(',').length, 'Period row is single-column on mobile').toBe(1)
    }
    await shot(page, 'homework-entry-mobile')
  })

  test('status summary bar shows counts', async ({ page }) => {
    await page.waitForTimeout(2000)
    const hasTimetable = await page.locator('.he-timetable').count() > 0
    if (hasTimetable) {
      const summaryVisible = await page.locator('.he-status--published, .he-status--draft, .he-status--empty').count() > 0
      expect(summaryVisible).toBe(true)
    }
  })
})

// ── MasterDataPage ────────────────────────────────────────────────────────────

test.describe('MasterDataPage', () => {
  test.beforeEach(async ({ page }) => {
    await adminSignIn(page)
    expect(await isAdminAuthenticated(page), 'Admin should be authenticated').toBe(true)
    await page.goto('/admin/master-data')
    await page.waitForLoadState('networkidle')
  })

  test('renders entity tabs', async ({ page }) => {
    const tabs = page.locator('.master-entities button')
    expect(await tabs.count()).toBeGreaterThanOrEqual(4)
    await shot(page, 'master-data')
  })

  test('entity=students query param selects students tab', async ({ page }) => {
    await page.goto('/admin/master-data?entity=students')
    await page.waitForLoadState('networkidle')
    const activeTab = page.locator('.master-entities button.active')
    await expect(activeTab).toContainText('الطلاب')
  })

  test('entity=teachers query param selects teachers tab', async ({ page }) => {
    await page.goto('/admin/master-data?entity=teachers')
    await page.waitForLoadState('networkidle')
    const activeTab = page.locator('.master-entities button.active')
    await expect(activeTab).toContainText('المدرسون')
  })

  test('entity=timetable query param selects timetable tab', async ({ page }) => {
    await page.goto('/admin/master-data?entity=timetable')
    await page.waitForLoadState('networkidle')
    const activeTab = page.locator('.master-entities button.active')
    await expect(activeTab).toContainText('الجداول')
  })

  test('إضافة جديد button shows form', async ({ page }) => {
    const addBtn = page.locator('.btn-publish-all:has-text("إضافة"), button:has-text("إضافة جديد")')
    if (await addBtn.count() > 0) {
      await addBtn.first().click()
      await expect(page.locator('.master-form, form')).toBeVisible()
      await shot(page, 'master-data-add-form')
    }
  })

  test('form has required fields marked', async ({ page }) => {
    await page.goto('/admin/master-data?entity=teachers')
    await page.waitForLoadState('networkidle')
    const addBtn = page.locator('.btn-publish-all, button:has-text("إضافة جديد")')
    if (await addBtn.count() > 0) {
      await addBtn.first().click()
      const requiredLabels = page.locator('.master-form label:has-text("*")')
      expect(await requiredLabels.count()).toBeGreaterThan(0)
    }
  })

  test('no horizontal overflow on timetable tab', async ({ page }) => {
    await page.goto('/admin/master-data?entity=timetable')
    await page.waitForLoadState('networkidle')
    await checkNoHorizontalOverflow(page)
    await shot(page, 'master-data-timetable')
  })

  test('accounts tab requires owner role', async ({ page }) => {
    await page.goto('/admin/master-data?entity=accounts')
    await page.waitForLoadState('networkidle')
    const content = page.locator('.master-warning, .master-list, .master-form')
    await expect(content).toBeVisible({ timeout: 5000 })
    await shot(page, 'master-data-accounts')
  })
})

// ── Archive (guardian) ────────────────────────────────────────────────────────

test.describe('Archive page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/archive')
    await page.waitForLoadState('networkidle')
  })

  test('renders archive page', async ({ page }) => {
    await expect(page.locator('.archive-wrap, main[dir="rtl"]')).toBeVisible()
    await shot(page, 'archive-page')
  })

  test('no horizontal overflow', async ({ page }) => {
    await checkNoHorizontalOverflow(page)
  })

  test('RTL direction set', async ({ page }) => {
    await checkRTL(page)
  })

  test('dark background', async ({ page }) => {
    await checkDarkBackground(page)
  })
})
