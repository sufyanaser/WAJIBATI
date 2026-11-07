import React, { useState, useMemo } from 'react'
import { Spinner } from '../Spinner'
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '../Icons'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string
}

export interface AdminDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
  filterSlot?: React.ReactNode
  actionsSlot?: React.ReactNode
  selectedIds?: Set<string | number>
  onSelectionChange?: (selectedIds: Set<string | number>) => void
  emptyMessage?: string
  loading?: boolean
  initialPageSize?: number
}

export function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'ابحث في السجلات...',
  filterSlot,
  actionsSlot,
  selectedIds,
  onSelectionChange,
  emptyMessage = 'لا توجد سجلات مطابقة للعرض',
  loading = false,
  initialPageSize = 10,
}: AdminDataTableProps<T>) {
  const [internalQuery, setInternalQuery] = useState('')
  const effectiveQuery = onSearchChange !== undefined ? (searchQuery ?? '') : internalQuery

  const [pageSize, setPageSize] = useState(initialPageSize)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    let list = [...data]

    // Search filter
    if (effectiveQuery.trim()) {
      const q = effectiveQuery.trim().toLowerCase()
      list = list.filter((item) =>
        Object.values(item).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        )
      )
    }

    // Sort
    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey]
        const valB = b[sortKey]
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA
        }
        return sortAsc
          ? String(valA ?? '').localeCompare(String(valB ?? ''), 'ar')
          : String(valB ?? '').localeCompare(String(valA ?? ''), 'ar')
      })
    }

    return list
  }, [data, effectiveQuery, sortKey, sortAsc])

  // Pagination
  const totalItems = processedData.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const safePage = Math.max(1, Math.min(currentPage, totalPages))
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return processedData.slice(start, start + pageSize)
  }, [processedData, safePage, pageSize])

  // Selection
  const allPageSelected = useMemo(() => {
    if (!selectedIds || paginatedData.length === 0) return false
    return paginatedData.every((row) => selectedIds.has(row[keyField]))
  }, [selectedIds, paginatedData, keyField])

  function handleSelectAllPage(checked: boolean) {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    paginatedData.forEach((row) => {
      const id = row[keyField]
      if (checked) next.add(id)
      else next.delete(id)
    })
    onSelectionChange(next)
  }

  function handleToggleRow(id: string | number, checked: boolean) {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectionChange(next)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Controls: Search, Filter, Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <div
            style={{
              position: 'relative',
              flex: 1,
              maxWidth: '360px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                position: 'absolute',
                right: '12px',
                color: 'var(--muted)',
                display: 'flex',
                pointerEvents: 'none',
              }}
            >
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={effectiveQuery}
              onChange={(e) => {
                if (onSearchChange) onSearchChange(e.target.value)
                else setInternalQuery(e.target.value)
                setCurrentPage(1)
              }}
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '8px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
                fontSize: '0.85rem',
              }}
            />
          </div>
          {filterSlot}
        </div>

        {actionsSlot && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {actionsSlot}
          </div>
        )}
      </div>

      {/* Table Surface */}
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          background: 'var(--card)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
              {selectedIds && (
                <th style={{ width: '40px', padding: '12px 14px' }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={(e) => handleSelectAllPage(e.target.checked)}
                    aria-label="تحديد جميع سجلات الصفحة"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '12px 14px',
                    color: 'var(--fg-secondary)',
                    fontWeight: 700,
                    width: col.width,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span style={{ fontSize: '0.75rem', color: sortKey === col.key ? 'var(--accent)' : 'var(--muted)' }}>
                        {sortKey === col.key ? (sortAsc ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectedIds ? 1 : 0)} style={{ padding: '40px', textAlign: 'center' }}>
                  <Spinner />
                  <div style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '0.82rem' }}>
                    جاري تحميل السجلات...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectedIds ? 1 : 0)}
                  style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const id = row[keyField]
                const isSelected = selectedIds?.has(id)
                return (
                  <tr
                    key={String(id ?? idx)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'rgba(232, 176, 74, 0.08)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--surface2)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {selectedIds && (
                      <td style={{ padding: '11px 14px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleRow(id, e.target.checked)}
                          aria-label={`تحديد السجل ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} style={{ padding: '11px 14px', color: 'var(--fg)' }}>
                        {col.render ? col.render(row, idx) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalItems > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.82rem',
            color: 'var(--muted)',
            flexWrap: 'wrap',
            padding: '4px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>
              عرض {Math.min(totalItems, (safePage - 1) * pageSize + 1)} إلى{' '}
              {Math.min(totalItems, safePage * pageSize)} من إجمالي {totalItems} سجل
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>لكل صفحة:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ minHeight: '30px', padding: '0 10px', fontSize: '0.8rem' }}
            >
              <ChevronRightIcon size={14} />
              السابق
            </button>
            <span style={{ fontWeight: 600, color: 'var(--fg-secondary)', padding: '0 4px' }}>
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ minHeight: '30px', padding: '0 10px', fontSize: '0.8rem' }}
            >
              التالي
              <ChevronLeftIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
