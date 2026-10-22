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

// Minimal inline SVG icons keyed by subject keyword (Arabic)
const SUBJECT_ICONS: Record<string, string> = {
  رياضيات: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  فيزياء: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>`,
  كيمياء: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3h6v7l4 11H5L9 10V3z"/><line x1="9" y1="3" x2="15" y2="3"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="14" cy="14" r="1" fill="currentColor"/></svg>`,
  احياء: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  أحياء: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  عربي: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  انجليزي: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>`,
  إنجليزي: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>`,
  اسلامي: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="none" stroke="currentColor" stroke-width="1.5" transform="scale(0.4) translate(18,6)"/></svg>`,
  إسلامي: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  تاريخ: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  جغرافي: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  اقتصاد: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>`,
  فلسف: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  وطني: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  حاسوب: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  رياضي: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  بعث: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
}

function getSubjectIcon(subject: string): string {
  for (const [key, svg] of Object.entries(SUBJECT_ICONS)) {
    if (subject.includes(key)) return svg
  }
  // Default: book icon
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
}

// Local offline rendering utilities (bundled via npm, zero CDN dependencies)
async function renderCardToCanvas(card: HTMLElement): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import('html-to-image')
  return toCanvas(card, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  })
}

async function loadBundledJsPDF(): Promise<typeof import('jspdf').jsPDF> {
  const mod = await import('jspdf')
  return mod.jsPDF || (mod as any).default?.jsPDF || (mod as any).default
}

function gridCols(count: number): number {
  if (count <= 3) return count
  if (count === 4) return 4
  if (count <= 6) return 3
  return 4
}

function buildExportCard(data: HomeworkExportData): HTMLElement {
  const wrap = document.createElement('div')
  wrap.dir = 'rtl'
  wrap.style.cssText = [
    'width:1100px',
    'background:#ffffff',
    "font-family:'Tajawal','Arial',sans-serif",
    'position:fixed',
    'top:-9999px',
    'left:-9999px',
    'color:#111',
    'border:1.5px solid #bbb',
    'box-sizing:border-box',
  ].join(';')

  const cols = gridCols(data.items.length)

  const subjectCards = data.items.map(item => {
    const icon = getSubjectIcon(item.subject)
    return `
      <div style="
        border:1px solid #ccc;
        border-radius:6px;
        padding:12px 14px;
        min-height:120px;
        display:flex;
        flex-direction:column;
        gap:6px;
        break-inside:avoid;
      ">
        <div style="display:flex;align-items:center;gap:7px;border-bottom:1.5px solid #222;padding-bottom:7px;margin-bottom:4px">
          <span style="color:#111;flex-shrink:0;display:flex;align-items:center">${icon}</span>
          <span style="font-size:14px;font-weight:800;color:#111">${item.subject}</span>
          <span style="font-size:11px;color:#666;margin-right:auto">${item.teacher}</span>
        </div>
        <div style="flex:1;font-size:13px;color:#222;line-height:1.7">${item.body || ''}</div>
      </div>
    `
  }).join('')

  const noticesRow = `
    <div style="display:grid;grid-template-columns:1fr 220px;gap:8px;margin-top:8px">
      <div style="border:1px solid #ccc;border-radius:6px;padding:12px 14px;min-height:60px">
        <div style="font-size:12px;font-weight:800;color:#111;border-bottom:1px solid #ccc;padding-bottom:5px;margin-bottom:6px">ملاحظات</div>
        <div style="font-size:12px;color:#333;line-height:1.6">${data.notices || ''}</div>
      </div>
      <div style="border:1.5px solid #c0392b;border-radius:6px;padding:12px 14px;min-height:60px">
        <div style="font-size:12px;font-weight:800;color:#c0392b;border-bottom:1px solid #f5c6c6;padding-bottom:5px;margin-bottom:6px">تنبيهات</div>
        <div style="font-size:12px;color:#333;line-height:1.6">${data.warnings || ''}</div>
      </div>
    </div>
  `

  wrap.innerHTML = `
    <!-- Official header -->
    <div style="
      border-bottom:2px solid #111;
      padding:14px 20px 12px;
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
    ">
      <div style="text-align:right;line-height:1.75;font-size:11px;color:#333">
        <div>جمهورية العراق</div>
        <div>وزارة التربية</div>
        <div>المديرية العامة لتربية الانبار</div>
      </div>

      <div style="text-align:center;flex:1;padding:0 16px">
        <div style="font-size:20px;font-weight:900;color:#111;letter-spacing:0.3px">
          اعدادية الرميلة للبنين
        </div>
        <div style="font-size:13px;font-weight:700;color:#333;margin-top:2px">
          جدول التحاضير اليومية
        </div>
      </div>

      <div style="text-align:left;line-height:1.9;font-size:12px;color:#111">
        <div><span style="color:#555;font-size:11px">التاريخ: </span>${data.date}</div>
        <div><span style="color:#555;font-size:11px">الصف: </span>${data.sectionName}</div>
      </div>
    </div>

    <!-- Subject grid -->
    <div style="padding:14px 18px 0">
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">
        ${subjectCards}
      </div>
      ${noticesRow}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:8px 18px;font-size:9px;color:#aaa;border-top:1px solid #ddd;margin-top:10px">
      واجباتي · ${data.schoolName}
    </div>
  `

  return wrap
}

export async function exportAsImage(data: HomeworkExportData): Promise<void> {
  const card = buildExportCard(data)
  document.body.appendChild(card)
  try {
    const canvas = await renderCardToCanvas(card)
    const link = document.createElement('a')
    link.download = `واجبات-${data.sectionName}-${data.date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    document.body.removeChild(card)
  }
}

export async function exportAsPDF(data: HomeworkExportData): Promise<void> {
  const card = buildExportCard(data)
  document.body.appendChild(card)
  try {
    const [canvas, JsPDF] = await Promise.all([
      renderCardToCanvas(card),
      loadBundledJsPDF(),
    ])
    const imgData = canvas.toDataURL('image/png')
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = (canvas.height * pdfW) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
    pdf.save(`واجبات-${data.sectionName}-${data.date}.pdf`)
  } finally {
    document.body.removeChild(card)
  }
}
