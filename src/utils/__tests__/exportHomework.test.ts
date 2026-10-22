import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportAsImage, exportAsPDF, HomeworkExportData } from '../exportHomework'

// Polyfill Canvas toDataURL for JSDOM
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
)

// Mock html-to-image for JSDOM environment since JSDOM lacks native canvas drawing engine
vi.mock('html-to-image', () => {
  return {
    toCanvas: vi.fn().mockImplementation(async (_el: HTMLElement) => {
      const canvas = document.createElement('canvas')
      canvas.width = 1100
      canvas.height = 800
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
        body: 'مراجعة موضوع المشتقات وحل المسألة رقم 3 من تمارين الفصل.',
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

  it('runs PDF export successfully in offline mode with bundled jspdf', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    // Test that exportAsPDF completes without error using local bundled jspdf
    await expect(exportAsPDF(sampleData)).resolves.not.toThrow()

    const jsPdfModule = await import('jspdf')
    expect(jsPdfModule).toBeDefined()
    const JsPdfClass = jsPdfModule.jsPDF || (jsPdfModule as any).default?.jsPDF || (jsPdfModule as any).default
    expect(typeof JsPdfClass).toBe('function')

    const doc = new JsPdfClass({ orientation: 'landscape', unit: 'px', format: 'a4' })
    expect(doc).toBeDefined()
    expect(typeof doc.save).toBe('function')
  })
})
