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

/**
 * Renders a single homework entry card.
 * RTL layout, dark navy background, gold period badge.
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
  return (
    <article className="hw-card" dir="rtl">
      <div className="hw-header">
        {period != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--accent)',
              color: '#111',
              borderRadius: '50%',
              width: 28,
              height: 28,
              fontSize: '.82rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
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
          {attachments.map(a => (
            <a
              key={a.id}
              href={signedUrls[a.storage_path] ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="attach-link"
            >
              {a.mime.startsWith('image/') ? '🖼' : '📄'} مرفق
            </a>
          ))}
        </div>
      )}
    </article>
  )
}
