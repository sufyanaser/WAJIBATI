import { useEffect, useState, type ReactNode } from 'react'
import { checkIosPolicy, type IosPolicyResult } from '../services/native/iosVersionPolicy'

/**
 * Renders children immediately so launch is never delayed by the check.
 * Only replaces the UI when the policy result is 'update-required'.
 */
export default function IosUpdateGate({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<IosPolicyResult | null>(null)

  useEffect(() => {
    let active = true
    void checkIosPolicy().then(r => {
      if (active) setResult(r)
    })
    return () => {
      active = false
    }
  }, [])

  if (result?.status === 'update-required') {
    return (
      <main dir="rtl" className="ios-update-required" role="alertdialog" aria-labelledby="ios-update-title">
        <h1 id="ios-update-title">يلزم تحديث التطبيق</h1>
        <p>
          الإصدار الحالي {result.currentVersion} لم يعد مدعوماً. الحد الأدنى المطلوب هو {result.minVersion}.
        </p>
        <a className="ios-update-required__link" href={result.updateUrl} target="_blank" rel="noopener noreferrer">
          تحديث التطبيق
        </a>
      </main>
    )
  }
  return <>{children}</>
}
