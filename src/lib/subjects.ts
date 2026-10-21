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

/**
 * Subjects have no stage_id column — the schema links subjects to sections only
 * via timetable (section_id × weekday × period → subject_id). This helper returns
 * the distinct subjects that appear in any timetable row for the given section.
 * For the admin subject dropdown all subjects are shown; use this to pre-filter
 * the list to subjects actually taught in that section.
 */
export async function fetchSubjectsForSection(sectionId: number): Promise<Subject[]> {
  const { data } = await supabase
    .from('timetable')
    .select('subject:subjects(id, name, color, sort)')
    .eq('section_id', sectionId)
  if (!data) return []
  const seen = new Set<number>()
  const result: Subject[] = []
  for (const row of data as unknown as { subject: Subject | null }[]) {
    if (row.subject && !seen.has(row.subject.id)) {
      seen.add(row.subject.id)
      result.push(row.subject)
    }
  }
  return result.sort((a, b) => a.sort - b.sort)
}
