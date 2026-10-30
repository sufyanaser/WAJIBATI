import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import { Toast, useToast } from '../../components/Toast'
import { CheckIcon, CloseIcon, EditIcon, TrashIcon } from '../../components/Icons'

interface Section { id: number; letter: string; stage: { name: string; branch: string } }
interface Notice {
  id: string; title: string; body: string | null
  priority: number; section_id: number | null
  publish_at: string; expires_at: string | null
}

export default function NoticesPage() {
  const nav = useNavigate()
  const adminCtx = useAdmin()
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>(adminCtx.ready ? adminCtx.role : 'editor')
  const canEdit = role === 'owner' || role === 'editor'
  const [sections, setSections] = useState<Section[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nTitle, setNTitle] = useState('')
  const [nBody, setNBody] = useState('')
  const [nPri, setNPri] = useState(1)
  const [nSec, setNSec] = useState<number | ''>('')
  const [nExpires, setNExpires] = useState('')
  const [nSaving, setNSaving] = useState(false)
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  useEffect(() => {
    if (adminCtx.ready) {
      setRole(adminCtx.role)
    }
  }, [adminCtx.ready, adminCtx.role])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/admin/login'); return }
      const { data: adm } = await supabase.from('admins').select('role').eq('user_id', data.session.user.id).maybeSingle()
      if (!adm) { await supabase.auth.signOut(); nav('/admin/login'); return }
      if (adm.role) setRole(adm.role as 'owner' | 'editor' | 'viewer')
    })
  }, [nav])

  useEffect(() => {
    supabase.from('sections')
      .select('id, letter, stage:stages(name, branch)')
      .order('letter')
      .then(({ data }) => setSections((data ?? []) as unknown as Section[]))

    loadNotices()
  }, [])

  async function loadNotices() {
    const { data } = await supabase.from('notices')
      .select('id, title, body, priority, section_id, publish_at, expires_at')
      .order('created_at', { ascending: false }).limit(30)
    setNotices((data ?? []) as unknown as Notice[])
  }

  function resetForm() {
    setEditingId(null)
    setNTitle('')
    setNBody('')
    setNPri(1)
    setNSec('')
    setNExpires('')
  }

  function startEditNotice(n: Notice) {
    setEditingId(n.id)
    setNTitle(n.title)
    setNBody(n.body ?? '')
    setNPri(n.priority)
    setNSec(n.section_id ?? '')
    setNExpires(n.expires_at ? n.expires_at.slice(0, 10) : '')
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
    } else {
      await supabase.from('notices').insert({
        ...payload,
        publish_at: new Date().toISOString(),
      })
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

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 14 }}>
      {/* Role-based create/edit form barrier (RT-06) */}
      {canEdit ? (
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
      ) : (
        <div className="card" style={{ padding: '14px 18px', borderRight: '4px solid var(--accent)', background: 'var(--card)' }}>
          <p style={{ margin: 0, fontSize: '.88rem', color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
            <strong>وضع المشاهدة (Viewer):</strong> تصفح الإعلانات متاح للقراءة فقط. لإضافة إشعار جديد أو تعديل أو حذف إشعار سابق، يلزم تسجيل الدخول بحساب محرر أو مالك النظام.
          </p>
        </div>
      )}

      <div className="notices">
        {notices.map(n => (
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
              <span className="badge">{sectionLabel(n.section_id)}</span>
              {n.expires_at && (
                <span className="badge-muted">
                  ينتهي: {new Date(n.expires_at).toLocaleDateString('ar-IQ')}
                </span>
              )}
            </div>
          </div>
        ))}
        {!notices.length && <p className="muted">لا إشعارات حالياً</p>}
      </div>

      {/* Safe Deletion Confirmation Dialog (RT-02) */}
      <ConfirmDialog
        isOpen={Boolean(noticeToDelete)}
        title="تأكيد حذف الإشعار"
        message={`هل أنت متأكد من حذف الإشعار "${noticeToDelete?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        isDestructive={true}
        busy={isDeleting}
        onConfirm={confirmDeleteNotice}
        onCancel={() => { if (!isDeleting) setNoticeToDelete(null) }}
      />

      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={clearToast}
        />
      )}
    </div>
  )
}
