import readXlsxFile from 'read-excel-file'

export const MASTER_SHEETS = ['subjects','teachers','sections','timetable','students','guardians','guardian_students','accounts'] as const
export type MasterSheet = typeof MASTER_SHEETS[number]
export type MasterPayload = Record<MasterSheet, Record<string, unknown>[]>

export async function readSchoolMasterWorkbook(file: File): Promise<MasterPayload> {
  const payload = MASTER_SHEETS.reduce((result, name) => {
    result[name] = []
    return result
  }, {} as MasterPayload)
  for (const sheet of MASTER_SHEETS) {
    const rows = await readXlsxFile(file, { sheet })
    if (!rows.length) continue
    const headers = rows[0].map(value => String(value ?? '').trim().toLowerCase())
    payload[sheet] = rows.slice(1).filter(row => row.some(value => value !== null && value !== '')).map(row =>
      Object.fromEntries(headers.map((header, i) => [header, normalizeCell(row[i])]).filter(([key]) => key)),
    )
  }
  return payload
}

export function normalizeCell(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^(true|نعم)$/i.test(trimmed)) return true
    if (/^(false|لا)$/i.test(trimmed)) return false
    return trimmed
  }
  return value
}
