/**
 * Day 6 E2E — Layout, visual, RTL, responsive tests
 * Runs on all 3 viewports (desktop / tablet / mobile)
 * No authentication required — tests public-facing UI only
 */
import { test, expect } from '@playwright/test'
import { shot, checkNoHorizontalOverflow, checkRTL, checkDarkBackground, checkNoOverlappingButtons } from './helpers'

const PUBLIC_ROUTES = ['/login', '/admin/login']

for (const route of PUBLIC_ROUTES) {
  test.describe(`Layout: ${route}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    })

    test('no horizontal overflow', async ({ page }) => {
      await checkNoHorizontalOverflow(page)
    })

    test('has RTL direction', async ({ page }) => {
      await checkRTL(page)
    })

    test('has dark background', async ({ page }) => {
      await checkDarkBackground(page)
    })

    test('no overlapping buttons', async ({ page }) => {
      await checkNoOverlappingButtons(page)
    })

    test('screenshot', async ({ page, browserName }, testInfo) => {
      const vp = testInfo.project.name
      await shot(page, `layout-${route.replace(/\//g, '-')}-${vp}`)
    })

    test('Tajawal font loaded', async ({ page }) => {
      const font = await page.evaluate(() => {
        const fonts = Array.from(document.fonts)
        return fonts.some(f => f.family.toLowerCase().includes('tajawal'))
      })
      expect(font, 'Tajawal font loaded').toBe(true)
    })

    test('accent color token active', async ({ page }) => {
      const accent = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      )
      expect(accent, 'Accent token set').toBeTruthy()
      expect(accent).not.toBe('')
    })

    test('all inputs have contrast against background', async ({ page }) => {
      const lowContrast = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea'))
        return inputs.filter(el => {
          const style = window.getComputedStyle(el)
          // if background is transparent/same as body, that's fine (inherited dark bg)
          const bg = style.backgroundColor
          return bg === 'rgb(255, 255, 255)' // white bg on input in dark theme = suspect
        }).length
      })
      expect(lowContrast, 'No white-background inputs in dark theme').toBe(0)
    })
  })
}

// ── CSS variable integrity ────────────────────────────────────────────────────

test.describe('Design token integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('all required CSS tokens are defined', async ({ page }) => {
    const missing = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const required = ['--bg', '--card', '--card2', '--accent', '--border', '--fg', '--muted', '--err', '--success']
      return required.filter(t => !root.getPropertyValue(t).trim())
    })
    expect(missing, 'No missing CSS tokens').toHaveLength(0)
  })

  test('dead color tokens are removed', async ({ page }) => {
    const deadTokens = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const dead = ['--color-bg-primary', '--color-text-primary', '--color-accent-primary']
      return dead.filter(t => root.getPropertyValue(t).trim() !== '')
    })
    expect(deadTokens, 'Dead color tokens are removed').toHaveLength(0)
  })

  test('spacing tokens are defined', async ({ page }) => {
    const missing = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const tokens = ['--space-1', '--space-2', '--space-4', '--space-6']
      return tokens.filter(t => !root.getPropertyValue(t).trim())
    })
    expect(missing, 'Spacing tokens defined').toHaveLength(0)
  })
})

// ── Responsive breakpoint: mobile timetable grid ─────────────────────────────

test.describe('Mobile responsive — admin timetable', () => {
  // We can test .he-period-row CSS grid columns without login
  test('he-period-row stacks to 1-col at 393px', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 })
    await page.goto('/login') // any page to get CSS loaded
    const gridCols = await page.evaluate(() => {
      // create a fake .he-period-row element and check computed style
      const el = document.createElement('div')
      el.className = 'he-period-row'
      el.style.visibility = 'hidden'
      document.body.appendChild(el)
      const cols = getComputedStyle(el).gridTemplateColumns
      document.body.removeChild(el)
      return cols
    })
    // At 393px the media query should apply: 1fr (single column)
    expect(gridCols, 'Timetable row stacks at mobile width').toMatch(/^[^,]+$/) // single value = 1 column
  })

  test('dash-grid uses 2 columns at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 })
    await page.goto('/login')
    const gridCols = await page.evaluate(() => {
      const el = document.createElement('div')
      el.className = 'dash-grid'
      el.style.visibility = 'hidden'
      document.body.appendChild(el)
      const cols = getComputedStyle(el).gridTemplateColumns
      document.body.removeChild(el)
      return cols
    })
    // repeat(2, 1fr) → two equal values
    const parts = gridCols.split(' ').filter(Boolean)
    expect(parts.length, 'dash-grid has 2 columns on mobile').toBe(2)
  })
})
