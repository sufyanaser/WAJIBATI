import { useEffect, useId, useState, type ReactNode } from 'react'
import './AppIntro.css'

export function AppIntro({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem('wajibati_intro_seen'))
  const id = useId().replace(/:/g, '')

  useEffect(() => {
    if (!visible) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('wajibati_intro_seen', '1')
    }, reducedMotion ? 200 : 6500)
    return () => window.clearTimeout(timer)
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem('wajibati_intro_seen', '1')
  }

  return <>
    <div className={visible ? 'intro-app intro-app--waiting' : 'intro-app'}
      {...(visible ? { inert: '' } : {})} aria-hidden={visible || undefined}>
      {children}
    </div>
    {visible && <div className="app-intro" dir="rtl" onClick={dismiss}
      role="status" aria-label="واجباتي، من الصف للبيت">
      <div className="app-intro-content" aria-hidden="true">
        <div className="app-intro-mark">
          <svg className="app-intro-symbol" viewBox="0 0 1324 1188">
            <defs>
              <clipPath id={`${id}-book`}><path d="M0 1188V1040L80 750Q160 700 255 750V680Q290 585 340 610Q510 615 660 750Q820 610 980 610L1050 750Q1170 700 1240 750L1324 1040V1188Z" /></clipPath>
              <clipPath id={`${id}-left`}><rect width="662" height="1188" /></clipPath>
              <clipPath id={`${id}-right`}><rect x="662" width="662" height="1188" /></clipPath>
              <clipPath id={`${id}-student`}>
                <ellipse cx="660" cy="490" rx="110" ry="108" />
                <path d="M495 630Q520 585 565 573Q660 645 755 573Q800 585 825 630L660 785Z M630 235H690V365H630Z M490 302L535 275L610 367L565 410Z M710 367L785 275L830 302L755 410Z" />
              </clipPath>
              <clipPath id={`${id}-house`}><path d="M0 0H1324V755H1040V470L840 310V230H480V310L260 470V755H0Z" /></clipPath>
            </defs>
            <g className="intro-house">
              <path d="M260 470L660 250L1040 470V750H260Z" fill="#fff" />
              <image href="/intro-symbol.png" width="1324" height="1188" clipPath={`url(#${id}-house)`} />
            </g>
            <g className="intro-student"><image href="/intro-symbol.png" width="1324" height="1188" clipPath={`url(#${id}-student)`} /></g>
            <g clipPath={`url(#${id}-book)`}>
              <g className="intro-book-page intro-book-page--left"><image href="/intro-symbol.png" width="1324" height="1188" clipPath={`url(#${id}-left)`} /></g>
              <g className="intro-book-page intro-book-page--right"><image href="/intro-symbol.png" width="1324" height="1188" clipPath={`url(#${id}-right)`} /></g>
            </g>
          </svg>
          <img className="app-intro-logo" src="/intro-symbol.png" alt="" width="220" height="197" />
        </div>
        <h1 className="app-intro-name">واجباتي</h1>
        <p className="app-intro-slogan">من الصف للبيت</p>
      </div>
    </div>}
  </>
}
