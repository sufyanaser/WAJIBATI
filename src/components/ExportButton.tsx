import { useState } from 'react'
import type { HomeworkExportData } from '../utils/exportHomework'

interface Props {
  data: HomeworkExportData
}

export function ExportButton({ data }: Props) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handle = async (type: 'image' | 'pdf') => {
    setOpen(false)
    setLoading(true)
    try {
      const { exportAsImage, exportAsPDF } = await import('../utils/exportHomework')
      if (type === 'image') await exportAsImage(data)
      else await exportAsPDF(data)
    } catch (e) {
      console.error('Export failed', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          padding: '.5rem 1rem', background: 'var(--card2)',
          border: '1.5px solid var(--border)', borderRadius: '.5rem',
          color: 'var(--accent)', cursor: loading ? 'wait' : 'pointer',
          fontSize: '.875rem', fontWeight: 600, fontFamily: 'inherit',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '⏳' : '↓'} تصدير
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + .5rem)', left: 0,
            background: 'var(--card2)', border: '1px solid var(--border)',
            borderRadius: '.5rem', minWidth: '170px', zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,.4)', overflow: 'hidden',
          }}>
            {([
              { key: 'image' as const, label: '🖼 تصدير كصورة PNG' },
              { key: 'pdf' as const, label: '📄 تصدير كـ PDF' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handle(key)}
                style={{
                  display: 'block', width: '100%', padding: '.7rem 1rem',
                  background: 'none', border: 'none', color: 'var(--fg)',
                  textAlign: 'right', cursor: 'pointer', fontSize: '.875rem',
                  fontFamily: 'inherit', transition: 'background .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--card)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
