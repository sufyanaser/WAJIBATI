import { useRef, useEffect, useCallback } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function HomeworkSearch({ value, onChange, placeholder = 'ابحث في الواجبات...' }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(next)
      }, 300)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    onChange('')
  }, [onChange])

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        type="search"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="search"
        autoComplete="off"
        dir="rtl"
        style={{
          flex: 1,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          color: 'var(--fg)',
          padding: '12px 16px',
          fontSize: '1rem',
        }}
      />
      {value && (
        <button
          onClick={handleClear}
          aria-label="مسح البحث"
          style={{
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '1rem',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
