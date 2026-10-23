import { Capacitor } from '@capacitor/core'

export async function saveOrShareFile({
  filename,
  base64Data,
  mimeType,
  dialogTitle = 'مشاركة أو حفظ الملف',
}: {
  filename: string
  base64Data: string
  mimeType: string
  dialogTitle?: string
}): Promise<boolean> {
  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()

  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')

      // Attempt saving to Documents
      try {
        await Filesystem.writeFile({
          path: safeFilename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch (docErr) {
        console.warn('[fileSaver] Documents folder write skipped:', docErr)
      }

      // Save to Cache for sharing
      const cacheResult = await Filesystem.writeFile({
        path: safeFilename,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      })

      // Open Native Share Sheet (Save to files, Drive, WhatsApp, Print, etc.)
      await Share.share({
        title: safeFilename,
        text: safeFilename,
        url: cacheResult.uri,
        dialogTitle,
      })
      return true
    } catch (nativeErr: any) {
      if (nativeErr?.message?.includes('canceled') || nativeErr?.message?.includes('cancelled')) {
        return true // user canceled the share dialog
      }
      console.error('[fileSaver] Native file saving/sharing failed:', nativeErr)
    }
  }

  // Web / Desktop standard fallback
  try {
    const link = document.createElement('a')
    link.download = safeFilename
    link.href = `data:${mimeType};base64,${base64Data}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch (webErr) {
    console.error('[fileSaver] Web download failed:', webErr)
    return false
  }
}

export async function saveOrShareBlob({
  filename,
  blob,
  dialogTitle = 'مشاركة أو حفظ الملف',
}: {
  filename: string
  blob: Blob
  dialogTitle?: string
}): Promise<boolean> {
  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()

  if (Capacitor.isNativePlatform()) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const result = reader.result as string
          const base64Data = result.split(',')[1]
          const success = await saveOrShareFile({
            filename: safeFilename,
            base64Data,
            mimeType: blob.type || 'application/octet-stream',
            dialogTitle,
          })
          resolve(success)
        } catch {
          resolve(false)
        }
      }
      reader.onerror = () => resolve(false)
      reader.readAsDataURL(blob)
    })
  }

  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = safeFilename
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return true
  } catch (err) {
    console.error('[fileSaver] Blob download failed:', err)
    return false
  }
}
