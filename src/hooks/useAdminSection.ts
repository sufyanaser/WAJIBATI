import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { assertCanWrite } from '../services/platform'

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
  subject_id?: number
  teacher_id?: number | null
  subject?: { id: number; name: string; color: string | null } | null
  teacher?: { id: number; full_name: string } | null
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
  setPeriodSubject: (
    period: number,
    subjectId: number | null,
    subjectName: string,
    teacherId: number | null,
    teacherName: string,
  ) => void
  deleteHomework: (period: number) => Promise<{ ok: boolean; error?: string }>
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
  const uploadingPeriodsRef = useRef<Set<number>>(new Set())
  const deletingIdsRef = useRef<Set<string>>(new Set())

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

    // Build teaching_assignments fallback map for slots where teacher is null
    const unassignedSubjectIds = [
      ...new Set(
        tt
          .filter(s => s.subject?.id != null && s.teacher === null)
          .map(s => s.subject!.id),
      ),
    ]
    const taTeacherMap = new Map<number, { id: number; full_name: string }>()
    const rpcFn = (supabase as unknown as {
      rpc?: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    }).rpc

    if (unassignedSubjectIds.length > 0 && typeof rpcFn === 'function') {
      await Promise.all(
        unassignedSubjectIds.map(async subId => {
          try {
            const { data } = await rpcFn('get_section_subject_teachers', {
              p_section_id: sid,
              p_subject_id: subId,
            })
            const rows = (data ?? []) as { teacher_id: number; full_name: string }[]
            if (rows.length > 0) {
              taTeacherMap.set(subId, { id: rows[0].teacher_id, full_name: rows[0].full_name })
            }
          } catch {
            // Ignore RPC errors if migration not applied yet
          }
        }),
      )
    }

    const slots: PeriodSlot[] = Array.from({ length: 6 }, (_, i) => {
      const period = i + 1
      const slot = tt.find(s => s.period === period)
      const ex = hwMap.get(period)
      const fallbackTeacher =
        slot?.teacher === null && slot?.subject?.id != null
          ? (taTeacherMap.get(slot.subject.id) ?? null)
          : null
      const resolvedTeacher = slot?.teacher ?? fallbackTeacher
      return {
        period,
        subject_id: slot?.subject?.id ?? ex?.subject_id ?? null,
        teacher_id: resolvedTeacher?.id ?? ex?.teacher_id ?? null,
        subject: slot?.subject?.name ?? ex?.subject?.name ?? '',
        teacher: resolvedTeacher?.full_name ?? ex?.teacher?.full_name ?? '',
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

  function setPeriodSubject(
    period: number,
    subjectId: number | null,
    subjectName: string,
    teacherId: number | null,
    teacherName: string,
  ) {
    setPeriods(prev =>
      prev.map(p =>
        p.period === period
          ? {
              ...p,
              subject_id: subjectId,
              subject: subjectName,
              teacher_id: teacherId,
              teacher: teacherName,
            }
          : p,
      ),
    )
  }

  async function deleteHomework(period: number): Promise<{ ok: boolean; error?: string }> {
    const writeCheck = await assertCanWrite('حذف الواجب')
    if (!writeCheck.allowed) return { ok: false, error: writeCheck.error }

    const slot = periodsWithOverrides.find(p => p.period === period)
    if (!slot?.hw_id) return { ok: false, error: 'لا يوجد واجب محفوظ لحذفه' }
    // Archive instead of hard-delete — homework is never permanently removed (AGENTS.md §1)
    const { error } = await supabase
      .from('homework')
      .update({ status: 'archived' })
      .eq('id', slot.hw_id)
    if (error) return { ok: false, error: error.message }
    setPeriods(prev =>
      prev.map(p =>
        p.period === period
          ? { ...p, status: 'archived' as const }
          : p,
      ),
    )
    return { ok: true }
  }

  async function upsertAll(status: 'draft' | 'published'): Promise<SaveResult> {
    const writeCheck = await assertCanWrite(status === 'published' ? 'نشر الواجبات' : 'حفظ الواجبات')
    if (!writeCheck.allowed) {
      return { saved: 0, failed: periodsWithOverrides.length, errors: [writeCheck.error || 'عملية الكتابة محظورة'] }
    }

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
    if (uploadingPeriodsRef.current.has(period)) {
      return { ok: false, error: 'جارٍ رفع الملف بالفعل' }
    }
    const writeCheck = await assertCanWrite('رفع المرفق')
    if (!writeCheck.allowed) return { ok: false, error: writeCheck.error }

    uploadingPeriodsRef.current.add(period)
    try {
      const slot = periodsWithOverrides.find(p => p.period === period)
      if (!slot?.hw_id) return { ok: false, error: 'احفظ الواجب أولاً' }

      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      const MAX_BYTES = 5 * 1024 * 1024
      if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: 'نوع الملف غير مدعوم' }
      if (file.size > MAX_BYTES) return { ok: false, error: 'حجم الملف يتجاوز 5MB' }

      const ext = file.name.split('.').pop() ?? 'bin'
      const uniqueId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const storagePath = `${sectionId}/${slot.hw_id}/${uniqueId}.${ext}`

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
        console.error('[attachments] orphaned storage file after db failure:', storagePath)
        const { error: rmErr } = await supabase.storage.from('attachments').remove([storagePath])
        if (rmErr) console.error('Orphan storage file, manual cleanup needed:', storagePath, rmErr.message)
        return { ok: false, error: dbErr?.message ?? 'فشل الحفظ' }
      }

      const newAtt = row as AttachmentRow
      setPeriods(prev =>
        prev.map(p =>
          p.period === period ? { ...p, attachments: [...p.attachments, newAtt] } : p,
        ),
      )
      return { ok: true }
    } finally {
      uploadingPeriodsRef.current.delete(period)
    }
  }

  async function deleteAttachment(
    period: number,
    attachmentId: string,
    storagePath: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (deletingIdsRef.current.has(attachmentId)) {
      return { ok: false, error: 'جارٍ الحذف بالفعل' }
    }
    const writeCheck = await assertCanWrite('حذف المرفق')
    if (!writeCheck.allowed) return { ok: false, error: writeCheck.error }

    deletingIdsRef.current.add(attachmentId)
    try {
      const { error: dbErr } = await supabase.from('attachments').delete().eq('id', attachmentId)
      if (dbErr) return { ok: false, error: dbErr.message }

      const { error: storErr } = await supabase.storage.from('attachments').remove([storagePath])
      if (storErr) {
        console.error('[attachments] storage orphan after db delete — manual cleanup needed:', storagePath, storErr.message)
        // DB record is gone, UI state is correct; storage cleanup can be done manually or via scheduled GC
        setPeriods(prev =>
          prev.map(p =>
            p.period === period
              ? { ...p, attachments: p.attachments.filter(a => a.id !== attachmentId) }
              : p,
          ),
        )
        return { ok: true }
      }

      setPeriods(prev =>
        prev.map(p =>
          p.period === period
            ? { ...p, attachments: p.attachments.filter(a => a.id !== attachmentId) }
            : p,
        ),
      )
      return { ok: true }
    } finally {
      deletingIdsRef.current.delete(attachmentId)
    }
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
          title: 'واجباتي',
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

  return {
    periods: periodsWithOverrides,
    loading,
    setBodies,
    setPeriodSubject,
    deleteHomework,
    save,
    publish,
    uploadAttachment,
    deleteAttachment,
  }
}
