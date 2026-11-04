import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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

  const handleLogout = () => {
    setMoreOpen(false)
    if (onLogout) {
      onLogout()
    } else {
      supabase.auth.signOut().then(() => nav('/login'))
    }
  }

  return (
    <>
      {/* ── More Modal Sheet ── */}
      {moreOpen && (
        <>
          <div
            className="sheet-backdrop"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="قائمة المزيد والإجراءات"
            className="sheet-container"
            dir="rtl"
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-header">
              <h3 className="sheet-title">المزيد من الخيارات</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="icon-btn"
                aria-label="إغلاق قائمة المزيد"
                style={{ padding: 6, minWidth: 32, minHeight: 32 }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="sheet-actions-list">
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
                  className="sheet-action-btn sheet-action-btn--primary"
                >
                  <DownloadIcon size={20} />
                  <span>تصدير الواجبات (PDF / A4)</span>
                </button>
              )}

              {/* Logout Action */}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="تسجيل الخروج من الحساب"
                className="sheet-action-btn sheet-action-btn--danger"
              >
                <LogOutIcon size={20} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Fixed 5-Item Bottom Navigation Bar ── */}
      <nav
        className="bottom-nav-bar"
        dir="rtl"
        aria-label="شريط التنقل السفلي"
      >
        <div className="bottom-nav-grid">
          {/* 1. الرئيسية / اليوم */}
          <button
            type="button"
            onClick={() => nav('/')}
            className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}
            aria-label="الرئيسية والواجبات اليومية"
            aria-current={currentPath === '/' ? 'page' : undefined}
          >
            <CalendarIcon size={20} />
            <span className="bottom-nav-label">اليوم</span>
          </button>

          {/* 2. الجدول الأسبوعي */}
          <button
            type="button"
            onClick={() => nav('/timetable')}
            className={`bottom-nav-item ${currentPath === '/timetable' ? 'active' : ''}`}
            aria-label="الجدول الأسبوعي"
            aria-current={currentPath === '/timetable' ? 'page' : undefined}
          >
            <CalendarDaysIcon size={20} />
            <span className="bottom-nav-label">الجدول</span>
          </button>

          {/* 3. الاستفسارات */}
          <button
            type="button"
            onClick={() => nav('/inquiries')}
            className={`bottom-nav-item ${currentPath === '/inquiries' ? 'active' : ''}`}
            aria-label="الاستفسارات والتواصل"
            aria-current={currentPath === '/inquiries' ? 'page' : undefined}
          >
            <BookIcon size={20} />
            <span className="bottom-nav-label">الاستفسارات</span>
          </button>

          {/* 4. الأرشيف */}
          <button
            type="button"
            onClick={() => nav('/archive')}
            className={`bottom-nav-item ${currentPath === '/archive' ? 'active' : ''}`}
            aria-label="أرشيف الواجبات"
            aria-current={currentPath === '/archive' ? 'page' : undefined}
          >
            <FileTextIcon size={20} />
            <span className="bottom-nav-label">الأرشيف</span>
          </button>

          {/* 5. المزيد */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`bottom-nav-item ${moreOpen ? 'active' : ''}`}
            aria-label="المزيد من الإجراءات والخيارات"
            aria-expanded={moreOpen}
          >
            <MoreHorizontalIcon size={20} />
            <span className="bottom-nav-label">المزيد</span>
          </button>
        </div>
      </nav>
    </>
  )
}
