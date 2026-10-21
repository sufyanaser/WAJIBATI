/**
 * A4 Homework Sheet Export Engine
 * Produces a portrait A4 image (1588×2246 px) using html-to-image.
 * For PDF: uses jsPDF if loaded on window; otherwise returns PNG bytes with
 * a .pdf-named blob so callers get a usable file even without the library.
 *
 * All styles are applied as inline `style` attributes — html-to-image strips
 * external CSS and <style> blocks. Fonts are Tahoma/Arial (system Arabic
 * fonts) to avoid cross-origin font-loading failures.
 */

import { toPng } from 'html-to-image'

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export interface ExportA4Options {
  /** 'YYYY-MM-DD' */
  date: string
  /** e.g. 'الصف الخامس علمي' */
  classLabel: string
  /** section letter, e.g. 'أ' */
  section: string
  /** subjectName → homeworkText (empty string if none) */
  homeworkBySubject: Record<string, string>
  publisherName: string
  notes?: string
  warnings?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const A4_W = 1588
const A4_H = 2246

/** Preferred subject order — names match the `subjects` table exactly */
const SUBJECT_ORDER = [
  'التربية الإسلامية',
  'اللغة العربية',
  'اللغة الإنكليزية',
  'الرياضيات',
  'الكيمياء',
  'الفيزياء',
  'الأحياء',
  'الحاسوب',
  'جرائم البعث',
  'التاريخ',
  'الجغرافية',
]

/** Unicode text icons per subject (no SVG — avoids rendering issues) */
const SUBJECT_ICON: Record<string, string> = {
  'التربية الإسلامية': '☽',
  'اللغة العربية':     '✒',
  'اللغة الإنكليزية': '🔤',
  'الرياضيات':         '∑',
  'الكيمياء':          '⚗',
  'الفيزياء':          '⚛',
  'الأحياء':           '🌿',
  'الحاسوب':           '💻',
  'جرائم البعث':       '📖',
  'التاريخ':           '📜',
  'الجغرافية':         '🗺',
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseDateParts(iso: string): { day: string; month: string; year: string } {
  const [year, month, day] = iso.split('-')
  return { day: day ?? '', month: month ?? '', year: year ?? '' }
}

// ---------------------------------------------------------------------------
// HTML template builder
// ---------------------------------------------------------------------------

function buildA4Html(opts: ExportA4Options): string {
  const { day, month, year } = parseDateParts(opts.date)

  // --- Top band ---
  const topBand = `
    <div style="
      display:flex;
      flex-direction:row-reverse;
      align-items:flex-start;
      padding:22px 28px 18px;
      gap:0;
    ">
      <!-- RIGHT: institution block -->
      <div style="
        flex:1;
        text-align:right;
        font-family:Tahoma,Arial,sans-serif;
        font-weight:700;
        font-size:13px;
        line-height:2;
        color:#14233A;
      ">
        <div>جمهورية العراق</div>
        <div>وزارة التربية</div>
        <div>المديرية العامة لتربية الأنبار</div>
        <div>إعدادية الرميلة للبنين</div>
      </div>

      <!-- CENTER: brand -->
      <div style="
        flex:0 0 auto;
        text-align:center;
        padding:0 32px;
        font-family:Tahoma,Arial,sans-serif;
        font-weight:900;
        font-size:36px;
        color:#153D70;
        line-height:1.1;
        align-self:center;
      ">واجباتي</div>

      <!-- LEFT: date/class fields -->
      <div style="
        flex:1;
        text-align:right;
        font-family:Tahoma,Arial,sans-serif;
        font-size:12px;
        color:#14233A;
        line-height:2.2;
        direction:rtl;
      ">
        <div style="border-bottom:1px solid #C9D5E4;padding-bottom:2px">
          التاريخ: اليوم ${day} / الشهر ${month} / السنة ${year}
        </div>
        <div style="border-bottom:1px solid #C9D5E4;padding-bottom:2px">
          الصف: ${opts.classLabel}
        </div>
        <div style="border-bottom:1px solid #C9D5E4;padding-bottom:2px">
          الشعبة: ${opts.section}
        </div>
      </div>
    </div>
  `

  // --- Decorative strip ---
  const strip = `
    <div style="display:flex;height:6px;width:100%">
      <div style="flex:0 0 60%;background:#153D70"></div>
      <div style="flex:0 0 40%;background:#E8B04A"></div>
    </div>
  `

  // --- Title block ---
  const titleBlock = `
    <div style="text-align:center;padding:16px 0 12px;font-family:Tahoma,Arial,sans-serif">
      <div style="font-size:22px;font-weight:700;color:#14233A">
        جدول الواجبات المنزلية
      </div>
      <div style="font-size:13px;color:#596D89;margin-top:6px">
        متابعة يومية منظّمة للواجبات والتعليمات الصفية
      </div>
    </div>
  `

  // --- Subject table ---
  // Order by SUBJECT_ORDER, then append any extra subjects not in that list
  const subjectKeys = Object.keys(opts.homeworkBySubject)
  const orderedSubjects = [
    ...SUBJECT_ORDER.filter(s => subjectKeys.includes(s)),
    ...subjectKeys.filter(s => !SUBJECT_ORDER.includes(s)),
  ]
  const rows = orderedSubjects.map(subject => {
    const hw = opts.homeworkBySubject[subject] ?? ''
    const icon = SUBJECT_ICON[subject] ?? '•'
    return `
      <tr>
        <td style="
          width:140px;
          padding:10px 12px;
          background:#EFF3FA;
          border-bottom:1px solid #C9D5E4;
          vertical-align:top;
          text-align:right;
          font-family:Tahoma,Arial,sans-serif;
          font-weight:700;
          font-size:14px;
          color:#153D70;
          white-space:nowrap;
        ">
          <span style="margin-left:6px">${icon}</span>${subject}
        </td>
        <td style="
          padding:10px 12px;
          background:#ffffff;
          border-bottom:1px solid #C9D5E4;
          vertical-align:top;
          text-align:right;
          font-family:Tahoma,Arial,sans-serif;
          font-size:13px;
          color:#14233A;
          white-space:pre-wrap;
          min-height:52px;
          word-break:break-word;
        ">${escapeHtml(hw)}</td>
      </tr>
    `
  }).join('')

  const subjectTable = `
    <table style="
      width:100%;
      border-collapse:collapse;
      margin:0 28px;
      width:calc(100% - 56px);
      direction:rtl;
    ">
      ${rows}
    </table>
  `

  // --- Notes row ---
  const notesRow = `
    <div style="
      display:flex;
      flex-direction:row-reverse;
      gap:12px;
      margin:14px 28px 0;
      direction:rtl;
    ">
      <div style="
        flex:1;
        border:1px solid #C9D5E4;
        padding:8px 12px;
        min-height:60px;
        font-family:Tahoma,Arial,sans-serif;
        font-size:13px;
        color:#14233A;
      ">
        <div style="font-weight:700;color:#153D70;margin-bottom:4px">
          <span style="color:#153D70;margin-left:4px">●</span>ملاحظات
        </div>
        <div style="white-space:pre-wrap">${escapeHtml(opts.notes ?? '')}</div>
      </div>
      <div style="
        flex:1;
        border:1px solid #C9D5E4;
        padding:8px 12px;
        min-height:60px;
        font-family:Tahoma,Arial,sans-serif;
        font-size:13px;
        color:#14233A;
      ">
        <div style="font-weight:700;color:#E8B04A;margin-bottom:4px">
          <span style="color:#E8B04A;margin-left:4px">●</span>تنبيهات
        </div>
        <div style="white-space:pre-wrap">${escapeHtml(opts.warnings ?? '')}</div>
      </div>
    </div>
  `

  // --- Footer ---
  const footer = `
    <div style="
      display:flex;
      flex-direction:row-reverse;
      justify-content:space-between;
      border-top:2px solid #153D70;
      padding:8px 28px;
      margin-top:14px;
      font-family:Tahoma,Arial,sans-serif;
      direction:rtl;
    ">
      <div style="font-size:12px;font-weight:700;color:#14233A">
        مسؤول إدخال البيانات والواجبات: ${escapeHtml(opts.publisherName)}
      </div>
      <div style="font-size:11px;color:#596D89">
        RANEEN — برمجة وتصميم
      </div>
    </div>
  `

  return `
    <div
      dir="rtl"
      style="
        width:${A4_W}px;
        min-height:${A4_H}px;
        background:#ffffff;
        box-sizing:border-box;
        position:absolute;
        left:-9999px;
        top:-9999px;
        overflow:hidden;
        font-family:Tahoma,Arial,sans-serif;
      "
    >
      ${topBand}
      ${strip}
      ${titleBlock}
      ${subjectTable}
      ${notesRow}
      ${footer}
    </div>
  `
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function renderToPng(opts: ExportA4Options): Promise<string> {
  const container = document.createElement('div')
  container.innerHTML = buildA4Html(opts)
  const sheet = container.firstElementChild as HTMLElement
  document.body.appendChild(sheet)
  try {
    const dataUrl = await toPng(sheet, {
      width: A4_W,
      height: A4_H,
      pixelRatio: 1,
      backgroundColor: '#ffffff',
    })
    return dataUrl
  } finally {
    document.body.removeChild(sheet)
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Renders the A4 homework sheet as a PNG and returns the raw image blob.
 */
export async function exportA4PNG(options: ExportA4Options): Promise<Blob> {
  const dataUrl = await renderToPng(options)
  return dataUrlToBlob(dataUrl)
}

/**
 * Renders the A4 homework sheet as a PDF blob.
 *
 * Uses jsPDF (loaded dynamically from CDN) when available; otherwise returns
 * the PNG image wrapped in a Blob with type 'application/pdf' so the caller
 * can still trigger a download — note that this fallback PNG-as-PDF will not
 * render as a true PDF in all viewers.
 */
export async function exportA4PDF(options: ExportA4Options): Promise<Blob> {
  const dataUrl = await renderToPng(options)

  // Try to use jsPDF if it happens to be available on window
  // (loaded externally by the app — jsPDF is not a listed dependency)
  const win = window as unknown as Record<string, unknown>
  const jspdf = win['jspdf'] as { jsPDF?: new (opts: Record<string, unknown>) => unknown } | undefined
  const JsPDF = jspdf?.jsPDF

  if (JsPDF) {
    // A4 dimensions in mm: 210 × 297
    const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as {
      internal: { pageSize: { getWidth(): number; getHeight(): number } }
      addImage(data: string, fmt: string, x: number, y: number, w: number, h: number): void
      output(type: 'blob'): Blob
    }
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH)
    return pdf.output('blob')
  }

  // Fallback: return PNG blob (jsPDF not available)
  // The caller should name the download with a .pdf extension;
  // browsers may open it as an image instead of a PDF document.
  return dataUrlToBlob(dataUrl)
}
