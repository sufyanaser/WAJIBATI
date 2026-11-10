import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import { Toast, useToast } from '../../components/Toast'
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  SearchIcon,
  EyeIcon,
} from '../../components/Icons'

interface Section {
  id: number
  letter: string
  stage: { name: string; branch: string }
}

interface Notice {
  id: string
  title: string
  body: string | null
  priority: number
  section_id: number | null
  publish_at: string
  expires_at: string | null
}

export default function NoticesPage() {
  const nav = useNavigate()
  const adminCtx = useAdmin()
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>(adminCtx.ready ? adminCtx.role : 'editor')
  const [authChecked, setAuthChecked] = useState(adminCtx.ready)
  const [loading, setLoading] = useState(true)
  const canEdit = role === 'owner' || role === 'editor'

  // Responsive mobile layout detection
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [sections, setSections] = useState<Section[]>([])
  const [notices, setNotices] = useState<Notice[]>([])

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nTitle, setNTitle] = useState('')
  const [nBody, setNBody] = useState('')
  const [nPri, setNPri] = useState(1)
  const [nSec, setNSec] = useState<number | ''>('')
  const [nExpires, setNExpires] = useState('')
  const [nSaving, setNSaving] = useState(false)

  // Mobile-specific modal and preview states
  const [showMobileForm, setShowMobileForm] = useState(false)
  const [previewNotice, setPreviewNotice] = useState<Notice | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<number | ''>('')

  // Deletion confirmation
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  // Track initial values for unsaved edits protection
  const [initialFormValues, setInitialFormValues] = useState<{
    title: string
    body: string
    priority: number
    sectionId: number | ''
    expires: string
  }>({
    title: '',
    body: '',
    priority: 1,
    sectionId: '',
    expires: '',
  })

  const isFormDirty =
    (showMobileForm || editingId !== null) &&
    (nTitle !== initialFormValues.title ||
      nBody !== initialFormValues.body ||
      nPri !== initialFormValues.priority ||
      nSec !== initialFormValues.sectionId ||
      nExpires !== initialFormValues.expires)

  // ── Protection of Unsaved Form Edits on Navigation & Back ────────────────────
  useEffect(() => {
    if (!isFormDirty) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }

    function handleCaptureClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(
        'a, .admin-mobile-back-btn, .admin-bottom-nav-item, .admin-nav-item, .admin-subnav-pill'
      )
      if (!target) return
      if (target.closest('.notice-modal-sheet, .notice-form')) return

      const confirmed = window.confirm(
        'لديك تعديلات غير محفوظة في الإشعار. هل تريد مغادرة الصفحة وتجاهل التعديلات؟'
      )
      if (!confirmed) {
        e.preventDefault()
        e.stopPropagation()
      } else {
        resetForm()
      }
    }

    function handlePopState() {
      const confirmed = window.confirm(
        'لديك تعديلات غير محفوظة في الإشعار. هل تريد الرجوع وتجاهل التعديلات؟'
      )
      if (!confirmed) {
        window.history.pushState(null, '', window.location.href)
      } else {
        resetForm()
        window.history.back()
      }
    }

    window.history.pushState(null, '', window.location.href)

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleCaptureClick, true)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleCaptureClick, true)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isFormDirty])

  useEffect(() => {
    if (adminCtx.ready) {
      setRole(adminCtx.role)
      setAuthChecked(true)
    }
  }, [adminCtx.ready, adminCtx.role])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        nav('/admin/login')
        return
      }
      const { data: adm } = await supabase
        .from('admins')
        .select('role')
        .eq('user_id', data.session.user.id)
        .maybeSingle()
      if (!adm) {
        await supabase.auth.signOut()
        nav('/admin/login')
        return
      }
      if (adm.role) setRole(adm.role as 'owner' | 'editor' | 'viewer')
      setAuthChecked(true)
    })
  }, [nav])

  useEffect(() => {
    supabase
      .from('sections')
      .select('id, letter, stage:stages(name, branch)')
      .order('letter')
      .then(({ data }) => setSections((data ?? []) as unknown as Section[]))

    loadNotices()
  }, [])

  async function loadNotices() {
    setLoading(true)
    const { data } = await supabase
      .from('notices')
      .select('id, title, body, priority, section_id, publish_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(30)
    setNotices((data ?? []) as unknown as Notice[])
    setLoading(false)
  }

  function resetForm() {
    setEditingId(null)
    setNTitle('')
    setNBody('')
    setNPri(1)
    setNSec('')
    setNExpires('')
    setShowMobileForm(false)
    setInitialFormValues({
      title: '',
      body: '',
      priority: 1,
      sectionId: '',
      expires: '',
    })
  }

  function startEditNotice(n: Notice, openSheet = false) {
    setEditingId(n.id)
    const initial = {
      title: n.title,
      body: n.body ?? '',
      priority: n.priority,
      sectionId: (n.section_id ?? '') as number | '',
      expires: n.expires_at ? n.expires_at.slice(0, 10) : '',
    }
    setNTitle(initial.title)
    setNBody(initial.body)
    setNPri(initial.priority)
    setNSec(initial.sectionId)
    setNExpires(initial.expires)
    setInitialFormValues(initial)
    if (openSheet) {
      setShowMobileForm(true)
    }
  }

  function openNewNoticeMobile() {
    resetForm()
    setShowMobileForm(true)
  }

  function closeMobileForm() {
    if (isFormDirty) {
      const confirmed = window.confirm(
        'لديك تعديلات غير محفوظة في الإشعار. هل تريد إلغاء التعديلات؟'
      )
      if (!confirmed) return
    }
    resetForm()
  }

  function handlePreviewDraft() {
    setPreviewNotice({
      id: editingId ?? 'draft',
      title: nTitle.trim() || 'عنوان تجريبي للإشعار',
      body: nBody.trim() || 'نص الإشعار يظهر هنا بالكامل لمعاينة المظهر النهائي قبل النشر.',
      priority: nPri,
      section_id: nSec || null,
      publish_at: new Date().toISOString(),
      expires_at: nExpires ? new Date(nExpires + 'T23:59:59').toISOString() : null,
    })
  }

  async function saveNotice(e: React.FormEvent) {
    e.preventDefault()
    if (!nTitle.trim()) return
    setNSaving(true)

    const payload = {
      title: nTitle.trim(),
      body: nBody.trim() || null,
      priority: nPri,
      section_id: nSec || null,
      expires_at: nExpires ? new Date(nExpires + 'T23:59:59').toISOString() : null,
    }

    if (editingId) {
      await supabase.from('notices').update(payload).eq('id', editingId)
      showToast('تم حفظ تعديلات الإشعار بنجاح', 'success')
    } else {
      await supabase.from('notices').insert({
        ...payload,
        publish_at: new Date().toISOString(),
      })
      showToast('تم نشر الإشعار الجديد بنجاح', 'success')
    }

    resetForm()
    await loadNotices()
    setNSaving(false)
  }

  async function confirmDeleteNotice() {
    if (!noticeToDelete) return
    setIsDeleting(true)
    const { error } = await supabase.from('notices').delete().eq('id', noticeToDelete.id)
    setIsDeleting(false)
    if (error) {
      showToast(`تعذر حذف الإشعار: ${error.message}`, 'error')
    } else {
      if (editingId === noticeToDelete.id) resetForm()
      setNotices(p => p.filter(n => n.id !== noticeToDelete.id))
      showToast(`تم حذف إشعار "${noticeToDelete.title}" بنجاح`, 'info')
    }
    setNoticeToDelete(null)
  }

  const sectionLabel = (id: number | null) => {
    if (!id) return 'كل الشعب'
    const sec = sections.find(s => s.id === id)
    return sec ? `${sec.stage.name} ${sec.stage.branch} / ${sec.letter}` : `شعبة ${id}`
  }

  const priorityLabel = (p: number) => (p === 3 ? 'عاجل' : p === 2 ? 'مهم' : 'عادي')
  const priorityBadgeClass = (p: number) =>
    p === 3 ? 'badge-warn' : p === 2 ? 'badge-gold' : 'badge-muted'

  const filteredNotices = notices.filter(n => {
    if (filterPriority && n.priority !== filterPriority) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const titleMatch = n.title.toLowerCase().includes(q)
      const bodyMatch = n.body ? n.body.toLowerCase().includes(q) : false
      if (!titleMatch && !bodyMatch) return false
    }
    return true
  })

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 14 }}>
      {/* ──────────────────────────────────────────────────────────────────────────
          Viewer mode notification banner (RT-06)
          ────────────────────────────────────────────────────────────────────────── */}
      {!canEdit && authChecked && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            borderRight: '4px solid #5B9DD9',
            background: 'var(--card)',
          }}
        >
          <p style={{ margin: 0, fontSize: '.88rem', color: '#B3C0D0', lineHeight: 1.5 }}>
            <strong>وضع المشاهدة (Viewer):</strong> تصفح الإعلانات متاح للقراءة فقط. لإضافة إشعار جديد أو
            تعديل أو حذف إشعار سابق، يلزم تسجيل الدخول بحساب محرر أو مالك النظام.
          </p>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          DESKTOP EXPERIENCE (>768px): Inline Form & Table/Card List (RT-02 & RT-06)
          ────────────────────────────────────────────────────────────────────────── */}
      {!isMobile && (
        <>
          {canEdit && (
            <form className="notice-form" onSubmit={saveNotice}>
              <h2 className="import-heading">
                {editingId ? 'تعديل الإشعار' : 'إضافة إشعار جديد'}
              </h2>
              <input
                placeholder="العنوان *"
                aria-label="عنوان الإشعار"
                value={nTitle}
                onChange={e => setNTitle(e.target.value)}
                required
              />
              <textarea
                className="hw-textarea"
                rows={2}
                placeholder="النص (اختياري)"
                aria-label="نص الإشعار"
                value={nBody}
                onChange={e => setNBody(e.target.value)}
              />
              <div className="admin-selectors">
                <select
                  className="admin-select"
                  aria-label="أولوية الإشعار"
                  value={nPri}
                  onChange={e => setNPri(Number(e.target.value))}
                >
                  <option value={1}>عادي</option>
                  <option value={2}>مهم</option>
                  <option value={3}>عاجل</option>
                </select>
                <select
                  className="admin-select"
                  aria-label="الشعبة المستهدفة"
                  value={nSec}
                  onChange={e => setNSec(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">كل الشعب</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.stage.name} {s.stage.branch} / {s.letter}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="admin-date"
                  aria-label="تاريخ انتهاء الإشعار"
                  value={nExpires}
                  onChange={e => setNExpires(e.target.value)}
                  title="تاريخ انتهاء الإشعار"
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={nSaving}>
                  <CheckIcon size={16} />
                  <span>{nSaving ? '…' : editingId ? 'حفظ التعديلات' : 'إضافة إشعار'}</span>
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    <CloseIcon size={16} />
                    <span>إلغاء</span>
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="notices">
            {loading && (
              <p className="muted" style={{ padding: '24px 16px', textAlign: 'center' }}>
                جارٍ تحميل الإعلانات…
              </p>
            )}
            {!loading &&
              notices.map(n => (
                <div key={n.id} className={`notice p${n.priority}`}>
                  <div className="notice-header">
                    <strong>{n.title}</strong>
                    <span className={priorityBadgeClass(n.priority)}>{priorityLabel(n.priority)}</span>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          aria-label="تعديل الإشعار"
                          onClick={() => startEditNotice(n)}
                        >
                          <EditIcon size={14} />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          className="btn-del"
                          aria-label="حذف الإشعار"
                          onClick={() => setNoticeToDelete(n)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  {n.body && <p>{n.body}</p>}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                  >
                    <span className="badge">{sectionLabel(n.section_id)}</span>
                    {n.expires_at && (
                      <span className="badge-muted">
                        ينتهي: {new Date(n.expires_at).toLocaleDateString('ar-IQ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            {!loading && !notices.length && <p className="muted">لا إشعارات حالياً</p>}
          </div>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MOBILE EXPERIENCE (≤768px): Header Actions, Filter Pills, Cards, Modal & Preview
          ────────────────────────────────────────────────────────────────────────── */}
      {isMobile && (
        <div className="notices-mobile-only">
          <div className="notices-mobile-header">
            {canEdit && (
              <button
                type="button"
                className="btn btn-primary notices-mobile-add-btn"
                onClick={openNewNoticeMobile}
              >
                <PlusIcon size={18} />
                <span>إضافة إشعار جديد</span>
              </button>
            )}

            {/* Priority Filter Pills */}
            <div className="notice-pills-scroll" role="tablist" aria-label="تصفية حسب الأولوية">
              <button
                type="button"
                role="tab"
                aria-selected={filterPriority === ''}
                className={`notice-pill ${filterPriority === '' ? 'active' : ''}`}
                onClick={() => setFilterPriority('')}
              >
                <span>كل الإعلانات</span>
                <span className="notice-pill-badge">{notices.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterPriority === 3}
                className={`notice-pill ${filterPriority === 3 ? 'active' : ''}`}
                onClick={() => setFilterPriority(3)}
              >
                <span>عاجل</span>
                <span className="notice-pill-badge">
                  {notices.filter(n => n.priority === 3).length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterPriority === 2}
                className={`notice-pill ${filterPriority === 2 ? 'active' : ''}`}
                onClick={() => setFilterPriority(2)}
              >
                <span>مهم</span>
                <span className="notice-pill-badge">
                  {notices.filter(n => n.priority === 2).length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterPriority === 1}
                className={`notice-pill ${filterPriority === 1 ? 'active' : ''}`}
                onClick={() => setFilterPriority(1)}
              >
                <span>عادي</span>
                <span className="notice-pill-badge">
                  {notices.filter(n => n.priority === 1).length}
                </span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="notice-mobile-search-box">
              <SearchIcon size={16} className="notice-mobile-search-icon" />
              <input
                type="text"
                className="notice-mobile-search-input"
                placeholder="بحث في عنوان أو نص الإشعار..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="بحث في الإعلانات"
              />
              {search && (
                <button
                  type="button"
                  className="notice-mobile-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards List */}
          <div className="notices-mobile-list">
            {loading && (
              <p className="muted" style={{ padding: '24px 16px', textAlign: 'center' }}>
                جارٍ تحميل الإعلانات…
              </p>
            )}
            {!loading &&
              filteredNotices.map(n => (
                <div key={`mob-${n.id}`} className={`notice-mobile-card p${n.priority}`}>
                  <div className="notice-mobile-meta">
                    <div className="notice-mobile-badges">
                      <span className={priorityBadgeClass(n.priority)}>
                        {priorityLabel(n.priority)}
                      </span>
                      <span className="badge">{sectionLabel(n.section_id)}</span>
                    </div>
                    <div className="notice-mobile-date">
                      {new Date(n.publish_at).toLocaleDateString('ar-IQ')}
                    </div>
                  </div>

                  <h3 className="notice-mobile-title">{n.title}</h3>

                  {n.body && <p className="notice-mobile-body">{n.body}</p>}

                  {n.expires_at && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      ينتهي في: {new Date(n.expires_at).toLocaleDateString('ar-IQ')}
                    </div>
                  )}

                  <div className="notice-mobile-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary notice-mobile-btn"
                      aria-label={`معاينة إشعار: ${n.title}`}
                      onClick={() => setPreviewNotice(n)}
                    >
                      <EyeIcon size={14} />
                      <span>معاينة</span>
                    </button>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary notice-mobile-btn"
                          aria-label={`تعديل إشعار: ${n.title}`}
                          onClick={() => startEditNotice(n, true)}
                        >
                          <EditIcon size={14} />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          className="btn-del notice-mobile-btn"
                          aria-label={`حذف إشعار: ${n.title}`}
                          onClick={() => setNoticeToDelete(n)}
                        >
                          <TrashIcon size={14} />
                          <span>حذف</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            {!loading && !filteredNotices.length && (
              <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
                {search || filterPriority ? 'لا توجد إعلانات مطابقة للبحث أو التصفية' : 'لا إشعارات حالياً'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          Mobile Modal Form Sheet (≤768px, triggered by Add / Edit)
          ────────────────────────────────────────────────────────────────────────── */}
      {showMobileForm && canEdit && (
        <div
          className="notice-modal-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) closeMobileForm()
          }}
        >
          <div className="notice-modal-sheet" role="dialog" aria-modal="true" aria-label="نموذج الإشعار">
            <div className="notice-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3>{editingId ? 'تعديل الإشعار' : 'إضافة إشعار جديد'}</h3>
                {isFormDirty && <span className="rec-dirty-badge">تعديلات غير محفوظة</span>}
              </div>
              <button
                type="button"
                className="btn-del"
                style={{ padding: 6, minHeight: 'unset' }}
                onClick={closeMobileForm}
                aria-label="إغلاق النموذج"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={saveNotice} className="notice-form-body">
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--muted)',
                    marginBottom: 4,
                  }}
                >
                  عنوان الإشعار *
                </label>
                <input
                  className="notice-input-lg"
                  placeholder="عنوان الإشعار *"
                  aria-label="عنوان الإشعار للموبايل"
                  value={nTitle}
                  onChange={e => setNTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--muted)',
                    marginBottom: 4,
                  }}
                >
                  نص الإشعار (اختياري)
                </label>
                <textarea
                  className="notice-textarea-lg"
                  rows={3}
                  placeholder="اكتب نص وتفاصيل الإشعار هنا..."
                  aria-label="نص الإشعار للموبايل"
                  value={nBody}
                  onChange={e => setNBody(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      color: 'var(--muted)',
                      marginBottom: 4,
                    }}
                  >
                    مستوى الأولوية
                  </label>
                  <select
                    className="notice-input-lg"
                    aria-label="أولوية الإشعار للموبايل"
                    value={nPri}
                    onChange={e => setNPri(Number(e.target.value))}
                  >
                    <option value={1}>عادي</option>
                    <option value={2}>مهم</option>
                    <option value={3}>عاجل</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      color: 'var(--muted)',
                      marginBottom: 4,
                    }}
                  >
                    الجمهور المستهدف
                  </label>
                  <select
                    className="notice-input-lg"
                    aria-label="الشعبة المستهدفة للموبايل"
                    value={nSec}
                    onChange={e => setNSec(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">كل الشعب</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.stage.name} {s.stage.branch} / {s.letter}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--muted)',
                    marginBottom: 4,
                  }}
                >
                  تاريخ انتهاء الصلاحية (اختياري)
                </label>
                <input
                  type="date"
                  className="notice-input-lg"
                  aria-label="تاريخ انتهاء الإشعار للموبايل"
                  value={nExpires}
                  onChange={e => setNExpires(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', minHeight: 44, justifyContent: 'center' }}
                  onClick={handlePreviewDraft}
                >
                  <EyeIcon size={16} />
                  <span>معاينة قبل النشر</span>
                </button>
              </div>

              <div className="notice-modal-footer">
                <button
                  type="submit"
                  className="btn btn-primary rec-btn-action"
                  disabled={nSaving}
                  aria-label="حفظ ونشر الإشعار"
                >
                  <CheckIcon size={16} />
                  <span>{nSaving ? '…' : editingId ? 'حفظ التعديلات' : 'حفظ ونشر'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary rec-btn-action"
                  onClick={closeMobileForm}
                >
                  <CloseIcon size={16} />
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          Mobile Live Preview Sheet (Preview before publishing or on demand)
          ────────────────────────────────────────────────────────────────────────── */}
      {previewNotice && (
        <div
          className="notice-preview-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewNotice(null)
          }}
        >
          <div
            className="notice-preview-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="معاينة الإشعار"
          >
            <div className="notice-preview-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#FFFFFF' }}>معاينة الإشعار</h3>
              <button
                type="button"
                className="btn-del"
                style={{ padding: 4, minHeight: 'unset' }}
                onClick={() => setPreviewNotice(null)}
                aria-label="إغلاق المعاينة"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="notice-preview-card">
              <div className="notice-preview-school-brand">
                إعدادية الرميلة للبنين • إشعار رسمي
              </div>

              <div className="notice-preview-meta-row">
                <span className={priorityBadgeClass(previewNotice.priority)}>
                  {priorityLabel(previewNotice.priority)}
                </span>
                <span className="badge">
                  موجّه إلى: {sectionLabel(previewNotice.section_id)}
                </span>
                <span className="badge-muted">
                  {previewNotice.publish_at
                    ? new Date(previewNotice.publish_at).toLocaleDateString('ar-IQ')
                    : 'اليوم'}
                </span>
              </div>

              <h4 className="notice-preview-title">{previewNotice.title}</h4>

              {previewNotice.body && (
                <p className="notice-preview-body-text">{previewNotice.body}</p>
              )}

              {previewNotice.expires_at && (
                <div className="notice-preview-expiry">
                  ينتهي هذا الإشعار بتاريخ:{' '}
                  {new Date(previewNotice.expires_at).toLocaleDateString('ar-IQ')}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', minHeight: 46, justifyContent: 'center', borderRadius: 10 }}
                onClick={() => setPreviewNotice(null)}
              >
                <span>إغلاق المعاينة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          Safe Deletion Confirmation Dialog (RT-02)
          ────────────────────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(noticeToDelete)}
        title="تأكيد حذف الإشعار"
        message={`هل أنت متأكد من حذف الإشعار "${noticeToDelete?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        isDestructive={true}
        busy={isDeleting}
        onConfirm={confirmDeleteNotice}
        onCancel={() => {
          if (!isDeleting) setNoticeToDelete(null)
        }}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          Toast Feedback
          ────────────────────────────────────────────────────────────────────────── */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
