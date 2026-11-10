import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'
import { PageHeader } from '../../components/admin/PageHeader'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { PlusIcon, EditIcon, CheckIcon, CloseIcon, TrashIcon } from '../../components/Icons'

interface StudentRow {
  id: number
  full_name: string
  notes: string | null
  active: boolean
  section_id: number
  section_label: string
  guardians: { guardian_id: string; full_name: string | null; phone: string; relation: string | null }[]
}

interface SectionOpt { id: number; label: string }
interface GuardianOpt { id: string; label: string }

export default function StudentsPage() {
  const { ready, role } = useAdmin()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [sections, setSections] = useState<SectionOpt[]>([])
  const [guardiansList, setGuardiansList] = useState<GuardianOpt[]>([])
  const [filterSec, setFilterSec] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StudentRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [sectionId, setSectionId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [guardianId, setGuardianId] = useState<string>('')
  const [relation, setRelation] = useState('أب')
  const [saving, setSaving] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  // Initial form values tracker for unsaved edits protection
  const [initialFormValues, setInitialFormValues] = useState<{
    fullName: string
    sectionId: number | ''
    notes: string
    guardianId: string
    relation: string
  }>({ fullName: '', sectionId: '', notes: '', guardianId: '', relation: 'أب' })

  const isFormDirty = showForm && (
    fullName !== initialFormValues.fullName ||
    sectionId !== initialFormValues.sectionId ||
    notes !== initialFormValues.notes ||
    guardianId !== initialFormValues.guardianId ||
    relation !== initialFormValues.relation
  )

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
      if (target.closest('.rec-modal-sheet, .dash-form')) return

      const confirmed = window.confirm('لديك تعديلات غير محفوظة في النموذج. هل تريد مغادرة الصفحة وتجاهل التعديلات؟')
      if (!confirmed) {
        e.preventDefault()
        e.stopPropagation()
      } else {
        setShowForm(false)
        setEditing(null)
      }
    }

    function handlePopState() {
      const confirmed = window.confirm('لديك تعديلات غير محفوظة في النموذج. هل تريد الرجوع وتجاهل التعديلات؟')
      if (!confirmed) {
        window.history.pushState(null, '', window.location.href)
      } else {
        setShowForm(false)
        setEditing(null)
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
    if (!ready) return
    void load()
  }, [ready])

  async function load() {
    setLoading(true)
    const [stuR, secR, gsR, gListR] = await Promise.all([
      supabase.from('students')
        .select('id, full_name, notes, active, section_id, section:sections(letter, stage:stages(name, branch))')
        .order('full_name'),
      supabase.from('sections')
        .select('id, letter, stage:stages(name, branch)')
        .eq('active', true)
        .order('letter'),
      supabase.from('guardian_students')
        .select('student_id, guardian_id, relation, guardian:guardians(full_name, phone)'),
      supabase.from('guardians')
        .select('id, full_name, phone')
        .eq('active', true)
        .order('full_name'),
    ])

    type RawSec = { id: number; letter: string; stage: { name: string; branch: string } }
    const secs = (secR.data ?? []) as unknown as RawSec[]
    setSections(secs.map(s => ({ id: s.id, label: `${s.stage.name} ${s.stage.branch} / ${s.letter}` })))

    const gOpts = (gListR.data ?? []) as { id: string; full_name: string | null; phone: string }[]
    setGuardiansList(gOpts.map(g => ({ id: g.id, label: `${g.full_name ?? ''} (${g.phone})` })))

    type RawGS = {
      student_id: number
      guardian_id: string
      relation: string | null
      guardian: { full_name: string | null; phone: string } | null
    }
    const gsByStu = new Map<number, { guardian_id: string; full_name: string | null; phone: string; relation: string | null }[]>()
    for (const g of (gsR.data ?? []) as unknown as RawGS[]) {
      if (!g.guardian) continue
      const arr = gsByStu.get(g.student_id) ?? []
      arr.push({ guardian_id: g.guardian_id, full_name: g.guardian.full_name, phone: g.guardian.phone, relation: g.relation })
      gsByStu.set(g.student_id, arr)
    }

    type RawStu = {
      id: number; full_name: string; notes: string | null; active: boolean; section_id: number
      section: { letter: string; stage: { name: string; branch: string } } | null
    }
    const rawStudents = (stuR.data ?? []) as unknown as RawStu[]
    setStudents(rawStudents.map(s => ({
      id: s.id,
      full_name: s.full_name,
      notes: s.notes,
      active: s.active,
      section_id: s.section_id,
      section_label: s.section ? `${s.section.stage.name} ${s.section.stage.branch} / ${s.section.letter}` : '',
      guardians: gsByStu.get(s.id) ?? [],
    })))
    setLoading(false)
  }

  function startAdd() {
    setEditing(null)
    const initSec = filterSec || sections[0]?.id || ''
    setFullName('')
    setSectionId(initSec)
    setNotes('')
    setGuardianId('')
    setRelation('أب')
    setInitialFormValues({
      fullName: '',
      sectionId: initSec,
      notes: '',
      guardianId: '',
      relation: 'أب',
    })
    setSelectedStudent(null)
    setShowForm(true)
  }

  function startEdit(s: StudentRow) {
    setEditing(s)
    const initName = s.full_name
    const initSec = s.section_id
    const initNotes = s.notes ?? ''
    const initGId = s.guardians[0]?.guardian_id ?? ''
    const initRel = s.guardians[0]?.relation ?? 'أب'
    setFullName(initName)
    setSectionId(initSec)
    setNotes(initNotes)
    setGuardianId(initGId)
    setRelation(initRel)
    setInitialFormValues({
      fullName: initName,
      sectionId: initSec,
      notes: initNotes,
      guardianId: initGId,
      relation: initRel,
    })
    setSelectedStudent(null)
    setShowForm(true)
  }

  function handleCancelForm() {
    if (isFormDirty) {
      if (!window.confirm('لديك تعديلات غير محفوظة. هل تريد تجاهل التعديلات وإغلاق النموذج؟')) {
        return
      }
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !sectionId) return
    setSaving(true)

    const payload = {
      full_name: fullName.trim(),
      section_id: Number(sectionId),
      notes: notes.trim() || null,
      active: true,
    }

    if (editing) {
      const { error } = await supabase.from('students').update(payload).eq('id', editing.id)
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }

      if (guardianId) {
        await supabase.from('guardian_students').upsert({
          guardian_id: guardianId,
          student_id: editing.id,
          relation: relation.trim() || null,
        })
      }

      showToast('تم تعديل بيانات الطالب ✓', 'success')
    } else {
      const extKey = `STU-${Date.now().toString(36).toUpperCase()}`
      const { data: newStu, error } = await supabase
        .from('students')
        .insert({ ...payload, external_key: extKey })
        .select('id')
        .single()

      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }

      if (newStu?.id && guardianId) {
        await supabase.from('guardian_students').insert({
          guardian_id: guardianId,
          student_id: newStu.id,
          relation: relation.trim() || null,
        })
      }

      showToast('تمت إضافة الطالب ✓', 'success')
    }

    setShowForm(false)
    setEditing(null)
    await load()
    setSaving(false)
  }

  async function toggleActive(s: StudentRow) {
    const newActive = !s.active
    if (!newActive) {
      if (!window.confirm(`هل أنت متأكد من تعطيل حساب الطالب "${s.full_name}"؟`)) {
        return
      }
    }
    const { error } = await supabase.from('students').update({ active: newActive }).eq('id', s.id)
    if (error) { showToast(`خطأ: ${error.message}`, 'error'); return }
    showToast(newActive ? 'تم تفعيل الطالب' : 'تم تعطيل الطالب', 'info')
    if (selectedStudent?.id === s.id) {
      setSelectedStudent(prev => prev ? { ...prev, active: newActive } : null)
    }
    await load()
  }

  if (!ready || loading) return <Spinner />

  const filtered = students.filter(s => {
    if (filterSec && s.section_id !== filterSec) return false
    if (search.trim() && !s.full_name.includes(search.trim())) return false
    return true
  })

  return (
    <div className="dash-page" dir="rtl">
      <PageHeader
        title="دليل الطلاب وقوائم الفصول"
        subtitle={`عرض ${filtered.length} من أصل ${students.length} طالب مسجل`}
        badgeText={`${students.length} طالب`}
        badgeVariant="blue"
        actions={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={startAdd} aria-label="إضافة طالب جديد">
              <PlusIcon size={16} />
              <span>إضافة طالب جديد</span>
            </button>
          ) : undefined
        }
      />

      {/* Mobile Horizontal Section Filter Pills */}
      <div className="rec-section-pills-scroll" role="tablist" aria-label="تصفية الشعب">
        <button
          type="button"
          role="tab"
          aria-selected={filterSec === ''}
          className={`rec-section-pill ${filterSec === '' ? 'active' : ''}`}
          onClick={() => setFilterSec('')}
        >
          <span>كل الشعب</span>
          <span className="badge-muted" style={{ padding: '1px 6px', fontSize: '.7rem', borderRadius: 8 }}>
            {students.length}
          </span>
        </button>
        {sections.map(s => {
          const isSelected = filterSec === s.id
          const count = students.filter(stu => stu.section_id === s.id).length
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`rec-section-pill ${isSelected ? 'active' : ''}`}
              onClick={() => setFilterSec(s.id)}
            >
              <span>{s.label}</span>
              <span className="badge-muted" style={{ padding: '1px 6px', fontSize: '.7rem', borderRadius: 8 }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filters (Search & Select) */}
      <div className="dash-filters">
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            className="search-input"
            placeholder="بحث باسم الطالب…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="بحث باسم الطالب"
          />
          {search && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearch('')}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', minWidth: 28, minHeight: 28 }}
              aria-label="مسح البحث"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
        <select
          className="admin-select"
          style={{ width: 'auto', minWidth: 170 }}
          value={filterSec}
          onChange={e => setFilterSec(e.target.value ? Number(e.target.value) : '')}
          aria-label="تصفية حسب الشعبة"
        >
          <option value="">كل الشعب</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Mobile Form Dialog / Bottom Sheet */}
      {showForm && (
        <div className="rec-modal-backdrop" onClick={handleCancelForm}>
          <form className="dash-form rec-modal-sheet" onSubmit={handleSave} onClick={e => e.stopPropagation()}>
            <div className="rec-sheet-header">
              <div>
                <h3 className="dash-form-title">{editing ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                {isFormDirty && <span className="rec-dirty-badge" role="status">⚠️ تعديلات غير محفوظة</span>}
              </div>
              <button type="button" className="icon-btn" onClick={handleCancelForm} aria-label="إغلاق النموذج">
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="dash-form-grid">
              <label>
                <span>الاسم الكامل *</span>
                <input
                  className="tt-select-lg"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="الاسم الرباعي للطالب"
                  aria-label="الاسم الكامل"
                />
              </label>
              <label>
                <span>الشعبة الدراسية *</span>
                <select
                  className="admin-select tt-select-lg"
                  value={sectionId}
                  onChange={e => setSectionId(Number(e.target.value))}
                  required
                  aria-label="الشعبة الدراسية"
                >
                  <option value="">اختر الشعبة…</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label>
                <span>ربط بولي أمر</span>
                <select
                  className="admin-select tt-select-lg"
                  value={guardianId}
                  onChange={e => setGuardianId(e.target.value)}
                  aria-label="ربط بولي أمر"
                >
                  <option value="">بدون ربط حالياً</option>
                  {guardiansList.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>صلة القرابة</span>
                <select
                  className="admin-select tt-select-lg"
                  value={relation}
                  onChange={e => setRelation(e.target.value)}
                  aria-label="صلة القرابة"
                >
                  <option value="أب">أب</option>
                  <option value="أم">أم</option>
                  <option value="أخ">أخ</option>
                  <option value="ولي أمر">ولي أمر</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>ملاحظات إضافية</span>
                <input
                  className="tt-select-lg"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ملاحظات صحية أو إدارية (اختياري)"
                  aria-label="ملاحظات إضافية"
                />
              </label>
            </div>
            <div className="dash-form-actions rec-form-actions">
              <button type="submit" className="btn btn-primary rec-btn-action" disabled={saving}>
                <CheckIcon size={16} />
                <span>{saving ? '…' : 'حفظ'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary rec-btn-action"
                onClick={handleCancelForm}
              >
                <CloseIcon size={16} />
                <span>إلغاء</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dedicated Mobile Detail Panel */}
      {selectedStudent && (
        <div className="rec-detail-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="rec-detail-sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="تفاصيل سجل الطالب">
            <div className="rec-detail-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="admin-mobile-avatar">
                  {selectedStudent.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="admin-mobile-card-title">{selectedStudent.full_name}</h3>
                  <span className="muted" style={{ fontSize: '.8rem' }}>سجل الطالب الأكاديمي</span>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setSelectedStudent(null)} aria-label="إغلاق التفاصيل">
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="rec-detail-grid">
              <div className="rec-detail-item">
                <span className="rec-detail-item-label">حالة القيد</span>
                <div>
                  <StatusBadge
                    variant={selectedStudent.active ? 'active' : 'suspended'}
                    label={selectedStudent.active ? 'قيد فعّال ومسجل' : 'قيد معطّل وموقوف'}
                  />
                </div>
              </div>

              <div className="rec-detail-item">
                <span className="rec-detail-item-label">المرحلة والشعبة</span>
                <span className="rec-detail-item-value">{selectedStudent.section_label || 'غير مسكن في شعبة'}</span>
              </div>

              <div className="rec-detail-item">
                <span className="rec-detail-item-label">أولياء الأمور المرتبطون</span>
                {selectedStudent.guardians.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {selectedStudent.guardians.map((g, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span>
                          <strong>{g.full_name || 'ولي أمر'}</strong>
                          <span className="muted"> ({g.relation || 'ولي أمر'})</span>
                        </span>
                        <a href={`tel:${g.phone}`} className="rec-detail-phone-link" aria-label={`اتصال بولي الأمر ${g.phone}`}>
                          📞 {g.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: '.88rem' }}>لا يوجد ولي أمر مرتبط حالياً</span>
                )}
              </div>

              {selectedStudent.notes && (
                <div className="rec-detail-item">
                  <span className="rec-detail-item-label">ملاحظات</span>
                  <span className="rec-detail-item-value" style={{ fontWeight: 400, color: '#C8D8EB' }}>
                    {selectedStudent.notes}
                  </span>
                </div>
              )}
            </div>

            <div className="rec-detail-actions">
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-primary rec-btn-action"
                  onClick={() => startEdit(selectedStudent)}
                >
                  <EditIcon size={15} />
                  <span>تعديل السجل</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className={`btn ${selectedStudent.active ? 'btn-danger' : 'btn-success'} rec-btn-action`}
                  onClick={() => void toggleActive(selectedStudent)}
                >
                  {selectedStudent.active ? <TrashIcon size={15} /> : <CheckIcon size={15} />}
                  <span>{selectedStudent.active ? 'تعطيل الحساب' : 'تفعيل الحساب'}</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary rec-btn-action"
                style={{ gridColumn: canEdit ? undefined : '1 / -1' }}
                onClick={() => setSelectedStudent(null)}
              >
                <span>إغلاق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="dash-table-wrap dash-table-desktop">
        <table className="dash-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الطالب</th>
              <th>الشعبة</th>
              <th>ولي الأمر</th>
              <th>الحالة</th>
              {canEdit && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className={!s.active ? 'dash-row-inactive' : ''}>
                <td className="muted">{i + 1}</td>
                <td><strong>{s.full_name}</strong></td>
                <td><span className="badge">{s.section_label}</span></td>
                <td className="muted">
                  {s.guardians.length > 0
                    ? s.guardians.map(g => `${g.full_name ?? ''} (${g.phone})`).join(' ، ')
                    : 'غير مرتبط'}
                </td>
                <td>
                  <StatusBadge
                    variant={s.active ? 'active' : 'suspended'}
                    label={s.active ? 'فعّال' : 'معطّل'}
                  />
                </td>
                {canEdit && (
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEdit(s)}
                      >
                        <EditIcon size={14} />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${s.active ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => void toggleActive(s)}
                      >
                        {s.active ? <TrashIcon size={14} /> : <CheckIcon size={14} />}
                        <span>{s.active ? 'تعطيل' : 'تفعيل'}</span>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  لا توجد نتائج مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Compact Cards View */}
      <div className="dash-cards-mobile">
        {filtered.map(s => (
          <div
            key={s.id}
            className={`admin-mobile-card clickable ${!s.active ? 'dash-row-inactive' : ''}`}
            onClick={() => setSelectedStudent(s)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedStudent(s)
              }
            }}
            aria-label={`بطاقة الطالب: ${s.full_name} - ${s.section_label}`}
          >
            <div className="admin-mobile-card-header">
              <div className="admin-mobile-card-top">
                <div className="admin-mobile-avatar">
                  {s.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="admin-mobile-card-title">{s.full_name}</h3>
                  <span className="badge" style={{ marginTop: 2, display: 'inline-block' }}>{s.section_label}</span>
                </div>
              </div>
              <span className={`dash-badge ${s.active ? 'dash-badge--ok' : 'dash-badge--off'}`}>
                {s.active ? 'مفعّل' : 'معطّل'}
              </span>
            </div>

            <div className="admin-mobile-card-body">
              <div className="admin-mobile-card-row">
                <span className="admin-mobile-card-label">ولي الأمر:</span>
                <span className="muted">
                  {s.guardians.length > 0
                    ? `${s.guardians[0].full_name ?? ''} (${s.guardians[0].relation || 'ولي أمر'})`
                    : 'غير مرتبط'}
                </span>
              </div>
            </div>

            <div className="admin-mobile-card-actions" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedStudent(s)}
                aria-label={`عرض تفاصيل ${s.full_name}`}
              >
                <span>عرض التفاصيل</span>
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => startEdit(s)}
                  aria-label={`تعديل ${s.full_name}`}
                >
                  <EditIcon size={14} />
                  <span>تعديل</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className={`btn btn-sm ${s.active ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => void toggleActive(s)}
                  aria-label={s.active ? `تعطيل ${s.full_name}` : `تفعيل ${s.full_name}`}
                >
                  {s.active ? <TrashIcon size={14} /> : <CheckIcon size={14} />}
                  <span>{s.active ? 'تعطيل' : 'تفعيل'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', padding: 20 }}>
            لا توجد نتائج مطابقة
          </p>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
