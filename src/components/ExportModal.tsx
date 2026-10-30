import { useEffect, useRef, useState } from 'react'
import type { HomeworkExportData } from '../utils/exportHomework'
import {
  DownloadIcon,
  ImageIcon,
  FileTextIcon,
  CloseIcon,
  RefreshIcon,
} from './Icons'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  data: HomeworkExportData
}

export function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  const [loadingType, setLoadingType] = useState<'image' | 'pdf' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const busyRef = useRef(false)
  const onCloseRef = useRef(onClose)
  busyRef.current = loadingType !== null
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleExport = async (type: 'image' | 'pdf') => {
    setLoadingType(type)
    setErrorMsg(null)
    try {
      const { exportAsImage, exportAsPDF } = await import('../utils/exportHomework')
      if (type === 'image') {
        await exportAsImage(data)
      } else {
        await exportAsPDF(data)
      }
      onClose()
    } catch (err) {
      console.error('Export failed:', err)
      setErrorMsg('تعذر إكمال التصدير، يرجى المحاولة مجدداً.')
    } finally {
      setLoadingType(null)
    }
  }

  const isBusy = loadingType !== null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
        background: 'rgba(5, 12, 22, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="export-sheet-container"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--card)',
          borderTop: '2px solid var(--accent)',
          borderLeft: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.6)',
          padding: '20px 20px max(24px, env(safe-area-inset-bottom, 16px)) 20px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'sheetSlideUp 0.22s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--accent-soft, rgba(0, 123, 254, 0.12))',
                color: 'var(--accent)',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DownloadIcon size={20} />
            </div>
            <div>
              <h3
                id="export-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--fg)',
                }}
              >
                تصدير جدول الواجبات
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '.82rem',
                  color: 'var(--fg-muted)',
                }}
              >
                وثيقة رسمية A4 عمودية قابلة للطباعة والمشاركة
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="إغلاق"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: '.85rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Export Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Option 1: PDF */}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleExport('pdf')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--card2)',
              color: 'var(--fg)',
              cursor: isBusy ? 'wait' : 'pointer',
              textAlign: 'right',
              fontFamily: 'inherit',
              transition: 'background .15s, border-color .15s',
              opacity: isBusy && loadingType !== 'pdf' ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!isBusy) e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { if (!isBusy) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.14)',
                  color: '#f87171',
                  padding: 10,
                  borderRadius: 10,
                  display: 'flex',
                }}
              >
                <FileTextIcon size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--fg)' }}>
                  تصدير كـ PDF (A4 رسمي)
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--fg-muted)', marginTop: 2 }}>
                  ملف PDF منسق للطباعة والمشاركة عبر الهاتف
                </div>
              </div>
            </div>

            {loadingType === 'pdf' ? (
              <RefreshIcon size={20} className="spinning" />
            ) : (
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '.85rem' }}>
                PDF
              </span>
            )}
          </button>

          {/* Option 2: Image (PNG) */}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleExport('image')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--card2)',
              color: 'var(--fg)',
              cursor: isBusy ? 'wait' : 'pointer',
              textAlign: 'right',
              fontFamily: 'inherit',
              transition: 'background .15s, border-color .15s',
              opacity: isBusy && loadingType !== 'image' ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!isBusy) e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { if (!isBusy) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.14)',
                  color: '#38bdf8',
                  padding: 10,
                  borderRadius: 10,
                  display: 'flex',
                }}
              >
                <ImageIcon size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--fg)' }}>
                  تصدير كصورة PNG (A4 رسمي)
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--fg-muted)', marginTop: 2 }}>
                  صورة عالية الدقة والوضوح لجميع المواد والواجبات
                </div>
              </div>
            </div>

            {loadingType === 'image' ? (
              <RefreshIcon size={20} className="spinning" />
            ) : (
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '.85rem' }}>
                PNG
              </span>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>
          {isBusy ? 'جارٍ إعداد وتجهيز الملف بالدقة الكاملة…' : 'يتم الحفظ والمشاركة المباشرة عبر أدوات الهاتف'}
        </div>
      </div>
    </div>
  )
}
