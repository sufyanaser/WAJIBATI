import React from 'react'
import { CloseIcon, TrashIcon } from '../Icons'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDestructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد الإجراء',
  cancelLabel = 'إلغاء',
  isDestructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 10, 22, 0.75)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--card)',
          border: '1px solid var(--border-strong)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDestructive && (
              <span style={{ color: '#F87171', display: 'flex' }}>
                <TrashIcon size={18} />
              </span>
            )}
            <h3
              id="confirm-dialog-title"
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: isDestructive ? '#FCA5A5' : '#FFFFFF',
              }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
            aria-label="إغلاق"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', fontSize: '0.9rem', color: 'var(--fg-secondary)', lineHeight: 1.6 }}>
          {message}
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--card2)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={busy}
            style={{ minHeight: '36px', padding: '0 16px', fontSize: '0.85rem' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
            style={{ minHeight: '36px', padding: '0 16px', fontSize: '0.85rem' }}
          >
            {busy ? 'جاري المعالجة...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
