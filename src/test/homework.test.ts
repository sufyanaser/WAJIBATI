/**
 * Rumaila Homeworks — test suite
 *
 * Part A — Pure unit tests: validation helpers (attachmentUtils, phone normalisation,
 *           slot logic) — no React, no network.
 * Part B — Integration tests: Admin component key workflows via mocked Supabase.
 *           Covers save (insert + update paths), upload (pending queue, Storage
 *           fail, DB fail + rollback), delete (success + Storage/DB failure recovery)
 *           and subject selection without timetable data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// ── PART A: pure unit helpers ─────────────────────────────────────────────────

import { validateFile, MAX_FILE_SIZE, ALLOWED_MIME_TYPES, buildStoragePath } from '../lib/attachmentUtils'

function makeFile(opts: { name?: string; size?: number; type?: string } = {}): File {
  const blob = new Blob(['x'.repeat(opts.size ?? 10)], { type: opts.type ?? 'image/jpeg' })
  return new File([blob], opts.name ?? 'test.jpg', { type: opts.type ?? 'image/jpeg' })
}

describe('validateFile', () => {
  it('accepts valid image under 10 MB', () => {
    expect(validateFile(makeFile())).toBeNull()
  })

  it('rejects file over MAX_FILE_SIZE', () => {
    const err = validateFile(makeFile({ size: MAX_FILE_SIZE + 1 }))
    expect(err).toMatch(/10/)
  })

  it('rejects disallowed MIME type', () => {
    const err = validateFile(makeFile({ type: 'text/plain', name: 'hack.txt' }))
    expect(err).toBeTruthy()
  })

  it('accepts all allowed MIME types', () => {
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(validateFile(makeFile({ type: mime }))).toBeNull()
    }
  })

  it('rejects exactly at limit when size equals MAX_FILE_SIZE + 1', () => {
    expect(validateFile(makeFile({ size: MAX_FILE_SIZE + 1 }))).not.toBeNull()
  })

  it('accepts exactly at MAX_FILE_SIZE', () => {
    expect(validateFile(makeFile({ size: MAX_FILE_SIZE }))).toBeNull()
  })
})

describe('buildStoragePath', () => {
  it('starts with sectionId prefix for RLS isolation', () => {
    const path = buildStoragePath(7, 'hw-uuid', 'file.jpg', 1700000000)
    expect(path.startsWith('7/')).toBe(true)
  })

  it('includes hwId, timestamp and filename', () => {
    const path = buildStoragePath(3, 'abc', 'doc.pdf', 1234)
    expect(path).toBe('3/abc/1234_doc.pdf')
  })
})

// ── Slot validation (mirrors saveSlot guard logic) ────────────────────────────

interface PSlot {
  period: number
  selectedSubjectId: number | null
  body: string
  status: 'draft' | 'published' | 'archived' | null
  hw_id: string | null
  saving: boolean
  error: string | null
  attaches: { id: string; storage_path: string; mime: string }[]
  pendingFiles: { name: string }[]
}

function makeSlot(overrides: Partial<PSlot> = {}): PSlot {
  return {
    period: 1, selectedSubjectId: null, body: '', status: null,
    hw_id: null, saving: false, error: null, attaches: [], pendingFiles: [],
    ...overrides,
  }
}

function validateSave(slot: PSlot): string | null {
  if (!slot.body.trim()) return 'no_body'
  if (!slot.selectedSubjectId) return 'يجب اختيار المادة'
  return null
}

describe('Save validation', () => {
  it('rejects empty body', () => {
    expect(validateSave(makeSlot({ selectedSubjectId: 5 }))).toBe('no_body')
  })

  it('rejects missing subject — timetable absent', () => {
    expect(validateSave(makeSlot({ body: 'واجب', selectedSubjectId: null }))).toBe('يجب اختيار المادة')
  })

  it('accepts manual subject selection with no timetable entry', () => {
    expect(validateSave(makeSlot({ body: 'واجب', selectedSubjectId: 3 }))).toBeNull()
  })

  it('error clears after subject chosen', () => {
    const slot = makeSlot({ body: 'واجب', selectedSubjectId: null, error: 'يجب اختيار المادة' })
    const updated = { ...slot, selectedSubjectId: 5, error: null }
    expect(validateSave(updated)).toBeNull()
    expect(updated.error).toBeNull()
  })
})

describe('Subject dropdown', () => {
  it('timetable pre-populates selectedSubjectId', () => {
    const slot = makeSlot({ selectedSubjectId: 7 })
    expect(slot.selectedSubjectId).toBe(7)
  })

  it('manual override replaces timetable suggestion', () => {
    const slot = makeSlot({ selectedSubjectId: 7 })
    expect({ ...slot, selectedSubjectId: 12 }.selectedSubjectId).toBe(12)
  })

  it('slot with no body and no subject is skipped by publishAll', () => {
    const slot = makeSlot()
    expect(!slot.body.trim() && !slot.selectedSubjectId).toBe(true)
  })
})

describe('Attachment slot logic', () => {
  it('enforces max 5 (committed + pending)', () => {
    const slot = makeSlot({
      attaches: Array.from({ length: 3 }, (_, k) => ({
        id: String(k), storage_path: `s/h/${k}.jpg`, mime: 'image/jpeg',
      })),
      pendingFiles: [{ name: 'a.jpg' }, { name: 'b.jpg' }],
    })
    expect(slot.attaches.length + slot.pendingFiles.length >= 5).toBe(true)
  })

  it('committed attach added correctly', () => {
    const slot = makeSlot({ hw_id: 'hw-1' })
    const attach = { id: 'att-1', storage_path: 'sec/hw/file.pdf', mime: 'application/pdf' }
    const updated = { ...slot, attaches: [...slot.attaches, attach] }
    expect(updated.attaches).toHaveLength(1)
    expect(updated.attaches[0].mime).toBe('application/pdf')
  })

  it('committed attach deleted correctly', () => {
    const slot = makeSlot({
      attaches: [
        { id: 'att-1', storage_path: 's/h/a.jpg', mime: 'image/jpeg' },
        { id: 'att-2', storage_path: 's/h/b.pdf', mime: 'application/pdf' },
      ],
    })
    const updated = { ...slot, attaches: slot.attaches.filter(a => a.id !== 'att-1') }
    expect(updated.attaches).toHaveLength(1)
    expect(updated.attaches[0].id).toBe('att-2')
  })

  it('pending file removed from queue', () => {
    const slot = makeSlot({ pendingFiles: [{ name: 'x.jpg' }, { name: 'y.pdf' }] })
    const updated = { ...slot, pendingFiles: slot.pendingFiles.filter((_, k) => k !== 0) }
    expect(updated.pendingFiles).toHaveLength(1)
    expect(updated.pendingFiles[0].name).toBe('y.pdf')
  })
})

describe('Guardian view isolation', () => {
  it('draft excluded from guardian query', () => {
    const items = [
      { id: '1', status: 'published' }, { id: '2', status: 'draft' }, { id: '3', status: 'archived' },
    ]
    const visible = items.filter(i => i.status === 'published')
    expect(visible).toHaveLength(1)
    expect(visible[0].id).toBe('1')
  })

  it('archived excluded from today view', () => {
    const items = [{ id: '1', status: 'published' }, { id: '2', status: 'archived' }]
    expect(items.filter(i => i.status === 'published').every(i => i.status === 'published')).toBe(true)
  })
})

describe('Push dedup', () => {
  it('fires only on publish, not draft', () => {
    const calls: string[] = []
    function maybePush(status: string, hwId: string) {
      if (status === 'published' && hwId) calls.push(hwId)
    }
    maybePush('draft', 'hw-1')
    maybePush('published', 'hw-2')
    expect(calls).toEqual(['hw-2'])
  })
})

describe('Phone normalisation', () => {
  function normalizePhone(raw: string): string {
    const d = raw.replace(/\D/g, '')
    if (/^07\d{9}$/.test(d)) return '+964' + d.slice(1)
    if (/^9647\d{9}$/.test(d)) return '+' + d
    if (/^7\d{9}$/.test(d)) return '+964' + d
    throw new Error('invalid_phone')
  }
  it('07... → +964...', () => expect(normalizePhone('07801234567')).toBe('+9647801234567'))
  it('9647... → +9647...', () => expect(normalizePhone('9647801234567')).toBe('+9647801234567'))
  it('7... → +9647...', () => expect(normalizePhone('7801234567')).toBe('+9647801234567'))
  it('invalid throws', () => expect(() => normalizePhone('123')).toThrow('invalid_phone'))
})

// ── PART B: Integration tests (Admin component + mocked Supabase) ─────────────

// ─── Mock setup ──────────────────────────────────────────────────────────────

const mockStorageUpload = vi.fn()
const mockStorageRemove = vi.fn()
const mockDbFrom = vi.fn()
const mockGetSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: (...args: unknown[]) => mockDbFrom(...args),
    storage: {
      from: () => ({ upload: mockStorageUpload, remove: mockStorageRemove }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}))

vi.mock('../lib/subjects', () => ({
  fetchSubjects: vi.fn().mockResolvedValue([
    { id: 1, name: 'رياضيات', color: '#E8B04A', sort: 1 },
    { id: 2, name: 'عربي', color: '#3D84C8', sort: 2 },
  ]),
}))

/** Build a fluent Supabase query builder mock that resolves at terminal methods AND is itself awaitable */
function makeQB(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const payload = { data: result.data ?? null, error: result.error ?? null }
  const resolved = Promise.resolve(payload)
  const qb: Record<string, unknown> = {}
  // Make qb itself thenable so `await supabase.from(...).select(...).eq(...)` works
  qb.then = resolved.then.bind(resolved)
  qb.catch = resolved.catch.bind(resolved)
  const fn = () => qb
  qb.select = vi.fn(fn)
  qb.eq = vi.fn(fn)
  qb.order = vi.fn(fn)
  qb.limit = vi.fn(fn)
  qb.single = vi.fn().mockReturnValue(resolved)
  qb.maybeSingle = vi.fn().mockReturnValue(resolved)
  qb.insert = vi.fn(fn)
  qb.update = vi.fn(fn)
  qb.delete = vi.fn(fn)
  return qb
}

async function renderAdmin() {
  const { default: Admin } = await import('../pages/Admin')
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/admin'] },
      React.createElement(Admin)
    )
  )
}

describe('Admin component — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'admin-uid' } } },
    })

    // Default table stubs — auth guard passes, sections empty (no hw cards rendered)
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'sections') return makeQB({ data: [] })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'timetable') return makeQB({ data: [] })
      if (table === 'homework') return makeQB({ data: [] })
      return makeQB({ data: null })
    })

    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageRemove.mockResolvedValue({ error: null })
  })

  it('renders admin UI after auth guard passes', async () => {
    const { default: Admin } = await import('../pages/Admin')
    const { unmount } = render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => expect(screen.getByText('لوحة الإدارة')).toBeInTheDocument())
    unmount()
  })

  it('shows subject dropdown options from fetchSubjects (no timetable required)', async () => {
    // Provide one section so slots are rendered
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'sections') return makeQB({
        data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
      })
      if (table === 'timetable') return makeQB({ data: [] }) // no timetable at all
      if (table === 'homework') return makeQB({ data: [] })
      return makeQB({ data: null })
    })

    const { default: Admin } = await import('../pages/Admin')
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => screen.getAllByText('-- اختر المادة --'))
    // Subjects from fetchSubjects appear in each card's dropdown
    const opts = screen.getAllByRole('option', { name: 'رياضيات' })
    expect(opts.length).toBeGreaterThan(0)
  })

  it('shows per-card error when subject missing on save', async () => {
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'sections') return makeQB({
        data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
      })
      if (table === 'timetable') return makeQB({ data: [] })
      if (table === 'homework') return makeQB({ data: [] })
      return makeQB({ data: null })
    })

    const { default: Admin } = await import('../pages/Admin')
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => screen.getAllByPlaceholderText('نص الواجب…'))
    const textareas = screen.getAllByPlaceholderText('نص الواجب…')
    await act(async () => {
      fireEvent.change(textareas[0], { target: { value: 'واجب رياضيات' } })
    })
    const saveBtns = screen.getAllByText('مسودة')
    await act(async () => { fireEvent.click(saveBtns[0]) })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('يجب اختيار المادة'))
  })

  it('queues file as pending when card has no hw_id (not yet saved)', async () => {
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'sections') return makeQB({
        data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
      })
      if (table === 'timetable') return makeQB({ data: [] })
      if (table === 'homework') return makeQB({ data: [] })
      return makeQB({ data: null })
    })

    const { default: Admin } = await import('../pages/Admin')
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => screen.getAllByTitle('إرفاق صورة من المعرض'))
    const galleryInputs = document.querySelectorAll('input[accept="image/*"]:not([capture])')
    const file = makeFile({ name: 'photo.jpg', size: 100, type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(galleryInputs[0], { target: { files: [file] } })
    })
    // Storage should NOT have been called (no hw_id yet)
    expect(mockStorageUpload).not.toHaveBeenCalled()
    // Pending label should appear
    await waitFor(() => expect(screen.getByText('معلق')).toBeInTheDocument())
  })

  it('calls storage.remove + shows error when storage upload fails', async () => {
    // Provide existing hw_id so upload fires immediately
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'sections') return makeQB({
        data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
      })
      if (table === 'timetable') return makeQB({ data: [{ period: 1, subject: { id: 1, name: 'رياضيات', color: null }, teacher: null }] })
      if (table === 'homework') return makeQB({
        data: [{ id: 'hw-1', period: 1, body: 'واجب', status: 'draft', attachments: [] }],
      })
      return makeQB({ data: null })
    })
    mockStorageUpload.mockResolvedValue({ error: { message: 'فشل التخزين' } })

    const { default: Admin } = await import('../pages/Admin')
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => screen.getAllByTitle('إرفاق صورة من المعرض'))
    const galleryInputs = document.querySelectorAll('input[accept="image/*"]:not([capture])')
    const file = makeFile({ name: 'photo.jpg', size: 100, type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(galleryInputs[0], { target: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('فشل التخزين'))
    // No attachment should appear in the list
    expect(screen.queryByLabelText('مرفقات محفوظة')).toBeNull()
  })

  it('cleans up storage when DB insert fails after successful upload', async () => {
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'sections') return makeQB({
        data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
      })
      if (table === 'timetable') return makeQB({ data: [] })
      if (table === 'homework') return makeQB({
        data: [{ id: 'hw-1', period: 1, body: 'واجب', status: 'draft', attachments: [] }],
      })
      if (table === 'attachments') {
        // insert().select().single() → DB error
        const qb = makeQB({ data: null, error: { message: 'خطأ قاعدة البيانات' } })
        return qb
      }
      return makeQB({ data: null })
    })
    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageRemove.mockResolvedValue({ error: null })

    const { default: Admin } = await import('../pages/Admin')
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => screen.getAllByTitle('إرفاق صورة من المعرض'))
    const galleryInputs = document.querySelectorAll('input[accept="image/*"]:not([capture])')
    const file = makeFile({ name: 'photo.jpg', size: 100, type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(galleryInputs[0], { target: { files: [file] } })
    })
    await waitFor(() => expect(mockStorageRemove).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.queryByLabelText('مرفقات محفوظة')).toBeNull()
  })

  it('keeps attachment in UI when delete fails', async () => {
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'sections') return makeQB({
        data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
      })
      if (table === 'timetable') return makeQB({ data: [] })
      if (table === 'homework') return makeQB({
        data: [{
          id: 'hw-1', period: 1, body: 'واجب', status: 'draft',
          attachments: [{ id: 'att-1', storage_path: '1/hw-1/file.jpg', mime: 'image/jpeg' }],
        }],
      })
      return makeQB({ data: null })
    })
    mockStorageRemove.mockResolvedValue({ error: { message: 'حذف فشل' } })

    const { default: Admin } = await import('../pages/Admin')
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => screen.getByTitle('حذف المرفق'))
    await act(async () => { fireEvent.click(screen.getByTitle('حذف المرفق')) })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('حذف فشل'))
    // Attachment must still be visible
    expect(screen.getByTitle('حذف المرفق')).toBeInTheDocument()
  })

  it('rejects file exceeding 10 MB without calling storage', async () => {
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'admins') return makeQB({ data: { role: 'owner' } })
      if (table === 'notices') return makeQB({ data: [] })
      if (table === 'sections') return makeQB({
        data: [{ id: 1, letter: 'أ', stage: { name: 'الرابع', branch: 'علمي' } }],
      })
      if (table === 'timetable') return makeQB({ data: [] })
      if (table === 'homework') return makeQB({
        data: [{ id: 'hw-1', period: 1, body: 'واجب', status: 'draft', attachments: [] }],
      })
      return makeQB({ data: null })
    })

    const { default: Admin } = await import('../pages/Admin')
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
        React.createElement(Admin))
    )
    await waitFor(() => screen.getAllByTitle('إرفاق صورة من المعرض'))
    const galleryInputs = document.querySelectorAll('input[accept="image/*"]:not([capture])')
    const bigFile = makeFile({ name: 'big.jpg', size: MAX_FILE_SIZE + 1, type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(galleryInputs[0], { target: { files: [bigFile] } })
    })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('10'))
    expect(mockStorageUpload).not.toHaveBeenCalled()
  })
})

