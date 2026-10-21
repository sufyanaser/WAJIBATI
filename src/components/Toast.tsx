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
    <div style={{
      position: 'fixed',
      bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--card2)',
      border: `1.5px solid ${colors[type]}`,
      borderRadius: '.75rem',
      padding: '.75rem 1.25rem',
      color: colors[type],
      fontWeight: 600,
      fontSize: '.9rem',
      boxShadow: '0 4px 24px rgba(0,0,0,.4)',
      opacity: visible ? 1 : 0,
      transition: 'opacity .3s',
      zIndex: 9999,
      maxWidth: '90vw',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    }}>
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
