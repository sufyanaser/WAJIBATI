import { useRef, useEffect, useCallback } from 'react'
import { CloseIcon } from './Icons'

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
    <div className="search-row">
      <input
        type="search"
        className="search-input"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="search"
        autoComplete="off"
        aria-label={placeholder}
        dir="rtl"
      />
      {value && (
        <button
          type="button"
          className="icon-btn btn-sm"
          onClick={handleClear}
          aria-label="مسح البحث"
        >
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  )
}
