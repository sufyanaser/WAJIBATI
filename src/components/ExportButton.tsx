import { useState } from 'react'
import type { HomeworkExportData } from '../utils/exportHomework'
import { DownloadIcon } from './Icons'
import { ExportModal } from './ExportModal'

interface Props {
  data: HomeworkExportData
  className?: string
  style?: React.CSSProperties
}

export function ExportButton({ data, className, style }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-haspopup="dialog"
        className={className || 'icon-btn'}
        style={{
          borderColor: 'var(--border)',
          color: 'var(--accent)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <DownloadIcon size={16} />
        <span>تصدير</span>
      </button>

      <ExportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={data}
      />
    </>
  )
}
export { ExportModal }
