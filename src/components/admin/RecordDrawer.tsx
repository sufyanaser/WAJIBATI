import React, { useEffect, useState } from 'react'
import { CloseIcon, CheckIcon } from '../Icons'

export interface RecordDrawerProps {
  isOpen: boolean
  title: string
  subtitle?: string
  onClose: () => void
  onSave?: () => void
  isDirty?: boolean
  saveLabel?: string
  cancelLabel?: string
  children: React.ReactNode
  footerActions?: React.ReactNode
  loading?: boolean
  width?: string
}

export function RecordDrawer({
  isOpen,
  title,
  subtitle,
  onClose,
  onSave,
  isDirty = false,
  saveLabel = 'حفظ التغييرات',
  cancelLabel = 'إلغاء',
  children,
  footerActions,
  loading = false,
  width = 'min(540px, 100vw)',
}: RecordDrawerProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  function attemptClose() {
    if (isDirty) {
      if (window.confirm('توجد تعديلات لم تُحفظ في هذا السجل. هل أنت متأكد من الإغلاق وتجاهل التغييرات؟')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        attemptClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDirty])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 10, 22, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 200,
          transition: 'opacity 0.2s ease',
        }}
        onClick={attemptClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer (From Left in RTL) */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width,
          background: 'var(--card)',
          borderRight: '1px solid var(--border-strong)',
          boxShadow: '10px 0 35px rgba(0, 0, 0, 0.4)',
          zIndex: 210,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-105%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card2)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#FFFFFF',
                fontFamily: 'var(--font-family-heading)',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                {subtitle}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={attemptClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--fg-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="إغلاق"
            title="إغلاق (Esc)"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--card2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          {footerActions ? (
            footerActions
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={attemptClose}
                disabled={loading}
                style={{ minHeight: '36px', padding: '0 16px', fontSize: '0.85rem' }}
              >
                {cancelLabel}
              </button>
              {onSave && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onSave}
                  disabled={loading}
                  style={{ minHeight: '36px', padding: '0 18px', fontSize: '0.85rem' }}
                >
                  {loading ? (
                    'جاري الحفظ...'
                  ) : (
                    <>
                      <CheckIcon size={16} />
                      {saveLabel}
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
