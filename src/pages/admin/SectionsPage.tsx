import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'
import {
  PlusIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
  GraduationCapIcon,
} from '../../components/Icons'

interface SectionRow {
  id: number
  letter: string
  active: boolean
  stage: { id: number; name: string; branch: string }
  year: { id: number; label: string }
  studentCount: number
}

interface StageOpt { id: number; name: string; branch: string }
interface YearOpt { id: number; label: string }

export default function SectionsPage() {
  const { ready, role } = useAdmin()
  const [sections, setSections] = useState<SectionRow[]>([])
  const [stages, setStages] = useState<StageOpt[]>([])
  const [years, setYears] = useState<YearOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SectionRow | null>(null)
  const [stageId, setStageId] = useState<number | ''>('')
  const [yearId, setYearId] = useState<number | ''>('')
  const [letter, setLetter] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (!ready) return
    void load()
  }, [ready])

  async function load() {
    setLoading(true)
    const [secR, stgR, yrR, stuR] = await Promise.all([
      supabase.from('sections').select('id, letter, active, stage:stages(id, name, branch), year:academic_years(id, label)').order('letter'),
      supabase.from('stages').select('id, name, branch').order('sort'),
      supabase.from('academic_years').select('id, label').order('id', { ascending: false }),
      supabase.from('students').select('section_id').eq('active', true),
    ])

    setStages((stgR.data ?? []) as StageOpt[])
    setYears((yrR.data ?? []) as YearOpt[])

    const countBySec = new Map<number, number>()
    for (const s of (stuR.data ?? []) as { section_id: number }[]) {
      countBySec.set(s.section_id, (countBySec.get(s.section_id) ?? 0) + 1)
    }

    type RawSec = {
      id: number; letter: string; active: boolean
      stage: { id: number; name: string; branch: string }
      year: { id: number; label: string }
    }
    const rawSecs = (secR.data ?? []) as unknown as RawSec[]
    setSections(rawSecs.map(s => ({
      ...s,
      studentCount: countBySec.get(s.id) ?? 0,
    })))
    setLoading(false)
  }

  function startAdd() {
    setEditing(null)
    setStageId(stages[0]?.id ?? '')
    setYearId(years[0]?.id ?? '')
    setLetter('')
    setShowForm(true)
  }

  function startEdit(s: SectionRow) {
    setEditing(s)
    setStageId(s.stage.id)
    setYearId(s.year.id)
    setLetter(s.letter)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!stageId || !yearId || !letter.trim()) return
    setSaving(true)

    const payload = {
      stage_id: Number(stageId),
      year_id: Number(yearId),
      letter: letter.trim(),
      active: true,
    }

    if (editing) {
      const { error } = await supabase.from('sections').update(payload).eq('id', editing.id)
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تم تعديل الشعبة ✓', 'success')
    } else {
      const extKey = `SEC-${Date.now().toString(36).toUpperCase()}`
      const { error } = await supabase.from('sections').insert({ ...payload, external_key: extKey })
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تمت إضافة الشعبة ✓', 'success')
    }

    setShowForm(false)
    setEditing(null)
    await load()
    setSaving(false)
  }

  if (!ready || loading) return <Spinner />

  return (
    <div className="dash-page" dir="rtl">
      <div className="dash-toolbar">
        <div>
          <h2 className="dash-page-title">الشعب الدراسية</h2>
          <span className="muted">{sections.filter(s => s.active).length} شعبة فعّالة</span>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={startAdd}>
            <PlusIcon size={16} />
            <span>إضافة شعبة</span>
          </button>
        )}
      </div>

      {showForm && (
        <form className="dash-form" onSubmit={handleSave}>
          <h3 className="dash-form-title">{editing ? 'تعديل الشعبة' : 'إضافة شعبة جديدة'}</h3>
          <div className="dash-form-grid">
            <label>
              <span>العام الدراسي *</span>
              <select className="admin-select" value={yearId} onChange={e => setYearId(Number(e.target.value))} required>
                <option value="">اختر…</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
              </select>
            </label>
            <label>
              <span>المرحلة والفرع *</span>
              <select className="admin-select" value={stageId} onChange={e => setStageId(Number(e.target.value))} required>
                <option value="">اختر…</option>
                {stages.map(st => <option key={st.id} value={st.id}>{st.name} {st.branch}</option>)}
              </select>
            </label>
            <label>
              <span>حرف الشعبة *</span>
              <input value={letter} onChange={e => setLetter(e.target.value)} required placeholder="أ ، ب ، ج…" maxLength={5} />
            </label>
          </div>
          <div className="dash-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <CheckIcon size={16} />
              <span>{saving ? '…' : 'حفظ'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowForm(false); setEditing(null) }}
            >
              <CloseIcon size={16} />
              <span>إلغاء</span>
            </button>
          </div>
        </form>
      )}

      <div className="dash-cards-grid">
        {sections.map(s => (
          <div key={s.id} className="dash-sec-card">
            <div className="dash-sec-header">
              <strong className="dash-sec-name">{s.stage.name} {s.stage.branch} / {s.letter}</strong>
              <span className={`dash-badge ${s.active ? 'dash-badge--ok' : 'dash-badge--off'}`}>
                {s.active ? 'فعّالة' : 'معطّلة'}
              </span>
            </div>
            <div className="dash-sec-meta">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <GraduationCapIcon size={15} />
                <span>{s.studentCount} طالب</span>
              </span>
              <span className="muted">{s.year.label}</span>
            </div>
            {canEdit && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => startEdit(s)}
                >
                  <EditIcon size={14} />
                  <span>تعديل</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
