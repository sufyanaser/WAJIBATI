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
  attachments: AttachmentRow[]
}

export interface AttachmentRow {
  id: string
  storage_path: string
  mime: string
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
  attachments: AttachmentRow[]
}

export interface SaveResult {
  saved: number
  failed: number
  errors: string[]
}

export interface PublishResult extends SaveResult {
  pushSent: boolean
  pushError?: string
}

export interface UseAdminSectionResult {
  periods: PeriodSlot[]
  loading: boolean
  setBodies: (bodies: Record<number, string>) => void
  save: () => Promise<SaveResult>
  publish: () => Promise<PublishResult>
  uploadAttachment: (period: number, file: File) => Promise<{ ok: boolean; error?: string }>
  deleteAttachment: (period: number, attachmentId: string, storagePath: string) => Promise<{ ok: boolean; error?: string }>
}

// ── hook ───────────────────────────────────────────────────────────────────────

export function useAdminSection(
  sectionId: string,
  date: string,
): UseAdminSectionResult {
  const [periods, setPeriods] = useState<PeriodSlot[]>([])
  const [loading, setLoading] = useState(false)
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
        .select('id, period, body, status, attachments(id,storage_path,mime)')
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
        attachments: ex?.attachments ?? [],
      }
    })

    setPeriods(slots)
    setBodyOverrides({})
    setLoading(false)
  }, [sectionId, date])

  useEffect(() => {
    void load()
  }, [load])

  const periodsWithOverrides = periods.map(p => ({
    ...p,
    body: bodyOverrides[p.period] !== undefined ? bodyOverrides[p.period] : p.body,
  }))

  function setBodies(bodies: Record<number, string>) {
    setBodyOverrides(prev => ({ ...prev, ...bodies }))
  }

  async function upsertAll(status: 'draft' | 'published'): Promise<SaveResult> {
    const sid = Number(sectionId)
    const merged = periodsWithOverrides
    const result: SaveResult = { saved: 0, failed: 0, errors: [] }
    const savedPeriods = new Set<number>()
    const newIds: Record<number, string> = {}

    for (const slot of merged) {
      const body = slot.body.trim()
      if (!body) continue

      // subject_id is NOT NULL in DB — skip slots without a timetable entry
      if (!slot.subject_id) {
        result.failed++
        result.errors.push(`حصة ${slot.period}: لا توجد مادة في الجدول الدراسي`)
        continue
      }

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
        const { error } = await supabase
          .from('homework')
          .update(payload)
          .eq('id', slot.hw_id)
        if (error) {
          result.failed++
          result.errors.push(`حصة ${slot.period}: ${error.message}`)
          continue
        }
      } else {
        const { data, error } = await supabase
          .from('homework')
          .insert(payload)
          .select('id')
          .single()
        if (error || !data) {
          result.failed++
          result.errors.push(`حصة ${slot.period}: ${error?.message ?? 'خطأ غير معروف'}`)
          continue
        }
        newIds[slot.period] = (data as { id: string }).id
      }

      savedPeriods.add(slot.period)
      result.saved++
    }

    // Update local state only for successfully saved periods
    setPeriods(prev =>
      prev.map(p => {
        if (!savedPeriods.has(p.period)) return p
        const body = bodyOverrides[p.period] !== undefined ? bodyOverrides[p.period] : p.body
        const updates: Partial<PeriodSlot> = { status }
        if (newIds[p.period]) updates.hw_id = newIds[p.period]
        return body.trim() ? { ...p, ...updates } : p
      }),
    )

    return result
  }

  async function save(): Promise<SaveResult> {
    return upsertAll('draft')
  }

  async function uploadAttachment(
    period: number,
    file: File,
  ): Promise<{ ok: boolean; error?: string }> {
    const slot = periodsWithOverrides.find(p => p.period === period)
    if (!slot?.hw_id) return { ok: false, error: 'احفظ الواجب أولاً' }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const MAX_BYTES = 5 * 1024 * 1024
    if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: 'نوع الملف غير مدعوم' }
    if (file.size > MAX_BYTES) return { ok: false, error: 'حجم الملف يتجاوز 5MB' }

    const ext = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${sectionId}/${slot.hw_id}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, { contentType: file.type, upsert: false })
    if (upErr) return { ok: false, error: upErr.message }

    const { data: row, error: dbErr } = await supabase
      .from('attachments')
      .insert({ homework_id: slot.hw_id, storage_path: storagePath, mime: file.type })
      .select('id,storage_path,mime')
      .single()
    if (dbErr || !row) {
      await supabase.storage.from('attachments').remove([storagePath])
      return { ok: false, error: dbErr?.message ?? 'فشل الحفظ' }
    }

    const newAtt = row as AttachmentRow
    setPeriods(prev =>
      prev.map(p =>
        p.period === period ? { ...p, attachments: [...p.attachments, newAtt] } : p,
      ),
    )
    return { ok: true }
  }

  async function deleteAttachment(
    period: number,
    attachmentId: string,
    storagePath: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { error: dbErr } = await supabase.from('attachments').delete().eq('id', attachmentId)
    if (dbErr) return { ok: false, error: dbErr.message }

    await supabase.storage.from('attachments').remove([storagePath])

    setPeriods(prev =>
      prev.map(p =>
        p.period === period
          ? { ...p, attachments: p.attachments.filter(a => a.id !== attachmentId) }
          : p,
      ),
    )
    return { ok: true }
  }

  async function publish(): Promise<PublishResult> {
    const saveResult = await upsertAll('published')

    if (saveResult.saved === 0) {
      return { ...saveResult, pushSent: false, pushError: 'لم يُحفظ أي واجب' }
    }

    try {
      const sid = Number(sectionId)
      const pushBody = saveResult.saved === 1 ? 'واجب واحد جديد' : `${saveResult.saved} واجبات جديدة`
      const { error } = await supabase.functions.invoke('send-push', {
        body: {
          section_id: sid,
          title: 'واجبات الرميلة',
          body: `${pushBody} بتاريخ ${date}`,
          url: '/',
        },
      })
      if (error) {
        return { ...saveResult, pushSent: false, pushError: error.message }
      }
      return { ...saveResult, pushSent: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ في الإشعارات'
      return { ...saveResult, pushSent: false, pushError: msg }
    }
  }

  return { periods: periodsWithOverrides, loading, setBodies, save, publish, uploadAttachment, deleteAttachment }
}
