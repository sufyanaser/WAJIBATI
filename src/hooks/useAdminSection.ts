import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── types ──────────────────────────────────────────────────────────────────────

interface TtSlot {
  period: number
  subject: { id: number; name: string; color: string | null } | null
  teacher: { id: number; full_name: string } | null
}

interface HwRow {
  id: string
  period: number
  body: string
  status: 'draft' | 'published' | 'archived'
}

export interface PeriodSlot {
  period: number
  subject_id: number | null
  teacher_id: number | null
  subject: string
  teacher: string
  hw_id: string | null
  body: string
  status: 'draft' | 'published' | 'archived' | null
}

export interface UseAdminSectionResult {
  periods: PeriodSlot[]
  loading: boolean
  setBodies: (bodies: Record<number, string>) => void
  save: () => Promise<void>
  publish: () => Promise<void>
}

// ── hook ───────────────────────────────────────────────────────────────────────

export function useAdminSection(
  sectionId: string,
  date: string,
): UseAdminSectionResult {
  const [periods, setPeriods] = useState<PeriodSlot[]>([])
  const [loading, setLoading] = useState(false)

  // bodies are stored as an override map so callers can edit without re-fetching
  const [bodyOverrides, setBodyOverrides] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    if (!sectionId || !date) return
    setLoading(true)
    const sid = Number(sectionId)
    const weekday = new Date(date + 'T00:00:00').getDay()

    const [ttR, hwR] = await Promise.all([
      supabase
        .from('timetable')
        .select('period, subject:subjects(id, name, color), teacher:teachers(id, full_name)')
        .eq('section_id', sid)
        .eq('weekday', weekday)
        .order('period'),
      supabase
        .from('homework')
        .select('id, period, body, status')
        .eq('section_id', sid)
        .eq('due_date', date),
    ])

    const tt = (ttR.data ?? []) as unknown as TtSlot[]
    const hw = (hwR.data ?? []) as unknown as HwRow[]
    const hwMap = new Map(hw.map(r => [r.period, r]))

    const slots: PeriodSlot[] = Array.from({ length: 6 }, (_, i) => {
      const period = i + 1
      const slot = tt.find(s => s.period === period)
      const ex = hwMap.get(period)
      return {
        period,
        subject_id: slot?.subject?.id ?? null,
        teacher_id: slot?.teacher?.id ?? null,
        subject: slot?.subject?.name ?? '',
        teacher: slot?.teacher?.full_name ?? '',
        hw_id: ex?.id ?? null,
        body: ex?.body ?? '',
        status: ex?.status ?? null,
      }
    })

    setPeriods(slots)
    setBodyOverrides({})
    setLoading(false)
  }, [sectionId, date])

  useEffect(() => {
    void load()
  }, [load])

  // merge body overrides for consumers
  const periodsWithOverrides = periods.map(p => ({
    ...p,
    body: bodyOverrides[p.period] !== undefined ? bodyOverrides[p.period] : p.body,
  }))

  function setBodies(bodies: Record<number, string>) {
    setBodyOverrides(prev => ({ ...prev, ...bodies }))
  }

  async function upsertAll(status: 'draft' | 'published') {
    const sid = Number(sectionId)
    const merged = periodsWithOverrides

    for (const slot of merged) {
      const body = slot.body.trim()
      if (!body) continue

      const payload = {
        section_id: sid,
        due_date: date,
        period: slot.period,
        subject_id: slot.subject_id,
        teacher_id: slot.teacher_id,
        body,
        status,
      }

      if (slot.hw_id) {
        await supabase.from('homework').update(payload).eq('id', slot.hw_id)
      } else {
        const { data } = await supabase
          .from('homework')
          .insert(payload)
          .select('id')
          .single()
        const newId = (data as { id: string } | null)?.id ?? null
        setPeriods(prev =>
          prev.map(p =>
            p.period === slot.period ? { ...p, hw_id: newId, status } : p,
          ),
        )
      }
    }

    // refresh status flags without discarding body overrides
    setPeriods(prev =>
      prev.map(p => {
        const body = bodyOverrides[p.period] !== undefined
          ? bodyOverrides[p.period]
          : p.body
        return body.trim() ? { ...p, status } : p
      }),
    )
  }

  async function save() {
    await upsertAll('draft')
  }

  async function publish() {
    await upsertAll('published')
    const sid = Number(sectionId)
    supabase.functions
      .invoke('send-push', { body: { section_id: sid, date } })
      .catch(() => { /* non-critical */ })
  }

  return { periods: periodsWithOverrides, loading, setBodies, save, publish }
}
