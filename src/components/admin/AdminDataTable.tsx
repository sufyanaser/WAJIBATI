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
    <div className="adm-table-block">
      {/* Top Controls: Search, Filter, Actions */}
      <div className="adm-toolbar">
        <div className="adm-toolbar-start">
          <div className="adm-search">
            <span className="adm-search-icon" aria-hidden="true">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              className="adm-search-input"
              placeholder={searchPlaceholder}
              value={effectiveQuery}
              onChange={(e) => {
                if (onSearchChange) onSearchChange(e.target.value)
                else setInternalQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          {filterSlot}
        </div>

        {actionsSlot && <div className="adm-toolbar-end">{actionsSlot}</div>}
      </div>

      {/* Table surface */}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              {selectedIds && (
                <th className="adm-th adm-th--check">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={(e) => handleSelectAllPage(e.target.checked)}
                    aria-label="تحديد جميع سجلات الصفحة"
                  />
                </th>
              )}
              {columns.map((col) => {
                const sorted = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={`adm-th ${col.sortable ? 'adm-th--sortable' : ''}`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => col.sortable && handleSort(col.key)}
                    aria-sort={sorted ? (sortAsc ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="adm-th-label">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className={`adm-sort-icon ${sorted ? 'is-active' : ''}`} aria-hidden="true">
                          {sorted ? (sortAsc ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="adm-state" colSpan={columns.length + (selectedIds ? 1 : 0)}>
                  <Spinner />
                  <div className="adm-state-text">جاري تحميل السجلات...</div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td className="adm-state adm-state-text" colSpan={columns.length + (selectedIds ? 1 : 0)}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const id = row[keyField]
                const isSelected = selectedIds?.has(id)
                return (
                  <tr key={String(id ?? idx)} className={`adm-row ${isSelected ? 'is-selected' : ''}`}>
                    {selectedIds && (
                      <td className="adm-td adm-td--check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleRow(id, e.target.checked)}
                          aria-label={`تحديد السجل ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="adm-td">
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

      {/* Pagination footer */}
      {!loading && totalItems > 0 && (
        <div className="adm-pager">
          <div className="adm-pager-start">
            <span>
              عرض {Math.min(totalItems, (safePage - 1) * pageSize + 1)} إلى{' '}
              {Math.min(totalItems, safePage * pageSize)} من إجمالي {totalItems} سجل
            </span>
            <label className="adm-pager-size">
              <span>لكل صفحة:</span>
              <select
                className="adm-select adm-select--compact"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="adm-pager-end">
            <button
              type="button"
              className="btn btn-secondary adm-pager-btn"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRightIcon size={14} />
              السابق
            </button>
            <span className="adm-pager-count">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary adm-pager-btn"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
