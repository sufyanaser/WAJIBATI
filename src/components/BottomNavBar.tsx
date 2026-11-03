import React, { useState } from 'react'
import type { CSSProperties } from 'react'
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
  BellIcon,
  SettingsIcon,
  UserIcon,
} from './Icons'

interface BottomNavBarProps {
  onOpenExport?: () => void
  onLogout?: () => void
  canExport?: boolean
}

/** Each page owns one accent colour; it shows as a highlight on its tab. */
const TAB_ACCENT = {
  today: '#007BFE',
  timetable: '#0E9AA7',
  inquiries: '#7C5CFA',
  archive: '#E08A00',
  more: '#475569',
} as const

const tabStyle = (color: string) => ({ '--tab-accent': color } as CSSProperties)

export function BottomNavBar({ onOpenExport, onLogout, canExport = true }: BottomNavBarProps) {
  const nav = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [notifPerm, setNotifPerm] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )

  const currentPath = location.pathname

  const handleLogout = () => {
    setMoreOpen(false)
    if (onLogout) {
      onLogout()
    } else {
      supabase.auth.signOut().then(() => nav('/login'))
    }
  }

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
  }

  const notifLabel =
    notifPerm === 'granted' ? 'مفعّلة' : notifPerm === 'denied' ? 'مرفوضة' : notifPerm === 'unsupported' ? 'غير مدعومة' : 'غير مفعّلة'

  return (
    <>
      {/* ── More: side drawer (account + app settings) ── */}
      {moreOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <aside role="dialog" aria-modal="true" aria-label="الحساب والإعدادات" className="more-drawer" dir="rtl">
            <div className="more-drawer__header">
              <h2 className="more-drawer__title">الحساب والإعدادات</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="icon-btn"
                aria-label="إغلاق"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <section className="more-drawer__section">
              <h3 className="more-drawer__section-title">الحساب</h3>
              <div className="more-drawer__row">
                <span className="more-drawer__row-icon"><UserIcon size={18} /></span>
                <span className="more-drawer__row-label">ولي الأمر</span>
              </div>
              {onOpenExport && (
                <button
                  type="button"
                  className="more-drawer__row more-drawer__row--action"
                  disabled={!canExport}
                  onClick={() => { setMoreOpen(false); onOpenExport() }}
                >
                  <span className="more-drawer__row-icon"><DownloadIcon size={18} /></span>
                  <span className="more-drawer__row-label">تصدير الواجبات (PDF / A4)</span>
                </button>
              )}
            </section>

            <section className="more-drawer__section">
              <h3 className="more-drawer__section-title">إعدادات التطبيق</h3>
              <button
                type="button"
                className="more-drawer__row more-drawer__row--action"
                onClick={requestNotifications}
                disabled={notifPerm === 'granted' || notifPerm === 'unsupported' || notifPerm === 'denied'}
              >
                <span className="more-drawer__row-icon"><BellIcon size={18} /></span>
                <span className="more-drawer__row-label">الإشعارات</span>
                <span className="more-drawer__row-value">{notifLabel}</span>
              </button>
              <div className="more-drawer__row">
                <span className="more-drawer__row-icon"><SettingsIcon size={18} /></span>
                <span className="more-drawer__row-label">الإصدار</span>
                <span className="more-drawer__row-value">1.0.0</span>
              </div>
            </section>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="تسجيل الخروج من الحساب"
              className="more-drawer__logout"
            >
              <LogOutIcon size={18} />
              <span>تسجيل الخروج</span>
            </button>
          </aside>
        </>
      )}

      {/* ── Fixed 5-Item Bottom Navigation Bar ── */}
      <nav className="bottom-nav-bar" dir="rtl" aria-label="شريط التنقل السفلي">
        <div className="bottom-nav-grid">
          <button
            type="button"
            onClick={() => nav('/')}
            className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}
            style={tabStyle(TAB_ACCENT.today)}
            aria-label="الرئيسية والواجبات اليومية"
            aria-current={currentPath === '/' ? 'page' : undefined}
          >
            <CalendarIcon size={20} />
            <span className="bottom-nav-label">اليوم</span>
          </button>

          <button
            type="button"
            onClick={() => nav('/timetable')}
            className={`bottom-nav-item ${currentPath === '/timetable' ? 'active' : ''}`}
            style={tabStyle(TAB_ACCENT.timetable)}
            aria-label="الجدول الأسبوعي"
            aria-current={currentPath === '/timetable' ? 'page' : undefined}
          >
            <CalendarDaysIcon size={20} />
            <span className="bottom-nav-label">الجدول</span>
          </button>

          <button
            type="button"
            onClick={() => nav('/inquiries')}
            className={`bottom-nav-item ${currentPath === '/inquiries' ? 'active' : ''}`}
            style={tabStyle(TAB_ACCENT.inquiries)}
            aria-label="الاستفسارات والتواصل"
            aria-current={currentPath === '/inquiries' ? 'page' : undefined}
          >
            <BookIcon size={20} />
            <span className="bottom-nav-label">الاستفسارات</span>
          </button>

          <button
            type="button"
            onClick={() => nav('/archive')}
            className={`bottom-nav-item ${currentPath === '/archive' ? 'active' : ''}`}
            style={tabStyle(TAB_ACCENT.archive)}
            aria-label="أرشيف الواجبات"
            aria-current={currentPath === '/archive' ? 'page' : undefined}
          >
            <FileTextIcon size={20} />
            <span className="bottom-nav-label">الأرشيف</span>
          </button>

          <button
            type="button"
            onClick={() => setMoreOpen(v => !v)}
            className={`bottom-nav-item ${moreOpen ? 'active' : ''}`}
            style={tabStyle(TAB_ACCENT.more)}
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
