import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminShell'
import { Spinner } from '../../components/Spinner'
import { Toast, useToast } from '../../components/Toast'
import { PlusIcon, EditIcon, CheckIcon, CloseIcon } from '../../components/Icons'

interface SubjectRow {
  id: number
  external_key: string | null
  name: string
  color: string | null
  sort: number
}

export default function SubjectsPage() {
  const { ready, role } = useAdmin()
  const [rows, setRows] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SubjectRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3D84C8')
  const [sort, setSort] = useState(10)
  const [saving, setSaving] = useState(false)
  const { toast, show: showToast, clear: clearToast } = useToast()

  const canEdit = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (!ready) return
    void load()
  }, [ready])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('subjects').select('id, external_key, name, color, sort').order('sort')
    setRows((data ?? []) as SubjectRow[])
    setLoading(false)
  }

  function startAdd() {
    setEditing(null)
    setName('')
    setColor('#3D84C8')
    setSort((rows.length + 1) * 10)
    setShowForm(true)
  }

  function startEdit(r: SubjectRow) {
    setEditing(r)
    setName(r.name)
    setColor(r.color ?? '#3D84C8')
    setSort(r.sort)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    if (editing) {
      const { error } = await supabase
        .from('subjects')
        .update({ name: name.trim(), color, sort })
        .eq('id', editing.id)
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تم تعديل المادة ✓', 'success')
    } else {
      const extKey = `SUB-${Date.now().toString(36).toUpperCase()}`
      const { error } = await supabase
        .from('subjects')
        .insert({ external_key: extKey, name: name.trim(), color, sort })
      if (error) { showToast(`خطأ: ${error.message}`, 'error'); setSaving(false); return }
      showToast('تمت إضافة المادة ✓', 'success')
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
          <h2 className="dash-page-title">المواد الدراسية</h2>
          <span className="muted">{rows.length} مادة مسجلة</span>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={startAdd}>
            <PlusIcon size={16} />
            <span>إضافة مادة</span>
          </button>
        )}
      </div>

      {showForm && (
        <form className="dash-form" onSubmit={handleSave}>
          <h3 className="dash-form-title">{editing ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h3>
          <div className="dash-form-grid">
            <label>
              <span>اسم المادة *</span>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="مثال: الرياضيات" />
            </label>
            <label>
              <span>اللون</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 48, height: 38, padding: 2, cursor: 'pointer' }} />
                <input value={color} onChange={e => setColor(e.target.value)} dir="ltr" style={{ flex: 1 }} />
              </div>
            </label>
            <label>
              <span>الترتيب</span>
              <input type="number" value={sort} onChange={e => setSort(Number(e.target.value))} />
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

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اللون</th>
              <th>اسم المادة</th>
              <th>الترتيب</th>
              {canEdit && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="muted">{i + 1}</td>
                <td>
                  <span
                    className="dash-color-dot"
                    style={{ background: r.color ?? '#8899AA' }}
                  />
                </td>
                <td><strong>{r.name}</strong></td>
                <td className="muted">{r.sort}</td>
                {canEdit && (
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => startEdit(r)}
                    >
                      <EditIcon size={14} />
                      <span>تعديل</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
