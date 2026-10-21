import { describe, expect, it } from 'vitest'
import { MASTER_SHEETS, normalizeCell } from '../schoolMasterData'

describe('school master data workbook contract', () => {
  it('keeps all required sheets in a stable order', () => {
    expect(MASTER_SHEETS).toEqual(['subjects','teachers','sections','timetable','students','guardians','guardian_students','accounts'])
  })

  it('normalizes Arabic and English booleans without changing identifiers', () => {
    expect(normalizeCell(' نعم ')).toBe(true)
    expect(normalizeCell('false')).toBe(false)
    expect(normalizeCell(' STU-0001 ')).toBe('STU-0001')
  })
})
