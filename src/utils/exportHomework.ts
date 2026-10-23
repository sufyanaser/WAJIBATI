import type { SchoolSettings } from '../services/schoolSettings'
import { DEFAULT_SCHOOL_SETTINGS } from '../services/schoolSettings'

export interface HomeworkExportData {
  schoolName?: string
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
  settings?: Partial<SchoolSettings>
}

// ── SVG Subject Icons (Clean 18×18 stroke for crisp official document print) ──

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
    const mathRegex = /([0-9a-zA-Z\(\)\^²³_]+(?:\s*[\+\-\*\/=<>×÷±≤≥≠≈]\s*[0-9a-zA-Z\(\)\^²³_]+)+|\([a-zA-Z0-9\s\+\-\*\/×÷^²³]+\)(?:\s*\([a-zA-Z0-9\s\+\-\*\/×÷^²³]+\))*|[a-zA-Z][0-9a-zA-Z_]*\s*[²³]|[a-zA-Z]\s*=\s*[0-9a-zA-Z\+\-\*\/×÷\s\(\)\^²³]+)/g

    let formatted = escaped.replace(mathRegex, (match) => {
      if (/^\d+$/.test(match.trim())) return match
      return `<span dir="ltr" class="math-expr" style="unicode-bidi:isolate; display:inline-block; font-family:'Cambria Math','Times New Roman','Segoe UI',sans-serif; direction:ltr; text-align:left; font-weight:700; margin:0 4px;">${match.trim()}</span>`
    })

    if (hasListNumber) {
      formatted = '&rlm;' + formatted
    }

    return `<div style="text-align: right; direction: rtl; min-height: 1.4em; word-break: break-word;">${formatted}</div>`
  }).join('')
}

// ── Alerts & Notes (التنبيهات والملاحظات) Flexible Layout ──

export function buildNoticesAndWarningsRow(warnings?: string, notices?: string): string {
  const hasWarnings = Boolean(warnings && warnings.trim().length > 0)
  const hasNotices = Boolean(notices && notices.trim().length > 0)

  if (!hasWarnings && !hasNotices) return ''

  const cleanWarnings = (warnings || '').trim()
  const cleanNotices = (notices || '').trim()

  let warningsFlex = '1 1 50%'
  let noticesFlex = '1 1 50%'

  if (hasWarnings && hasNotices) {
    const wLen = cleanWarnings.length
    const nLen = cleanNotices.length
    const total = wLen + nLen

    if (total > 0) {
      let wRatio = wLen / total
      wRatio = Math.max(0.25, Math.min(0.75, wRatio))
      const nRatio = 1 - wRatio
      warningsFlex = `${(wRatio * 100).toFixed(1)}%`
      noticesFlex = `${(nRatio * 100).toFixed(1)}%`
    }
  } else if (hasWarnings && !hasNotices) {
    warningsFlex = '1 1 100%'
  } else if (!hasWarnings && hasNotices) {
    noticesFlex = '1 1 100%'
  }

  const warningsBox = hasWarnings ? `
    <div style="
      flex: ${warningsFlex};
      border: 1.5px solid #dc2626;
      border-radius: 6px;
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
        padding-bottom: 4px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span>● تنبيهات هامة</span>
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

  const noticesBox = hasNotices ? `
    <div style="
      flex: ${noticesFlex};
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
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
        padding-bottom: 4px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span>● ملاحظات عامة</span>
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

  return `
    <div style="
      display: flex;
      gap: 12px;
      margin-top: 14px;
      align-items: stretch;
      width: 100%;
      box-sizing: border-box;
      direction: rtl;
    ">
      ${warningsBox}
      ${noticesBox}
    </div>
  `
}

// ── Asset Preloaders (Data URL caches) ──

let cachedAppLogoUrl: string | null = null
let cachedRaneenLogoUrl: string | null = null

export async function fetchAsDataUrl(url: string): Promise<string> {
  if (typeof window === 'undefined') return ''
  try {
    const fullUrl = (typeof window !== 'undefined' && window.location?.origin && url.startsWith('/') && !window.location.origin.includes('://localhost') && !window.location.origin.includes('null'))
      ? window.location.origin + url
      : url
    const res = await fetch(fullUrl)
    if (!res.ok) return ''
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string) || '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

async function getAppLogoDataUrl(): Promise<string> {
  if (cachedAppLogoUrl) return cachedAppLogoUrl
  cachedAppLogoUrl = await fetchAsDataUrl('/icon-512.png')
  if (!cachedAppLogoUrl) {
    cachedAppLogoUrl = await fetchAsDataUrl('/icon-192.png')
  }
  return cachedAppLogoUrl
}

async function getRaneenLogoDataUrl(): Promise<string> {
  if (cachedRaneenLogoUrl) return cachedRaneenLogoUrl
  cachedRaneenLogoUrl = await fetchAsDataUrl('/raneen-logo.png')
  return cachedRaneenLogoUrl
}

// ── Format Arabic Date ──

function formatArabicDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('ar-IQ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Multi-Page A4 Portrait Official Document Sheet Builder ──

export function buildExportPages(
  data: HomeworkExportData,
  options?: { appLogoDataUrl?: string; raneenLogoDataUrl?: string }
): HTMLElement[] {
  // A4 Portrait standard dimensions: 210mm × 297mm (794px × 1123px at 96 DPI)
  const itemsPerPage = 6
  const totalPages = Math.ceil(data.items.length / itemsPerPage) || 1
  const pages: HTMLElement[] = []

  const appLogoSrc = options?.appLogoDataUrl || cachedAppLogoUrl || '/icon-512.png'
  const raneenLogoSrc = options?.raneenLogoDataUrl || cachedRaneenLogoUrl || '/raneen-logo.png'

  const school = {
    ...DEFAULT_SCHOOL_SETTINGS,
    ...(data.settings || {}),
    name: data.schoolName || data.settings?.name || DEFAULT_SCHOOL_SETTINGS.name,
  }

  const dateArabic = formatArabicDate(data.date)

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1
    const pageItems = data.items.slice(i * itemsPerPage, (i + 1) * itemsPerPage)
    const isMultiPage = totalPages > 1

    const pageWrap = document.createElement('div')
    pageWrap.dir = 'rtl'
    pageWrap.className = 'a4-export-page-portrait'
    pageWrap.style.cssText = [
      'width: 794px',
      'height: 1123px',
      'min-height: 1123px',
      'max-height: 1123px',
      'padding: 34px 38px 28px 38px',
      'box-sizing: border-box',
      'background: #ffffff',
      "font-family: 'Tajawal', 'Cairo', Tahoma, Arial, sans-serif",
      'position: relative',
      'top: 0px',
      'left: 0px',
      'margin: 0',
      'color: #0f172a',
      'display: flex',
      'flex-direction: column',
      'justify-content: space-between',
      'letter-spacing: normal !important',
      'border: 1px solid #cbd5e1',
      'overflow: hidden',
    ].join(';')

    // Top Header (3 strictly bounded balanced zones)
    const headerHtml = `
      <div style="
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        padding-bottom: 12px;
        direction: rtl;
      ">
        <!-- RIGHT ZONE: Official Authority Info (36%) -->
        <div style="
          width: 36%;
          text-align: right;
          font-size: 11.5px;
          color: #1e293b;
          line-height: 1.6;
        ">
          <div style="font-weight: 800; font-size: 12px; color: #0f172a;">${escapeHtml(school.country)}</div>
          <div style="font-weight: 700;">${escapeHtml(school.ministry)}</div>
          <div style="font-weight: 700; font-size: 11px; color: #334155;">${escapeHtml(school.directorate)}</div>
          <div style="font-weight: 900; font-size: 13px; color: #153D70; margin-top: 2px;">${escapeHtml(school.name)}</div>
        </div>

        <!-- CENTER ZONE: Wajibati Official Logo & Brand (28%) -->
        <div style="
          width: 28%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        ">
          ${appLogoSrc
            ? `<img src="${appLogoSrc}" width="54" height="54" alt="واجباتي" style="width: 54px !important; height: 54px !important; max-width: 54px !important; max-height: 54px !important; object-fit: contain; display: block; margin: 0 auto 3px;" />`
            : `<div style="font-size: 32px; line-height: 1;">📚</div>`
          }
          <div style="font-size: 17px; font-weight: 900; color: #153D70; line-height: 1.1; letter-spacing: -0.3px;">واجباتي</div>
        </div>

        <!-- LEFT ZONE: Schedule Details (36%) -->
        <div style="
          width: 36%;
          text-align: left;
          font-size: 11.5px;
          color: #1e293b;
          line-height: 1.65;
          direction: rtl;
        ">
          <div><span style="color: #64748b; font-size: 11px; font-weight: 600;">التاريخ: </span><span style="font-weight: 800; color: #0f172a;">${escapeHtml(dateArabic)}</span></div>
          <div><span style="color: #64748b; font-size: 11px; font-weight: 600;">الصف: </span><span style="font-weight: 800; color: #153D70;">${escapeHtml(data.sectionName)}</span></div>
          <div><span style="color: #64748b; font-size: 11px; font-weight: 600;">الموافق: </span><span dir="ltr" style="font-weight: 700; color: #475569;">${escapeHtml(data.date)}</span></div>
        </div>
      </div>

      <!-- Document Title Bar -->
      <div style="
        border-top: 2px solid #1e293b;
        border-bottom: 1.5px solid #cbd5e1;
        padding: 6px 0;
        margin-bottom: 12px;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: #f8fafc;
      ">
        <h2 style="
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0;
        ">
          جدول الواجبات المنزلية اليومية
        </h2>
        ${isMultiPage ? `<span style="font-size: 12px; font-weight: 700; color: #64748b;">(صفحة ${pageNum} من ${totalPages})</span>` : ''}
      </div>
    `

    // Table rows
    const rowsHtml = pageItems.map((item, idx) => {
      const icon = getSubjectIcon(item.subject)
      const formattedBody = formatMathAndArabic(item.body)
      const isAlt = idx % 2 === 1
      const periodLabel = item.period ? `الحصة ${item.period}` : ''

      return `
        <tr style="background: ${isAlt ? '#fcfdfe' : '#ffffff'};">
          <!-- Subject Column (26%) -->
          <td style="
            width: 26%;
            padding: 9px 12px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            text-align: right;
            box-sizing: border-box;
          ">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="color: #153D70; display: inline-flex; align-items: center;">${icon}</span>
              <span style="font-size: 13.5px; font-weight: 800; color: #0f172a;">${escapeHtml(item.subject)}</span>
            </div>
            ${item.teacher && item.teacher !== 'غير محدد' ? `
              <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">
                م. ${escapeHtml(item.teacher)}
              </div>
            ` : ''}
            ${periodLabel ? `
              <span style="
                display: inline-block;
                background: #f1f5f9;
                color: #475569;
                font-size: 9.5px;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 4px;
                margin-top: 4px;
                border: 1px solid #e2e8f0;
              ">
                ${periodLabel}
              </span>
            ` : ''}
          </td>

          <!-- Homework Body Column (74%) -->
          <td style="
            width: 74%;
            padding: 9px 14px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            text-align: right;
            direction: rtl;
            font-size: 12.5px;
            line-height: 1.65;
            color: #1e293b;
            box-sizing: border-box;
          ">
            ${formattedBody || '<span style="color: #94a3b8; font-style: italic;">لا يوجد واجب مسجل</span>'}
          </td>
        </tr>
      `
    }).join('')

    const tableHtml = `
      <table style="
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #cbd5e1;
        direction: rtl;
        box-sizing: border-box;
        table-layout: fixed;
      ">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="
              width: 26%;
              padding: 8px 12px;
              text-align: right;
              font-size: 12.5px;
              font-weight: 800;
              color: #0f172a;
              border: 1px solid #cbd5e1;
            ">
              المادة الدراسية
            </th>
            <th style="
              width: 74%;
              padding: 8px 14px;
              text-align: right;
              font-size: 12.5px;
              font-weight: 800;
              color: #0f172a;
              border: 1px solid #cbd5e1;
            ">
              الواجب المطلوب والتعليمات الصفية
            </th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `

    // Notices and Warnings: rendered on the last page of the document
    const noticesHtml = (pageNum === totalPages)
      ? buildNoticesAndWarningsRow(data.warnings, data.notices)
      : ''

    // Footer with Official Disclaimer and Raneen Company Logo
    const footerHtml = `
      <div style="
        border-top: 1.5px solid #cbd5e1;
        padding-top: 10px;
        width: 100%;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: center;
        direction: rtl;
        font-size: 10.5px;
      ">
        <!-- Right: Official Responsibility Statement -->
        <div style="color: #475569; font-weight: 600;">
          ${escapeHtml(school.disclaimer)}
        </div>

        <!-- Center: Multi-page / Document mark -->
        <div style="color: #94a3b8; font-size: 10px; font-weight: 600;">
          ${isMultiPage ? `صفحة ${pageNum} من ${totalPages}` : 'وثيقة مدرسية معتمدة'}
        </div>

        <!-- Left: Raneen Logo & Brand -->
        <div style="display: flex; align-items: center; gap: 6px; direction: ltr;">
          ${raneenLogoSrc ? `
            <img
              src="${raneenLogoSrc}"
              width="80"
              height="22"
              alt="RANEEN"
              style="height: 22px !important; width: auto !important; max-height: 22px !important; object-fit: contain; display: block;"
            />
          ` : `
            <span style="font-weight: 800; color: #1e293b; font-size: 11px; letter-spacing: 0.5px;">RANEEN</span>
          `}
        </div>
      </div>
    `

    pageWrap.innerHTML = `
      <div style="display: flex; flex-direction: column; width: 100%;">
        ${headerHtml}
        ${tableHtml}
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
    width: 794,
    height: 1123,
  })
}

export function mountOffscreenHost(pages: HTMLElement[]): HTMLDivElement {
  const host = document.createElement('div')
  host.dir = 'rtl'
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = [
    'position: fixed',
    'left: -99999px',
    'top: 0',
    'width: 794px',
    `height: ${Math.max(1123, 1123 * pages.length)}px`,
    'overflow: hidden',
    'pointer-events: none',
    'z-index: -9999',
  ].join(';')
  pages.forEach(p => host.appendChild(p))
  document.body.appendChild(host)
  return host
}

async function loadBundledJsPDF(): Promise<typeof import('jspdf').jsPDF> {
  const mod = await import('jspdf')
  return mod.jsPDF || (mod as any).default?.jsPDF || (mod as any).default
}

export async function exportAsImage(data: HomeworkExportData): Promise<void> {
  const [appLogoDataUrl, raneenLogoDataUrl] = await Promise.all([
    getAppLogoDataUrl(),
    getRaneenLogoDataUrl(),
  ])
  const pages = buildExportPages(data, { appLogoDataUrl, raneenLogoDataUrl })
  const host = mountOffscreenHost(pages)

  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 60))

    const safeSection = (data.sectionName || '').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
    const fileName = `واجبات-${safeSection}-${data.date}.png`
    const { saveOrShareFile } = await import('./fileSaver')

    if (pages.length === 1) {
      const canvas = await renderCardToCanvas(pages[0])
      const dataUrl = canvas.toDataURL('image/png')
      await saveOrShareFile({
        filename: fileName,
        base64Data: dataUrl.split(',')[1],
        mimeType: 'image/png',
        dialogTitle: 'تصدير كشف الواجبات كصورة A4',
      })
    } else {
      // Multi-page stitch vertically with subtle separator
      const canvases: HTMLCanvasElement[] = []
      for (const p of pages) {
        canvases.push(await renderCardToCanvas(p))
      }
      const combinedCanvas = document.createElement('canvas')
      combinedCanvas.width = canvases[0].width
      const gap = 24
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
        const dataUrl = combinedCanvas.toDataURL('image/png')
        await saveOrShareFile({
          filename: fileName,
          base64Data: dataUrl.split(',')[1],
          mimeType: 'image/png',
          dialogTitle: 'تصدير كشف الواجبات كصورة A4',
        })
      }
    }
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host)
    }
  }
}

export async function exportAsPDF(data: HomeworkExportData): Promise<void> {
  const [appLogoDataUrl, raneenLogoDataUrl] = await Promise.all([
    getAppLogoDataUrl(),
    getRaneenLogoDataUrl(),
  ])
  const pages = buildExportPages(data, { appLogoDataUrl, raneenLogoDataUrl })
  const host = mountOffscreenHost(pages)

  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 60))

    const JsPDF = await loadBundledJsPDF()
    // Standard A4 Portrait: 210mm × 297mm
    const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    for (let i = 0; i < pages.length; i++) {
      const canvas = await renderCardToCanvas(pages[i])
      const imgData = canvas.toDataURL('image/png')
      if (i > 0) {
        pdf.addPage('a4', 'portrait')
      }
      // Add image spanning the 210mm × 297mm Portrait A4 page
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
    }

    const safeSection = (data.sectionName || '').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
    const fileName = `واجبات-${safeSection}-${data.date}.pdf`
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { saveOrShareFile } = await import('./fileSaver')
      const dataUri = pdf.output('datauristring')
      await saveOrShareFile({
        filename: fileName,
        base64Data: dataUri.split(',')[1],
        mimeType: 'application/pdf',
        dialogTitle: 'تصدير جدول الواجبات كـ PDF',
      })
    } else {
      pdf.save(fileName)
    }
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host)
    }
  }
}
