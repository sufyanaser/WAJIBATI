export interface HomeworkExportData {
  schoolName: string
  sectionName: string
  date: string
  notices?: string
  warnings?: string
  items: Array<{
    period: number
    subject: string
    teacher: string
    body: string
  }>
}

// ── SVG Subject Icons (Clean 18×18 line stroke for high-contrast B&W and color print) ──

const SUBJECT_ICONS: Record<string, string> = {
  'رياضيات': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  'فيزياء': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>`,
  'كيمياء': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v7l4 11H5L9 10V3z"/><line x1="9" y1="3" x2="15" y2="3"/></svg>`,
  'أحياء': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C12 22 4 18 4 11C4 7 7 4 11 4C11 4 12 12 20 12C20 16 17 22 12 22Z"/></svg>`,
  'احياء': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C12 22 4 18 4 11C4 7 7 4 11 4C11 4 12 12 20 12C20 16 17 22 12 22Z"/></svg>`,
  'عربي': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  'انجليزي': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
  'إنجليزي': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
  'اسلامي': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  'إسلامي': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  'تاريخ': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  'جغرافي': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  'رياضي': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.5 8.5 0 0 1 13 0"/></svg>`,
  'حاسوب': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  'بعث': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
}

export function getSubjectIcon(subject: string): string {
  for (const [key, svg] of Object.entries(SUBJECT_ICONS)) {
    if (subject.includes(key)) return svg
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Arabic & Mathematics Bidirectional Isolation Engine ──

export function formatMathAndArabic(raw: string): string {
  if (!raw) return ''
  const lines = raw.split('\n')
  return lines.map(line => {
    const text = line.trim()
    if (!text) return ''

    // Detect list numbering or bullet at beginning (e.g. "1.", "1-", "2.", "2-")
    const hasListNumber = /^(\d+[\.\-\)]\s*)/.test(text)
    const escaped = escapeHtml(text)

    // Math regex: matches equations and algebraic expressions
    // e.g. 2x + 7 = 22, 2(3 - x) = 14, (x + 2)(x + 5), x² + 7x + 12
    const mathRegex = /([0-9a-zA-Z\(\)\^²³_]+(?:\s*[\+\-\*\/=<>×÷±≤≥≠≈]\s*[0-9a-zA-Z\(\)\^²³_]+)+|\([a-zA-Z0-9\s\+\-\*\/×÷^²³]+\)(?:\s*\([a-zA-Z0-9\s\+\-\*\/×÷^²³]+\))*|[a-zA-Z][0-9a-zA-Z_]*\s*[²³]|[a-zA-Z]\s*=\s*[0-9a-zA-Z\+\-\*\/×÷\s\(\)\^²³]+)/g

    let formatted = escaped.replace(mathRegex, (match) => {
      if (/^\d+$/.test(match.trim())) return match
      return `<span dir="ltr" class="math-expr" style="unicode-bidi:isolate; display:inline-block; font-family:'Cambria Math','Times New Roman','Segoe UI',sans-serif; direction:ltr; text-align:left; font-weight:700; margin:0 4px;">${match.trim()}</span>`
    })

    if (hasListNumber) {
      formatted = '&rlm;' + formatted
    }

    return `<div style="text-align: right; direction: rtl; min-height: 1.4em;">${formatted}</div>`
  }).join('')
}

// ── Alerts & Notes (التنبيهات والملاحظات) Flexible Layout ──

export function buildNoticesAndWarningsRow(warnings?: string, notices?: string): string {
  const hasWarnings = Boolean(warnings && warnings.trim().length > 0)
  const hasNotices = Boolean(notices && notices.trim().length > 0)

  // Rule 5: When both sections are empty, omit row completely (no blank space or empty cards)
  if (!hasWarnings && !hasNotices) return ''

  const cleanWarnings = (warnings || '').trim()
  const cleanNotices = (notices || '').trim()

  let warningsFlex = '1 1 50%'
  let noticesFlex = '1 1 50%'

  if (hasWarnings && hasNotices) {
    // Rule 1, 2, 3: Proportional width calculation based on text lengths after wrapping
    const wLen = cleanWarnings.length
    const nLen = cleanNotices.length
    const total = wLen + nLen

    if (total > 0) {
      let wRatio = wLen / total
      // Clamp between 25% and 75% so neither side collapses
      wRatio = Math.max(0.25, Math.min(0.75, wRatio))
      const nRatio = 1 - wRatio
      warningsFlex = `${(wRatio * 100).toFixed(1)}%`
      noticesFlex = `${(nRatio * 100).toFixed(1)}%`
    }
  } else if (hasWarnings && !hasNotices) {
    // Rule 4: Only warnings has content -> spans 100% width
    warningsFlex = '1 1 100%'
  } else if (!hasWarnings && hasNotices) {
    // Rule 4: Only notices has content -> spans 100% width
    noticesFlex = '1 1 100%'
  }

  // Rule 7: Warnings box with crisp red border & clear title (for color & B&W printing)
  const warningsBox = hasWarnings ? `
    <div style="
      flex: ${warningsFlex};
      border: 1.5px solid #dc2626;
      border-radius: 8px;
      padding: 10px 14px;
      background: #ffffff;
      box-sizing: border-box;
      min-width: 0;
      display: flex;
      flex-direction: column;
    ">
      <div style="
        font-size: 13px;
        font-weight: 800;
        color: #dc2626;
        border-bottom: 1px solid #fecaca;
        padding-bottom: 5px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span>تنبيهات</span>
      </div>
      <div style="
        font-size: 12px;
        color: #1e293b;
        line-height: 1.6;
        word-break: break-word;
        flex: 1;
      ">
        ${formatMathAndArabic(cleanWarnings)}
      </div>
    </div>
  ` : ''

  // Rule 8: Notes box with neutral border matching subject cards
  const noticesBox = hasNotices ? `
    <div style="
      flex: ${noticesFlex};
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      background: #ffffff;
      box-sizing: border-box;
      min-width: 0;
      display: flex;
      flex-direction: column;
    ">
      <div style="
        font-size: 13px;
        font-weight: 800;
        color: #1e293b;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 5px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span>ملاحظات</span>
      </div>
      <div style="
        font-size: 12px;
        color: #334155;
        line-height: 1.6;
        word-break: break-word;
        flex: 1;
      ">
        ${formatMathAndArabic(cleanNotices)}
      </div>
    </div>
  ` : ''

  // Rule 9: RTL display order (warnings on the right, notices on the left)
  return `
    <div style="
      display: flex;
      gap: 10px;
      margin-top: 10px;
      align-items: stretch;
      width: 100%;
      box-sizing: border-box;
    ">
      ${warningsBox}
      ${noticesBox}
    </div>
  `
}

// ── Multi-Page A4 Landscape Sheet Builder ──

export function buildExportPages(data: HomeworkExportData): HTMLElement[] {
  // A4 Landscape standard dimensions: 297mm × 210mm (1122px × 794px at 96 DPI, 10mm margins = 38px)
  const itemsPerPage = 6
  const totalPages = Math.ceil(data.items.length / itemsPerPage) || 1
  const pages: HTMLElement[] = []

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1
    const pageItems = data.items.slice(i * itemsPerPage, (i + 1) * itemsPerPage)
    const isMultiPage = totalPages > 1

    const pageWrap = document.createElement('div')
    pageWrap.dir = 'rtl'
    pageWrap.className = 'a4-export-page'
    pageWrap.style.cssText = [
      'width: 1122px',
      'height: 794px',
      'padding: 38px',
      'box-sizing: border-box',
      'background: #ffffff',
      "font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
      'position: relative',
      'top: 0',
      'left: 0',
      'margin: 0',
      'color: #0f172a',
      'display: flex',
      'flex-direction: column',
      'justify-content: space-between',
      'letter-spacing: normal !important',
      'border: 1px solid #cbd5e1',
    ].join(';')

    // Top Header
    const headerHtml = `
      <div style="
        border-bottom: 2px solid #0f172a;
        padding-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
        box-sizing: border-box;
      ">
        <div style="text-align: right; line-height: 1.55; font-size: 11px; font-weight: 700; color: #334155;">
          <div>جمهورية العراق</div>
          <div>وزارة التربية</div>
          <div>المديرية العامة لتربية الانبار</div>
        </div>

        <div style="text-align: center; flex: 1; padding: 0 16px;">
          <div style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: normal; line-height: 1.2;">
            ${escapeHtml(data.schoolName)}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #475569; margin-top: 3px;">
            جدول التحاضير اليومية ${isMultiPage ? `(صفحة ${pageNum} من ${totalPages})` : ''}
          </div>
        </div>

        <div style="text-align: left; line-height: 1.75; font-size: 12px; font-weight: 600; color: #1e293b; direction: rtl;">
          <div><span style="color: #64748b; font-size: 11px; font-weight: 500;">التاريخ: </span><span dir="ltr" style="font-weight: 700;">${escapeHtml(data.date)}</span></div>
          <div><span style="color: #64748b; font-size: 11px; font-weight: 500;">الصف: </span><span style="font-weight: 700;">${escapeHtml(data.sectionName)}</span></div>
        </div>
      </div>
    `

    // Cards Grid (3 columns for 3, 5, 6+; 2 columns for 2 or 4)
    const cols = (pageItems.length === 2 || pageItems.length === 4) ? 2 : (pageItems.length <= 1 ? 1 : 3)
    const cardsHtml = pageItems.map(item => {
      const icon = getSubjectIcon(item.subject)
      const formattedBody = formatMathAndArabic(item.body)
      return `
        <div style="
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 9px 12px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          min-height: 140px;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #1e293b;
            padding-bottom: 6px;
            margin-bottom: 6px;
          ">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #0f172a; display: flex; align-items: center;">${icon}</span>
              <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${escapeHtml(item.subject)}</span>
            </div>
            <span style="font-size: 11.5px; font-weight: 600; color: #64748b; white-space: nowrap;">${escapeHtml(item.teacher)}</span>
          </div>
          <div style="
            flex: 1;
            font-size: 12.5px;
            color: #1e293b;
            line-height: 1.65;
            word-break: break-word;
          ">
            ${formattedBody}
          </div>
        </div>
      `
    }).join('')

    // Notices row appears on the final page of the document
    const noticesHtml = (pageNum === totalPages) ? buildNoticesAndWarningsRow(data.warnings, data.notices) : ''

    // Footer
    const footerHtml = `
      <div style="
        text-align: center;
        padding-top: 8px;
        font-size: 10px;
        color: #94a3b8;
        border-top: 1px solid #e2e8f0;
        width: 100%;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span>واجباتي · المنظومة الإلكترونية لإدارة الواجبات المدرسية</span>
        <span>${escapeHtml(data.schoolName)}</span>
        <span>${isMultiPage ? `صفحة ${pageNum} من ${totalPages}` : 'A4 أفقي'}</span>
      </div>
    `

    pageWrap.innerHTML = `
      <div>
        ${headerHtml}
        <div style="
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: 10px;
          margin-top: 12px;
        ">
          ${cardsHtml}
        </div>
        ${noticesHtml}
      </div>
      ${footerHtml}
    `

    pages.push(pageWrap)
  }

  return pages
}

// ── Offline Rendering & Export Functions ──

export async function renderCardToCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import('html-to-image')
  return toCanvas(card, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: 1122,
    height: 794,
  })
}


export function mountOffscreenHost(pages: HTMLElement[]): HTMLDivElement {
  const host = document.createElement("div")
  host.dir = 'rtl'
  host.setAttribute("aria-hidden", "true")
  host.style.cssText = [
    "position: fixed",
    "left: -99999px",
    "top: 0",
    "width: 1122px",
    `height: ${Math.max(794, 794 * pages.length)}px`,
    "overflow: hidden",
    "pointer-events: none",
    "z-index: -9999",
  ].join(";")
  pages.forEach(p => host.appendChild(p))
  document.body.appendChild(host)
  return host
}
async function loadBundledJsPDF(): Promise<typeof import('jspdf').jsPDF> {
  const mod = await import('jspdf')
  return mod.jsPDF || (mod as any).default?.jsPDF || (mod as any).default
}

export async function exportAsImage(data: HomeworkExportData): Promise<void> {
  const pages = buildExportPages(data)
  const host = mountOffscreenHost(pages)

  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 50))

    if (pages.length === 1) {
      const canvas = await renderCardToCanvas(pages[0])
      const link = document.createElement('a')
      link.download = `واجبات-${data.sectionName}-${data.date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } else {
      // Multi-page stitch vertically with subtle separator
      const canvases: HTMLCanvasElement[] = []
      for (const p of pages) {
        canvases.push(await renderCardToCanvas(p))
      }
      const combinedCanvas = document.createElement('canvas')
      combinedCanvas.width = canvases[0].width
      const gap = 30
      combinedCanvas.height = canvases.reduce((acc, c) => acc + c.height, 0) + (canvases.length - 1) * gap
      const ctx = combinedCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#f1f5f9'
        ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height)
        let currentY = 0
        for (const c of canvases) {
          ctx.drawImage(c, 0, currentY)
          currentY += c.height + gap
        }
        const link = document.createElement('a')
        link.download = `واجبات-${data.sectionName}-${data.date}.png`
        link.href = combinedCanvas.toDataURL('image/png')
        link.click()
      }
    }
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host)
    }
  }
}

export async function exportAsPDF(data: HomeworkExportData): Promise<void> {
  const pages = buildExportPages(data)
  const host = mountOffscreenHost(pages)

  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 50))

    const JsPDF = await loadBundledJsPDF()
    // Standard A4 Landscape: 297mm × 210mm
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    for (let i = 0; i < pages.length; i++) {
      const canvas = await renderCardToCanvas(pages[i])
      const imgData = canvas.toDataURL('image/png')
      if (i > 0) {
        pdf.addPage('a4', 'landscape')
      }
      // Add image precisely spanning the 297mm × 210mm landscape A4 page
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST')
    }

    pdf.save(`واجبات-${data.sectionName}-${data.date}.pdf`)
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host)
    }
  }
}
