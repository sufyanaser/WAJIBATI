export interface HomeworkExportData {
  schoolName: string
  sectionName: string
  date: string
  items: Array<{
    period: number
    subject: string
    teacher: string
    body: string
  }>
}

async function loadHtml2Canvas(): Promise<(el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>> {
  if ((window as any).html2canvas) return (window as any).html2canvas
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    s.onload = () => resolve((window as any).html2canvas)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function loadJsPDF(): Promise<new (opts: object) => any> {
  if ((window as any).jspdf?.jsPDF) return (window as any).jspdf.jsPDF
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    s.onload = () => resolve((window as any).jspdf?.jsPDF)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function buildExportCard(data: HomeworkExportData): HTMLElement {
  const card = document.createElement('div')
  card.dir = 'rtl'
  card.style.cssText = [
    'width:800px', 'padding:40px', 'background:#0F1E33', 'color:#DCE8F4',
    "font-family:'Tajawal','Arial',sans-serif", 'border-radius:16px',
    'position:fixed', 'top:-9999px', 'left:-9999px',
  ].join(';')

  const rows = data.items.map(item => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #1E3352;font-weight:700;color:#E8B04A;width:80px;text-align:center">${item.period}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1E3352;font-weight:600;color:#DCE8F4">${item.subject}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1E3352;color:#6A8BAC;font-size:13px">${item.teacher}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1E3352;line-height:1.6">${item.body || '—'}</td>
    </tr>
  `).join('')

  card.innerHTML = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="font-size:22px;font-weight:900;color:#E8B04A;margin-bottom:4px">واجبات الرميلة</div>
      <div style="font-size:15px;color:#6A8BAC">${data.schoolName}</div>
      <div style="margin-top:12px;display:flex;gap:12px;justify-content:center">
        <span style="background:#172842;border:1px solid #1E3352;border-radius:8px;padding:6px 16px;font-size:14px">${data.sectionName}</span>
        <span style="background:#172842;border:1px solid #1E3352;border-radius:8px;padding:6px 16px;font-size:14px">${data.date}</span>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <thead>
        <tr style="background:#172842">
          <th style="padding:10px 16px;color:#E8B04A;font-weight:700;border-bottom:2px solid #E8B04A">الحصة</th>
          <th style="padding:10px 16px;color:#E8B04A;font-weight:700;border-bottom:2px solid #E8B04A">المادة</th>
          <th style="padding:10px 16px;color:#E8B04A;font-weight:700;border-bottom:2px solid #E8B04A">المعلم</th>
          <th style="padding:10px 16px;color:#E8B04A;font-weight:700;border-bottom:2px solid #E8B04A">الواجب</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin-top:20px;color:#374F69;font-size:12px">
      صُدِّر من تطبيق واجبات الرميلة
    </div>
  `
  return card
}

export async function exportAsImage(data: HomeworkExportData): Promise<void> {
  const html2canvas = await loadHtml2Canvas()
  const card = buildExportCard(data)
  document.body.appendChild(card)
  try {
    const canvas = await html2canvas(card, {
      backgroundColor: '#0F1E33',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    const link = document.createElement('a')
    link.download = `واجبات-${data.sectionName}-${data.date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    document.body.removeChild(card)
  }
}

export async function exportAsPDF(data: HomeworkExportData): Promise<void> {
  const [html2canvas, JsPDF] = await Promise.all([loadHtml2Canvas(), loadJsPDF()])
  const card = buildExportCard(data)
  document.body.appendChild(card)
  try {
    const canvas = await html2canvas(card, {
      backgroundColor: '#0F1E33',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`واجبات-${data.sectionName}-${data.date}.pdf`)
  } finally {
    document.body.removeChild(card)
  }
}
