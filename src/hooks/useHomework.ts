import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface HwAttachment {
  id: string
  storage_path: string
  mime: string
}

export interface HwItem {
  id: string
  period: number | null
  body: string
  subject: { name: string; color: string | null } | null
  teacher: { full_name: string } | null
  attachments: HwAttachment[]
}

export interface NoticeItem {
  id: string
  title: string
  body: string | null
  priority: number
}

interface UseHomeworkResult {
  items: HwItem[]
  notices: NoticeItem[]
  loading: boolean
  error: string | null
  offline: boolean
}

/**
 * Fetch published homework + notices for a given section and date (YYYY-MM-DD).
 * Also calls the mark_read RPC as a side effect (non-critical).
 */
export function useHomework(
  sectionId: number | string | null,
  date: string,
): UseHomeworkResult {
  const [items, setItems] = useState<HwItem[]>([])
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchData = useCallback(async () => {
    if (sectionId === null || sectionId === undefined || !date) return
    const sec = Number(sectionId)
    setLoading(true)
    setError(null)
    setOffline(false)
    const now = new Date().toISOString()
    try {
      const [hR, nR] = await Promise.all([
        supabase
          .from('homework')
          .select(
            'id,period,body,subject:subjects(name,color),teacher:teachers(full_name),attachments(id,storage_path,mime)',
          )
          .eq('section_id', sec)
          .eq('due_date', date)
          .eq('status', 'published')
          .order('period'),
        supabase
          .from('notices')
          .select('id,title,body,priority')
          .or(`section_id.is.null,section_id.eq.${sec}`)
          .lte('publish_at', now)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('priority', { ascending: false })
          .limit(3),
      ])
      if (hR.error) throw hR.error
      const hwData = hR.data as unknown as HwItem[]
      setItems(hwData)
      setNotices((nR.data ?? []) as unknown as NoticeItem[])
      try {
        localStorage.setItem('rh_cache', JSON.stringify({ iso: date, sec, hw: hwData }))
      } catch { /* quota */ }
      // non-critical: ignore result
      supabase.rpc('mark_read', { p_section: sec, p_day: date }).then(
        () => {},
        () => {},
      )
    } catch {
      // try offline cache
      try {
        const c = JSON.parse(localStorage.getItem('rh_cache') ?? '{}') as {
          iso?: string
          sec?: number
          hw?: HwItem[]
        }
        if (c.iso === date && c.sec === sec && c.hw) {
          setItems(c.hw)
          setOffline(true)
        } else {
          setItems([])
          setError('فشل تحميل البيانات')
        }
      } catch {
        setItems([])
        setError('فشل تحميل البيانات')
      }
    }
    setLoading(false)
  }, [sectionId, date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { items, notices, loading, error, offline }
}
