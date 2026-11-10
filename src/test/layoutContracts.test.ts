import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regression guards for layout bugs found during the UI review.
 * Each assertion pins the CSS/markup contract whose absence caused a visible defect.
 */
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

describe('layout contracts', () => {
  it('scopes the two-column dashboard grid to the dashboard home only', () => {
    // A bare `.dash-page` grid squeezed the guardians/students tables into one narrow column.
    expect(css).toMatch(/\.dash-page--home\s*\{[^}]*grid-template-columns/)
    expect(css).not.toMatch(/\n\s*\.dash-page\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
    expect(read('src/pages/admin/DashboardHome.tsx')).toContain('dash-page dash-page--home')
  })

  it('keeps the guardian screen grid from growing wider than the viewport', () => {
    // Without a minmax(0, 1fr) track, wide children pushed the whole RTL page sideways.
    expect(css).toMatch(/\.screen\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);?\s*\}/)
  })

  it('lets guardian subject names wrap instead of overlapping the icon', () => {
    const rule = css.match(/\.period-card--master \.period-card-subject\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toContain('white-space: normal')
    expect(rule).not.toContain('nowrap')
  })

  it('renders master-data status lines outside the card grid', () => {
    const src = read('src/pages/admin/MasterDataPage.tsx')
    const gridStart = src.indexOf('<div className="master-list">')
    expect(gridStart).toBeGreaterThan(-1)
    expect(src.indexOf('master-list-status')).toBeLessThan(gridStart)
    expect(src.slice(gridStart, gridStart + 200)).not.toContain('جارٍ التحميل')
  })

  it('keeps the homework page free of !important overrides', () => {
    const start = css.indexOf('Homework entry — institutional layout')
    expect(start).toBeGreaterThan(-1)
    const block = css.slice(start).split('\n').slice(3).join('\n')
    expect(block).not.toContain('!important')
  })
})
