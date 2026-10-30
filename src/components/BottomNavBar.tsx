import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CalendarIcon,
  CalendarDaysIcon,
  BookIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  DownloadIcon,
  LogOutIcon,
  CloseIcon,
} from './Icons'

interface BottomNavBarProps {
  onOpenExport?: () => void
  onLogout?: () => void
  canExport?: boolean
}

export function BottomNavBar({ onOpenExport, onLogout, canExport = true }: BottomNavBarProps) {
  const nav = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const currentPath = location.pathname

  return (
    <>
      {/* ? More Drawer / Modal Sheet */}
      {moreOpen && (
        <>
          <div
            className="bottom-nav-more-backdrop"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 90,
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="قائمة المزيد والإجراءات"
            dir="rtl"
            style={{
              position: 'fixed',
              bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
              left: 12,
              right: 12,
              maxWidth: 480,
              margin: '0 auto',
              backgroundColor: 'var(--bg-surface, #14243b)',
              border: '1px solid var(--border-color, rgba(31, 58, 95, 0.8))',
              borderRadius: 16,
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
              padding: '16px 14px',
              zIndex: 95,
              animation: 'drawerSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--fg-primary, #fff)' }}>
                المزيد من الإجراءات
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="إغلاق قائمة المزيد"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--fg-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Export Homework Action */}
              {onOpenExport && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false)
                    onOpenExport()
                  }}
                  disabled={!canExport}
                  aria-label="تصدير جدول الواجبات"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(232, 176, 74, 0.25)',
                    backgroundColor: 'rgba(232, 176, 74, 0.08)',
                    color: canExport ? 'var(--accent, #e8b04a)' : 'var(--muted, #64748b)',
                    cursor: canExport ? 'pointer' : 'not-allowed',
                    opacity: canExport ? 1 : 0.6,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    textAlign: 'right',
                  }}
                >
                  <DownloadIcon size={20} />
                  <span>تصدير الواجبات (PDF / A4)</span>
                </button>
              )}

              {/* Logout Action */}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false)
                    onLogout()
                  }}
                  aria-label="تسجيل الخروج من الحساب"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(248, 113, 113, 0.25)',
                    backgroundColor: 'rgba(248, 113, 113, 0.08)',
                    color: '#f87171',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    textAlign: 'right',
                  }}
                >
                  <LogOutIcon size={20} />
                  <span>تسجيل الخروج</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ? Fixed 5-Item Bottom Navigation Bar */}
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
          paddingTop: 4,
          paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(8px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(8px, env(safe-area-inset-right, 0px))',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 4,
            alignItems: 'center',
          }}
        >
          {/* 1. الرئيسية / اليوم */}
          <button
            type="button"
            onClick={() => nav('/')}
            className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}
            aria-label="الرئيسية والواجبات اليومية"
            aria-current={currentPath === '/' ? 'page' : undefined}
            style={{
              background: 'none',
              border: 'none',
              color: currentPath === '/' ? 'var(--accent, #e8b04a)' : 'var(--fg-secondary, #94a3b8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              minWidth: 44,
              cursor: 'pointer',
              borderRadius: 10,
              padding: 4,
              position: 'relative',
              transition: 'color .15s, transform .1s',
            }}
          >
            <CalendarIcon size={22} />
            {currentPath === '/' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent, #e8b04a)',
                }}
              />
            )}
          </button>

          {/* 2. الجدول الأسبوعي */}
          <button
            type="button"
            onClick={() => nav('/timetable')}
            className={`bottom-nav-item ${currentPath === '/timetable' ? 'active' : ''}`}
            aria-label="الجدول الأسبوعي"
            aria-current={currentPath === '/timetable' ? 'page' : undefined}
            style={{
              background: 'none',
              border: 'none',
              color: currentPath === '/timetable' ? 'var(--accent, #e8b04a)' : 'var(--fg-secondary, #94a3b8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              minWidth: 44,
              cursor: 'pointer',
              borderRadius: 10,
              padding: 4,
              position: 'relative',
              transition: 'color .15s, transform .1s',
            }}
          >
            <CalendarDaysIcon size={22} />
            {currentPath === '/timetable' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent, #e8b04a)',
                }}
              />
            )}
          </button>

          {/* 3. الأرشيف */}
          <button
            type="button"
            onClick={() => nav('/archive')}
            className={`bottom-nav-item ${currentPath === '/archive' ? 'active' : ''}`}
            aria-label="أرشيف الواجبات"
            aria-current={currentPath === '/archive' ? 'page' : undefined}
            style={{
              background: 'none',
              border: 'none',
              color: currentPath === '/archive' ? 'var(--accent, #e8b04a)' : 'var(--fg-secondary, #94a3b8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              minWidth: 44,
              cursor: 'pointer',
              borderRadius: 10,
              padding: 4,
              position: 'relative',
              transition: 'color .15s, transform .1s',
            }}
          >
            <BookIcon size={22} />
            {currentPath === '/archive' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent, #e8b04a)',
                }}
              />
            )}
          </button>

          {/* 4. الاستفسارات */}
          <button
            type="button"
            onClick={() => nav('/inquiries')}
            className={`bottom-nav-item ${currentPath === '/inquiries' ? 'active' : ''}`}
            aria-label="الاستفسارات والتواصل"
            aria-current={currentPath === '/inquiries' ? 'page' : undefined}
            style={{
              background: 'none',
              border: 'none',
              color: currentPath === '/inquiries' ? 'var(--accent, #e8b04a)' : 'var(--fg-secondary, #94a3b8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              minWidth: 44,
              cursor: 'pointer',
              borderRadius: 10,
              padding: 4,
              position: 'relative',
              transition: 'color .15s, transform .1s',
            }}
          >
            <FileTextIcon size={22} />
            {currentPath === '/inquiries' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent, #e8b04a)',
                }}
              />
            )}
          </button>

          {/* 5. المزيد */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`bottom-nav-item ${moreOpen ? 'active' : ''}`}
            aria-label="المزيد من الإجراءات والخيارات"
            aria-expanded={moreOpen}
            style={{
              background: 'none',
              border: 'none',
              color: moreOpen ? 'var(--accent, #e8b04a)' : 'var(--fg-secondary, #94a3b8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              minWidth: 44,
              cursor: 'pointer',
              borderRadius: 10,
              padding: 4,
              position: 'relative',
              transition: 'color .15s, transform .1s',
            }}
          >
            <MoreHorizontalIcon size={22} />
          </button>
        </div>
      </nav>
    </>
  )
}
