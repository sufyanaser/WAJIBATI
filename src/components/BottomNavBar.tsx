import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookIcon,
  DownloadIcon,
  FileTextIcon,
  LogOutIcon,
} from './Icons'

interface BottomNavBarProps {
  onOpenExport: () => void
  onLogout: () => void
  canExport?: boolean
}

export function BottomNavBar({ onOpenExport, onLogout, canExport = true }: BottomNavBarProps) {
  const nav = useNavigate()

  return (
    <nav
      className="bottom-nav-bar"
      dir="rtl"
      aria-label="شريط التنقل السفلي"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(15, 30, 51, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(31, 58, 95, 0.8)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.45)',
        paddingTop: 6,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          alignItems: 'center',
        }}
      >
        {/* 1. الأرشيف */}
        <button
          type="button"
          onClick={() => nav('/archive')}
          className="bottom-nav-item"
          aria-label="الانتقال إلى الأرشيف"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--fg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            minHeight: 48,
            cursor: 'pointer',
            borderRadius: 8,
            transition: 'color .15s, transform .1s',
            fontFamily: 'inherit',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <BookIcon size={20} />
          <span style={{ fontSize: '.78rem', fontWeight: 600 }}>الأرشيف</span>
        </button>

        {/* 2. التصدير */}
        <button
          type="button"
          onClick={onOpenExport}
          disabled={!canExport}
          className="bottom-nav-item"
          aria-label="تصدير جدول الواجبات"
          style={{
            background: 'none',
            border: 'none',
            color: canExport ? 'var(--accent)' : 'var(--muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            minHeight: 48,
            cursor: canExport ? 'pointer' : 'not-allowed',
            borderRadius: 8,
            transition: 'color .15s, transform .1s',
            opacity: canExport ? 1 : 0.5,
            fontFamily: 'inherit',
          }}
          onMouseDown={e => { if (canExport) e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { if (canExport) e.currentTarget.style.transform = 'scale(1)' }}
        >
          <DownloadIcon size={20} />
          <span style={{ fontSize: '.78rem', fontWeight: 700 }}>التصدير</span>
        </button>

        {/* 3. الاستفسارات */}
        <button
          type="button"
          onClick={() => nav('/inquiries')}
          className="bottom-nav-item"
          aria-label="الاستفسارات والتواصل"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--fg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            minHeight: 48,
            cursor: 'pointer',
            borderRadius: 8,
            transition: 'color .15s, transform .1s',
            fontFamily: 'inherit',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <FileTextIcon size={20} />
          <span style={{ fontSize: '.78rem', fontWeight: 600 }}>الاستفسارات</span>
        </button>

        {/* 4. الخروج */}
        <button
          type="button"
          onClick={onLogout}
          className="bottom-nav-item"
          aria-label="تسجيل الخروج"
          style={{
            background: 'none',
            border: 'none',
            color: '#f87171',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            minHeight: 48,
            cursor: 'pointer',
            borderRadius: 8,
            transition: 'color .15s, transform .1s',
            fontFamily: 'inherit',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <LogOutIcon size={20} />
          <span style={{ fontSize: '.78rem', fontWeight: 600 }}>الخروج</span>
        </button>
      </div>
    </nav>
  )
}
