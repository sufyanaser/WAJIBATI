import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Stats {
  sections: number
  students: number
  guardians: number
  teachers: number
  homeworkToday: number
  noticesActive: number
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 12,
}

const numStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  color: 'var(--accent)',
  lineHeight: 1,
}

const labelStyle: React.CSSProperties = {
  fontSize: '.82rem',
  color: 'var(--muted)',
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toLocaleDateString('en-CA')
      const [secs, studs, guards, teachers, hw, notices] = await Promise.all([
        supabase.from('sections').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('guardians').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('homework').select('id', { count: 'exact', head: true })
          .eq('due_date', today).eq('status', 'published'),
        supabase.from('notices').select('id', { count: 'exact', head: true })
          .lte('publish_at', new Date().toISOString())
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()),
      ])
      setStats({
        sections: secs.count ?? 0,
        students: studs.count ?? 0,
        guardians: guards.count ?? 0,
        teachers: teachers.count ?? 0,
        homeworkToday: hw.count ?? 0,
        noticesActive: notices.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="muted">جارٍ التحميل…</p>
  if (!stats) return null

  return (
    <div dir="rtl" style={{ display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--fg)' }}>نظرة عامة</h2>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <span style={numStyle}>{stats.homeworkToday}</span>
          <span style={labelStyle}>واجب اليوم (منشور)</span>
        </div>
        <div style={cardStyle}>
          <span style={numStyle}>{stats.sections}</span>
          <span style={labelStyle}>الشعب الفعالة</span>
        </div>
        <div style={cardStyle}>
          <span style={numStyle}>{stats.students}</span>
          <span style={labelStyle}>الطلاب</span>
        </div>
        <div style={cardStyle}>
          <span style={numStyle}>{stats.guardians}</span>
          <span style={labelStyle}>أولياء الأمور</span>
        </div>
        <div style={cardStyle}>
          <span style={numStyle}>{stats.teachers}</span>
          <span style={labelStyle}>المدرسون</span>
        </div>
        <div style={cardStyle}>
          <span style={numStyle}>{stats.noticesActive}</span>
          <span style={labelStyle}>الإشعارات الفعالة</span>
        </div>
      </div>
    </div>
  )
}
