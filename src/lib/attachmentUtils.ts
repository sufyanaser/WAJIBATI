/**
 * Shared validation and path helpers for homework attachments.
 * Extracted here so they can be unit-tested independently of the Admin component.
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function validateFile(file: { name: string; size: number; type: string }): string | null {
  if (file.size > MAX_FILE_SIZE) return 'حجم الملف يتجاوز 10 ميغابايت'
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'نوع الملف غير مسموح به'
  return null
}

export function buildStoragePath(
  sectionId: number,
  hwId: string,
  fileName: string,
  ts: number,
): string {
  return `${sectionId}/${hwId}/${ts}_${fileName}`
}
