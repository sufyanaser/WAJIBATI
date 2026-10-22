/**
 * A4 Homework Sheet Export Engine
 * Produces a portrait A4 image (1588×2246 px) using html-to-image.
 * All styles are inline — html-to-image strips external CSS and <style> blocks.
 * Fonts: Tahoma/Arial (system Arabic fonts) to avoid cross-origin failures.
 */

import { toPng } from 'html-to-image'

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export interface HomeworkItem {
  subject: string
  text: string
}

export interface ExportA4Options {
  /** 'YYYY-MM-DD' */
  date: string
  /** e.g. 'الصف الخامس علمي' */
  classLabel: string
  /** section letter, e.g. 'أ' */
  section: string
  /** Ordered by timetable period (period 1 first) */
  homeworkItems: HomeworkItem[]
  publisherName: string
  /** Base64 data URI for the app icon (icon-192.png) */
  logoDataUrl?: string
  notes?: string
  warnings?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const A4_W = 1588
const A4_H = 2246

/** Unicode text icons per subject */
const SUBJECT_ICON: Record<string, string> = {
  'التربية الإسلامية': '☽',
  'اللغة العربية':     '✒',
  'اللغة الإنكليزية': '☰',
  'الرياضيات':         '÷',
  'الكيمياء':          '⚗',
  'الفيزياء':          '⚙',
  'الأحياء':           '🌿',
  'الحاسوب':           '⌨',
  'جرائم البعث':       '🏛',
  'جرائم حزب البعث':   '🏛',
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// HTML template builder
// ---------------------------------------------------------------------------

function buildA4Html(opts: ExportA4Options): string {
  const { day, month, year } = parseDateParts(opts.date)

  // --- Header logo — center column ---
  const logoHtml = opts.logoDataUrl
    ? `<img src="${opts.logoDataUrl}" alt="واجباتي" style="width:96px;height:96px;object-fit:contain;display:block;margin:0 auto 8px" />`
    : `<div style="width:96px;height:96px;margin:0 auto 8px;background:#153D70;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:40px">📚</div>`

  // --- Top header (3 columns, RTL) ---
  const header = `
    <div style="
      display:flex;
      flex-direction:row;
      align-items:flex-start;
      padding:24px 36px 20px;
      gap:0;
      direction:rtl;
    ">
      <!-- RIGHT: institution block -->
      <div style="
        flex:1;
        text-align:right;
        font-family:Tahoma,Arial,sans-serif;
        line-height:1.9;
        color:#14233A;
      ">
        <div style="font-weight:700;font-size:15px">جمهورية العراق</div>
        <div style="font-weight:700;font-size:14px">وزارة التربية</div>
        <div style="font-weight:700;font-size:13px">المديرية العامة لتربية الأنبار</div>
        <div style="font-weight:700;font-size:14px">إعدادية الرميلة للبنين</div>
      </div>

      <!-- CENTER: logo + brand name -->
      <div style="
        flex:0 0 200px;
        text-align:center;
        padding:0 24px;
        font-family:Tahoma,Arial,sans-serif;
      ">
        ${logoHtml}
        <div style="font-weight:900;font-size:28px;color:#153D70;line-height:1">واجباتي</div>
      </div>

      <!-- LEFT: date/class/section fields -->
      <div style="
        flex:1;
        text-align:right;
        font-family:Tahoma,Arial,sans-serif;
        font-size:13px;
        color:#14233A;
        direction:rtl;
        padding-top:8px;
      ">
        <div style="margin-bottom:12px">
          <span style="font-weight:700;color:#153D70">التاريخ</span>
          <span style="display:inline-block;border-bottom:1.5px solid #8CA0BE;min-width:200px;padding-bottom:2px;margin-right:6px">
            اليوم ${day} / الشهر ${month} / السنة ${year}
          </span>
        </div>
        <div style="margin-bottom:12px">
          <span style="font-weight:700;color:#153D70">الصف</span>
          <span style="display:inline-block;border-bottom:1.5px solid #8CA0BE;min-width:200px;padding-bottom:2px;margin-right:6px">
            ${escapeHtml(opts.classLabel)}
          </span>
        </div>
        <div>
          <span style="font-weight:700;color:#153D70">الشعبة</span>
          <span style="display:inline-block;border-bottom:1.5px solid #8CA0BE;min-width:200px;padding-bottom:2px;margin-right:6px">
            ${escapeHtml(opts.section)}
          </span>
        </div>
      </div>
    </div>
  `

  // --- Decorative color strip ---
  const strip = `
    <div style="display:flex;height:10px;width:100%;margin-bottom:0">
      <div style="flex:0 0 60%;background:#153D70"></div>
      <div style="flex:0 0 15%;background:#C0392B"></div>
      <div style="flex:0 0 25%;background:#E8B04A"></div>
    </div>
  `

  // --- Title block ---
  const titleBlock = `
    <div style="text-align:center;padding:20px 0 14px;font-family:Tahoma,Arial,sans-serif">
      <div style="font-size:30px;font-weight:700;color:#14233A">
        جدول الواجبات المنزلية
      </div>
      <div style="font-size:14px;color:#596D89;margin-top:6px">
        متابعة يومية منظّمة للواجبات والتعليمات الصفية
      </div>
    </div>
  `

  // --- Subject table rows ---
  const rows = opts.homeworkItems.map(item => {
    const icon = SUBJECT_ICON[item.subject] ?? '•'
    return `
      <tr>
        <td style="
          width:160px;
          padding:12px 14px;
          background:#153D70;
          border-bottom:2px solid #ffffff;
          vertical-align:middle;
          text-align:right;
          font-family:Tahoma,Arial,sans-serif;
          font-weight:700;
          font-size:14px;
          color:#ffffff;
          white-space:nowrap;
          line-height:1.5;
        ">
          <div style="font-size:22px;margin-bottom:4px">${icon}</div>
          <div>${escapeHtml(item.subject)}</div>
        </td>
        <td style="
          padding:12px 16px;
          background:#ffffff;
          border-bottom:1px solid #D0DCE8;
          vertical-align:top;
          text-align:right;
          font-family:Tahoma,Arial,sans-serif;
          font-size:14px;
          color:#14233A;
          white-space:pre-wrap;
          word-break:break-word;
          direction:rtl;
          min-height:56px;
          line-height:1.7;
        ">${item.text ? escapeHtml(item.text) : '<span style="color:#9AA8B5;font-style:italic">يُكتب نص الواجب هنا بوضوح، مع ذكر الصفحات أو التمرين عند الحاجة.</span>'}</td>
      </tr>
    `
  }).join('')

  const subjectTable = `
    <div style="padding:0 28px;direction:rtl">
      <table style="
        width:100%;
        border-collapse:collapse;
        border:1.5px solid #C9D5E4;
        border-radius:6px;
        overflow:hidden;
      ">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `

  // --- Notes + Warnings boxes ---
  const notesRow = `
    <div style="
      display:flex;
      flex-direction:row;
      gap:16px;
      margin:18px 28px 0;
      direction:rtl;
    ">
      <!-- ملاحظات (right) -->
      <div style="
        flex:1;
        border:1.5px solid #C9D5E4;
        border-radius:6px;
        padding:12px 14px;
        min-height:80px;
        font-family:Tahoma,Arial,sans-serif;
        font-size:13px;
        color:#14233A;
        background:#FAFBFD;
      ">
        <div style="font-weight:700;font-size:14px;color:#153D70;margin-bottom:8px">
          <span style="color:#153D70;margin-left:6px;font-size:16px">●</span>ملاحظات
        </div>
        <div style="white-space:pre-wrap;color:#596D89;font-style:italic">
          ${opts.notes ? escapeHtml(opts.notes) : 'تُدوّن هنا الملاحظات العامة أو ما يحتاج إلى متابعة.'}
        </div>
      </div>
      <!-- تنبيهات (left) -->
      <div style="
        flex:1;
        border:1.5px solid #C9D5E4;
        border-radius:6px;
        padding:12px 14px;
        min-height:80px;
        font-family:Tahoma,Arial,sans-serif;
        font-size:13px;
        color:#14233A;
        background:#FAFBFD;
      ">
        <div style="font-weight:700;font-size:14px;color:#E8B04A;margin-bottom:8px">
          <span style="color:#E8B04A;margin-left:6px;font-size:16px">●</span>تنبيهات
        </div>
        <div style="white-space:pre-wrap;color:#596D89;font-style:italic">
          ${opts.warnings ? escapeHtml(opts.warnings) : 'تُدوّن هنا التنبيهات المهمة ومواعيد التسليم.'}
        </div>
      </div>
    </div>
  `

  // --- Footer ---
  const footer = `
    <div style="
      display:flex;
      flex-direction:row;
      justify-content:space-between;
      align-items:center;
      border-top:2.5px solid #153D70;
      padding:10px 28px;
      margin-top:18px;
      font-family:Tahoma,Arial,sans-serif;
      direction:rtl;
    ">
      <div style="font-size:13px;font-weight:700;color:#14233A">
        مسؤول إدخال البيانات والواجبات: <span style="color:#153D70">${escapeHtml(opts.publisherName)}</span>
      </div>
      <div style="
        display:flex;
        align-items:center;
        gap:8px;
        direction:ltr;
      ">
        <div style="
          width:36px;height:36px;
          background:#C0392B;
          border-radius:6px;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;color:#fff;font-weight:900;
          font-family:Arial,sans-serif;
        ">R</div>
        <div style="text-align:left">
          <div style="font-size:13px;font-weight:700;color:#C0392B;font-family:Arial,sans-serif">RANEEN</div>
          <div style="font-size:10px;color:#596D89;font-family:Tahoma,Arial,sans-serif">برمجة وتصميم</div>
        </div>
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
      ${header}
      ${strip}
      ${titleBlock}
      ${subjectTable}
      ${notesRow}
      ${footer}
    </div>
  `
}

// ---------------------------------------------------------------------------
// Logo fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and returns a base64 data URI suitable for embedding in HTML.
 * Returns undefined on failure so callers can fall back gracefully.
 */
export async function fetchAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const blob = await res.blob()
    return new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

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
// jsPDF loader (CDN)
// ---------------------------------------------------------------------------

type JsPDFClass = {
  internal: { pageSize: { getWidth(): number; getHeight(): number } }
  addImage(data: string, fmt: string, x: number, y: number, w: number, h: number): void
  output(type: 'blob'): Blob
}

async function loadJsPDF(): Promise<(new (opts: Record<string, unknown>) => JsPDFClass) | null> {
  const win = window as unknown as Record<string, unknown>
  // Already loaded?
  const existing = win['jspdf'] as { jsPDF?: new (opts: Record<string, unknown>) => JsPDFClass } | undefined
  if (existing?.jsPDF) return existing.jsPDF

  return new Promise(resolve => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => {
      const loaded = win['jspdf'] as { jsPDF?: new (opts: Record<string, unknown>) => JsPDFClass } | undefined
      resolve(loaded?.jsPDF ?? null)
    }
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Renders the A4 homework sheet as a PNG blob.
 */
export async function exportA4PNG(options: ExportA4Options): Promise<Blob> {
  const dataUrl = await renderToPng(options)
  return dataUrlToBlob(dataUrl)
}

/**
 * Renders the A4 homework sheet as a true PDF blob (A4 portrait).
 * Loads jsPDF from CDN if not already on window; falls back to PNG-wrapped blob.
 */
export async function exportA4PDF(options: ExportA4Options): Promise<Blob> {
  const dataUrl = await renderToPng(options)
  const JsPDF = await loadJsPDF()

  if (JsPDF) {
    const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH)
    return pdf.output('blob')
  }

  // Fallback: return PNG as blob (jsPDF CDN unavailable)
  return dataUrlToBlob(dataUrl)
}

/**
 * @deprecated Use homeworkItems (ordered array) instead.
 * Converts a Record<string, string> to HomeworkItem[] in insertion order.
 */
export function homeworkRecordToItems(record: Record<string, string>): HomeworkItem[] {
  return Object.entries(record).map(([subject, text]) => ({ subject, text }))
}
