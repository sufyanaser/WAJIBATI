import { describe, it, expect } from 'vitest'
import {
  homeworkRecordToItems,
  fetchAsDataUrl,
} from '../../utils/exportA4'
import type { ExportA4Options, HomeworkItem } from '../../utils/exportA4'

// ── homeworkRecordToItems ──────────────────────────────────────────────────

describe('homeworkRecordToItems', () => {
  it('converts record to ordered items', () => {
    const record = {
      'الرياضيات': 'حل تمرين 5 صفحة 30',
      'الكيمياء': 'مراجعة الفصل الأول',
    }
    const items = homeworkRecordToItems(record)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ subject: 'الرياضيات', text: 'حل تمرين 5 صفحة 30' })
    expect(items[1]).toEqual({ subject: 'الكيمياء', text: 'مراجعة الفصل الأول' })
  })

  it('returns empty array for empty record', () => {
    expect(homeworkRecordToItems({})).toEqual([])
  })

  it('preserves empty text strings', () => {
    const items = homeworkRecordToItems({ 'الرياضيات': '' })
    expect(items[0].text).toBe('')
  })
})

// ── HomeworkItem type contract ─────────────────────────────────────────────

describe('HomeworkItem structure', () => {
  it('has subject and text fields', () => {
    const item: HomeworkItem = { subject: 'الرياضيات', text: 'تمرين 1' }
    expect(item.subject).toBe('الرياضيات')
    expect(item.text).toBe('تمرين 1')
  })
})

// ── ExportA4Options contract ───────────────────────────────────────────────

describe('ExportA4Options shape', () => {
  it('accepts required fields', () => {
    const opts: ExportA4Options = {
      date: '2026-10-22',
      classLabel: 'الصف الخامس علمي',
      section: 'أ',
      homeworkItems: [
        { subject: 'الرياضيات', text: 'تمرين 1' },
        { subject: 'الكيمياء', text: 'مراجعة صفحة 40' },
      ],
      publisherName: 'أ. أحمد',
    }
    expect(opts.date).toBe('2026-10-22')
    expect(opts.homeworkItems).toHaveLength(2)
    expect(opts.publisherName).toBe('أ. أحمد')
  })

  it('allows optional fields to be omitted', () => {
    const opts: ExportA4Options = {
      date: '2026-10-22',
      classLabel: 'الصف السادس أدبي',
      section: 'ب',
      homeworkItems: [],
      publisherName: 'مسؤول المدرسة',
    }
    expect(opts.notes).toBeUndefined()
    expect(opts.warnings).toBeUndefined()
    expect(opts.logoDataUrl).toBeUndefined()
  })

  it('preserves homeworkItems order', () => {
    const items: HomeworkItem[] = [
      { subject: 'التربية الإسلامية', text: 'درس 1' },
      { subject: 'اللغة العربية', text: 'قراءة ص12' },
      { subject: 'الرياضيات', text: 'تمرين 5' },
    ]
    const opts: ExportA4Options = {
      date: '2026-10-22',
      classLabel: 'الصف الرابع علمي',
      section: 'ج',
      homeworkItems: items,
      publisherName: 'مسؤول المدرسة',
    }
    expect(opts.homeworkItems[0].subject).toBe('التربية الإسلامية')
    expect(opts.homeworkItems[2].subject).toBe('الرياضيات')
  })

  it('accepts notes and warnings', () => {
    const opts: ExportA4Options = {
      date: '2026-10-22',
      classLabel: 'الصف الخامس علمي',
      section: 'أ',
      homeworkItems: [],
      publisherName: 'مسؤول المدرسة',
      notes: 'ملاحظة مهمة',
      warnings: 'تنبيه: اختبار الأسبوع القادم',
    }
    expect(opts.notes).toBe('ملاحظة مهمة')
    expect(opts.warnings).toBe('تنبيه: اختبار الأسبوع القادم')
  })
})

// ── fetchAsDataUrl contract ────────────────────────────────────────────────

describe('fetchAsDataUrl', () => {
  it('returns undefined on fetch failure', async () => {
    // In test (jsdom) environment, fetch will fail for relative URLs
    // We expect graceful undefined return, not a thrown error
    const result = await fetchAsDataUrl('/nonexistent-asset.png')
    expect(result === undefined || typeof result === 'string').toBe(true)
  })
})

// ── Export output validation helpers ──────────────────────────────────────

describe('homeworkItems non-empty validation', () => {
  it('empty items array is valid (blank template)', () => {
    const opts: ExportA4Options = {
      date: '2026-10-22',
      classLabel: 'الصف الخامس علمي',
      section: 'أ',
      homeworkItems: [],
      publisherName: 'مسؤول المدرسة',
    }
    expect(Array.isArray(opts.homeworkItems)).toBe(true)
  })

  it('items with empty text strings are valid', () => {
    const opts: ExportA4Options = {
      date: '2026-10-22',
      classLabel: 'الصف الخامس علمي',
      section: 'أ',
      homeworkItems: [{ subject: 'الرياضيات', text: '' }],
      publisherName: 'مسؤول المدرسة',
    }
    expect(opts.homeworkItems[0].text).toBe('')
  })

  it('items with actual homework text are non-empty', () => {
    const opts: ExportA4Options = {
      date: '2026-10-22',
      classLabel: 'الصف الخامس علمي',
      section: 'أ',
      homeworkItems: [
        { subject: 'الرياضيات', text: 'حل تمرين 3 صفحة 45' },
        { subject: 'الكيمياء', text: 'مراجعة الفصل الأول' },
      ],
      publisherName: 'أ. سفيان',
    }
    const nonEmpty = opts.homeworkItems.filter(i => i.text.trim().length > 0)
    expect(nonEmpty).toHaveLength(2)
    expect(nonEmpty[0].text).toContain('تمرين')
  })
})
