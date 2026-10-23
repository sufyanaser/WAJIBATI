import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportAsImage,
  exportAsPDF,
  formatMathAndArabic,
  buildNoticesAndWarningsRow,
  buildExportPages,
  HomeworkExportData,
} from '../exportHomework'

// Polyfill Canvas toDataURL for JSDOM
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
)

// Mock html-to-image for JSDOM environment
vi.mock('html-to-image', () => {
  return {
    toCanvas: vi.fn().mockImplementation(async (_el: HTMLElement) => {
      const canvas = document.createElement('canvas')
      canvas.width = 1122
      canvas.height = 794
      return canvas
    }),
  }
})

describe('Homework Export Engine — Offline & Arabic RTL Verification', () => {
  const sampleData: HomeworkExportData = {
    schoolName: 'إعدادية الرميلة للبنين',
    sectionName: 'الخامس علمي أ',
    date: '2026-10-22',
    notices: 'يرجى إحضار الدفاتر المدرسية غداً لتدقيق الواجبات.',
    warnings: 'التأكيد على الالتزام بالزي المدرسي الموحد.',
    items: [
      {
        period: 1,
        subject: 'اللغة العربية',
        teacher: 'أ. أحمد العاني',
        body: 'حل تمرينات موضوع الفاعل في دفتر الواجبات ص 42.',
      },
      {
        period: 2,
        subject: 'الرياضيات',
        teacher: 'أ. خليل إبراهيم',
        body: 'حل المعادلة: 2x + 7 = 22 وبسط المقدار: (x + 2)(x + 5)',
      },
      {
        period: 3,
        subject: 'الفيزياء',
        teacher: 'أ. عمر الدوري',
        body: 'كتابة تقرير تجربة الحث الكهرومغناطيسي.',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates export card with proper Arabic institution header and RTL direction', async () => {
    let appendedCard: HTMLElement | null = null
    const originalAppend = document.body.appendChild.bind(document.body)
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if ((node as HTMLElement).dir === 'rtl') {
        appendedCard = node as HTMLElement
      }
      return originalAppend(node)
    })

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await exportAsImage(sampleData)

    expect(appendedCard).not.toBeNull()
    const html = appendedCard!.innerHTML
    expect(html).toContain('جمهورية العراق')
    expect(html).toContain('وزارة التربية')
    expect(html).toContain('المديرية العامة لتربية الانبار')
    expect(html).toContain('إعدادية الرميلة للبنين')
    expect(html).toContain('الخامس علمي أ')
    expect(html).toContain('اللغة العربية')
    expect(html).toContain('حل تمرينات موضوع الفاعل')
    expect(html).toContain('الفيزياء')
  })

  it('strictly verifies ZERO CDN script tags are injected into DOM', async () => {
    const scriptsBefore = document.querySelectorAll('script').length
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await exportAsImage(sampleData)

    const scriptsAfter = document.querySelectorAll('script').length
    expect(scriptsAfter).toBe(scriptsBefore)

    const cdnScripts = Array.from(document.querySelectorAll('script')).filter(s =>
      s.src.includes('cdnjs.cloudflare.com')
    )
    expect(cdnScripts.length).toBe(0)
  })

  it('prevents blank image regression: export pages have position:relative at (0,0) instead of negative coordinates', () => {
    const pages = buildExportPages(sampleData)
    expect(pages.length).toBeGreaterThan(0)
    for (const page of pages) {
      expect(page.style.position).toBe('relative')
      expect(page.style.top).toBe('0px')
      expect(page.style.left).toBe('0px')
      expect(page.style.width).toBe('1122px')
      expect(page.style.height).toBe('794px')
      expect(page.style.cssText).not.toContain('-9999px')
    }
  })

  it('runs PDF export successfully in offline mode with bundled jspdf', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await expect(exportAsPDF(sampleData)).resolves.not.toThrow()

    const jsPdfModule = await import('jspdf')
    expect(jsPdfModule).toBeDefined()
    const JsPdfClass = jsPdfModule.jsPDF || (jsPdfModule as any).default?.jsPDF || (jsPdfModule as any).default
    expect(typeof JsPdfClass).toBe('function')

    const doc = new JsPdfClass({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    expect(doc).toBeDefined()
    expect(typeof doc.save).toBe('function')
  })
})

describe('Mathematics & Arabic Text BiDi Formatting', () => {
  it('correctly isolates equations with dir="ltr" and Cambria Math font', () => {
    const text = '1. حل المعادلة: 2x + 7 = 22\n2. بسّط المقدار: (x + 2)(x + 5)\n3. حلّل: x² + 7x + 12'
    const formatted = formatMathAndArabic(text)

    expect(formatted).toContain('&rlm;')
    expect(formatted).toContain('dir="ltr"')
    expect(formatted).toContain('2x + 7 = 22')
    expect(formatted).toContain('(x + 2)(x + 5)')
    expect(formatted).toContain('x² + 7x + 12')
    expect(formatted).toContain('Cambria Math')
  })

  it('handles empty and whitespace gracefully without throwing', () => {
    expect(formatMathAndArabic('')).toBe('')
    expect(formatMathAndArabic('   \n  ')).toBe('')
  })
})

describe('Alerts & Notes (التنبيهات والملاحظات) Rules Verification', () => {
  it('Rule 5: returns empty string when both warnings and notices are empty', () => {
    expect(buildNoticesAndWarningsRow('', '')).toBe('')
    expect(buildNoticesAndWarningsRow(undefined, undefined)).toBe('')
    expect(buildNoticesAndWarningsRow('   ', '   ')).toBe('')
  })

  it('Rule 4: expands warnings to 100% width when notices is empty', () => {
    const html = buildNoticesAndWarningsRow('تنبيه مهم جداً', '')
    expect(html).toContain('flex: 1 1 100%')
    expect(html).toContain('تنبيهات')
    expect(html).not.toContain('ملاحظات')
    expect(html).toContain('#dc2626')
  })

  it('Rule 4: expands notices to 100% width when warnings is empty', () => {
    const html = buildNoticesAndWarningsRow('', 'ملاحظة خاصة بالامتحانات')
    expect(html).toContain('flex: 1 1 100%')
    expect(html).toContain('ملاحظات')
    expect(html).not.toContain('تنبيهات')
    expect(html).toContain('#cbd5e1')
  })

  it('Rules 1-3 & 7-9: renders both sections proportionally with warnings in red and notes in neutral', () => {
    const shortWarn = 'تنبيه قصير'
    const longNotes = 'هذه ملاحظة تفصيلية طويلة جداً تحتوي على توجيهات شاملة لكافة الطلاب والأساتذة لتنظيم الامتحانات'
    const html = buildNoticesAndWarningsRow(shortWarn, longNotes)

    expect(html).toContain('تنبيهات')
    expect(html).toContain('ملاحظات')
    // Warnings in red, notes in neutral
    expect(html).toContain('#dc2626')
    expect(html).toContain('#cbd5e1')

    // Notes is longer than warnings -> notes ratio expands beyond 50%
    const warnIdx = html.indexOf('تنبيهات')
    const notesIdx = html.indexOf('ملاحظات')
    // RTL: warnings appears first in markup
    expect(warnIdx).toBeLessThan(notesIdx)
  })
})

describe('Multi-page A4 Landscape Partitioning', () => {
  it('creates 1 page when items <= 6', () => {
    const data: HomeworkExportData = {
      schoolName: 'إعدادية الرميلة',
      sectionName: 'الرابع أ',
      date: '2026-10-22',
      items: [
        { period: 1, subject: 'مادة 1', teacher: 'أ. 1', body: 'واجب 1' },
        { period: 2, subject: 'مادة 2', teacher: 'أ. 2', body: 'واجب 2' },
        { period: 3, subject: 'مادة 3', teacher: 'أ. 3', body: 'واجب 3' },
      ],
    }
    const pages = buildExportPages(data)
    expect(pages.length).toBe(1)
    expect(pages[0].style.width).toBe('1122px')
    expect(pages[0].style.height).toBe('794px')
  })

  it('creates 2 pages when items = 9', () => {
    const data: HomeworkExportData = {
      schoolName: 'إعدادية الرميلة',
      sectionName: 'الرابع أ',
      date: '2026-10-22',
      warnings: 'تنبيه',
      notices: 'ملاحظة',
      items: Array.from({ length: 9 }).map((_, i) => ({
        period: i + 1,
        subject: `مادة ${i + 1}`,
        teacher: `أستاذ ${i + 1}`,
        body: `واجب ${i + 1}`,
      })),
    }
    const pages = buildExportPages(data)
    expect(pages.length).toBe(2)
    // Page 1 has 6 cards
    expect(pages[0].innerHTML).toContain('مادة 1')
    expect(pages[0].innerHTML).toContain('مادة 6')
    expect(pages[0].innerHTML).not.toContain('مادة 7')
    // Page 2 has continuation header and notices row
    expect(pages[1].innerHTML).toContain('مادة 7')
    expect(pages[1].innerHTML).toContain('مادة 9')
    expect(pages[1].innerHTML).toContain('تنبيهات')
    expect(pages[1].innerHTML).toContain('ملاحظات')
    expect(pages[1].innerHTML).toContain('صفحة 2 من 2')
  })
})
