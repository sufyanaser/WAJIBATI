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
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: 16,
              boxShadow: '0 -10px 36px rgba(0, 80, 200, 0.12)',
              padding: '16px 14px',
              zIndex: 95,
              animation: 'drawerSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                المزيد من الإجراءات
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="إغلاق قائمة المزيد"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
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
                    border: '1px solid rgba(0, 123, 254, 0.25)',
                    backgroundColor: 'rgba(0, 123, 254, 0.08)',
                    color: canExport ? 'var(--accent, #007BFE)' : 'var(--muted, #94A3B8)',
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
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    color: '#EF4444',
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
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(226, 232, 240, 0.85)',
          boxShadow: '0 -4px 25px rgba(0, 80, 200, 0.08)',
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
              color: currentPath === '/' ? 'var(--accent, #007BFE)' : '#64748B',
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
                  backgroundColor: 'var(--accent, #007BFE)',
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
              color: currentPath === '/timetable' ? 'var(--accent, #007BFE)' : '#64748B',
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
                  backgroundColor: 'var(--accent, #007BFE)',
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
              color: currentPath === '/archive' ? 'var(--accent, #007BFE)' : '#64748B',
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
                  backgroundColor: 'var(--accent, #007BFE)',
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
              color: currentPath === '/inquiries' ? 'var(--accent, #007BFE)' : '#64748B',
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
                  backgroundColor: 'var(--accent, #007BFE)',
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
              color: moreOpen ? 'var(--accent, #007BFE)' : '#64748B',
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
