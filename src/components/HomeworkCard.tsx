import { useState } from 'react'
import type { CSSProperties } from 'react'

interface Attachment {
  id: string
  storage_path: string
  mime: string
}

interface HomeworkCardProps {
  period: number | null
  subject: string
  teacher: string
  body: string
  subjectColor?: string | null
  attachments?: Attachment[]
  signedUrls?: Record<string, string>
}

const chipStyle = (color?: string | null): CSSProperties =>
  color ? { background: color + '33', borderColor: color } : {}

const fileName = (path: string) => path.split('/').pop() ?? 'مرفق'

/**
 * Renders a single homework entry card.
 * RTL layout, dark navy background, gold period badge, and image lightbox.
 */
export function HomeworkCard({
  period,
  subject,
  teacher,
  body,
  subjectColor,
  attachments = [],
  signedUrls = {},
}: HomeworkCardProps) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <article className="hw-card" dir="rtl">
      <div className="hw-header">
        {period != null && (
          <span
            className="hw-period-circle"
            aria-label={`الحصة ${period}`}
          >
            {period}
          </span>
        )}
        <span className="subject-chip" style={chipStyle(subjectColor)}>
          {subject}
        </span>
        <span className="teacher-name">{teacher}</span>
      </div>
      <p className="hw-body">{body}</p>
      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map(a => {
            const url = signedUrls[a.storage_path]
            const isImage = a.mime.startsWith('image/')
            const name = fileName(a.storage_path)
            if (isImage && url) {
              return (
                <button
                  key={a.id}
                  type="button"
                  className="attach-link"
                  onClick={() => setLightbox(url)}
                  style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
                  aria-label={`عرض الصورة ${name}`}
                >
                  <img
                    src={url}
                    alt={name}
                    style={{ maxHeight: 80, maxWidth: 120, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                  />
                </button>
              )
            }
            return (
              <a
                key={a.id}
                href={url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="attach-link"
              >
                {isImage ? '🖼' : '📄'} {name}
              </a>
            )
          })}
        </div>
      )}

      {/* ── image lightbox ───────────────────────────────────── */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="معاينة المرفق"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <img
            src={lightbox}
            alt="مرفق"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 48px #000' }}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, left: 16,
              background: 'rgba(255,255,255,.15)', border: 'none',
              color: '#fff', borderRadius: '50%', width: 42, height: 42,
              fontSize: '1.3rem', cursor: 'pointer',
            }}
            aria-label="إغلاق"
          >×</button>
        </div>
      )}
    </article>
  )
}
