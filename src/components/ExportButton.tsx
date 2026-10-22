import { useState } from 'react'
import type { HomeworkExportData } from '../utils/exportHomework'
import { DownloadIcon, ImageIcon, FileTextIcon, RefreshIcon } from './Icons'

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
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="menu"
        className="icon-btn"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--accent)',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? <RefreshIcon size={16} /> : <DownloadIcon size={16} />}
        <span>تصدير</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + .5rem)',
              left: 0,
              background: 'var(--card2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              minWidth: '185px',
              zIndex: 100,
              boxShadow: '0 10px 28px var(--shadow)',
              overflow: 'hidden',
            }}
          >
            {([
              { key: 'image' as const, label: 'تصدير كصورة PNG', icon: ImageIcon },
              { key: 'pdf' as const, label: 'تصدير كـ PDF', icon: FileTextIcon },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => handle(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '.75rem 1rem',
                  minHeight: '42px',
                  background: 'none',
                  border: 'none',
                  borderRadius: 0,
                  color: 'var(--fg)',
                  textAlign: 'right',
                  cursor: 'pointer',
                  fontSize: '.875rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
