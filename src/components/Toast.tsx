import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onDone: () => void
  duration?: number
}

export function Toast({ message, type, onDone, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  const colors: Record<ToastType, string> = {
    success: 'var(--success)',
    error: 'var(--err)',
    info: 'var(--accent)',
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--card2)',
        border: `1.5px solid ${colors[type]}`,
        borderRadius: 'var(--radius-lg)',
        padding: '.75rem 1.25rem',
        color: colors[type],
        fontWeight: 700,
        fontSize: '.9rem',
        boxShadow: '0 8px 28px var(--shadow)',
        opacity: visible ? 1 : 0,
        transition: 'opacity .3s',
        zIndex: 9999,
        maxWidth: 'min(480px, 92vw)',
        textAlign: 'center',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const show = (message: string, type: ToastType = 'info') => setToast({ message, type })
  const clear = () => setToast(null)
  return { toast, show, clear }
}
