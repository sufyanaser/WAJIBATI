import { supabase } from './supabase'

export interface Subject {
  id: number
  name: string
  color: string | null
  sort: number
}

let cached: Subject[] | null = null

export async function fetchSubjects(): Promise<Subject[]> {
  if (cached) return cached
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, color, sort')
    .order('sort')
  if (error || !data) return []
  cached = data as Subject[]
  return cached
}

export async function getTimetableSuggestion(
  sectionId: number,
  weekday: number,
  period: number,
): Promise<number | null> {
  const { data } = await supabase
    .from('timetable')
    .select('subject_id')
    .eq('section_id', sectionId)
    .eq('weekday', weekday)
    .eq('period', period)
    .maybeSingle()
  return (data as { subject_id: number } | null)?.subject_id ?? null
}
