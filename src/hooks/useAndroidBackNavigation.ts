import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

/**
 * Handles physical Android back button presses via Capacitor @capacitor/app.
 * Behavior:
 * 1. If an open modal or drawer close button is found in the DOM, clicks it to close.
 * 2. If at root routes (/ or /login or /today), exits the app.
 * 3. Otherwise, navigates back in history.
 */
export function useAndroidBackNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let isSubscribed = true
    let removeListener: (() => void) | undefined

    import('@capacitor/app').then(({ App }) => {
      if (!isSubscribed) return

      App.addListener('backButton', ({ canGoBack }) => {
        // 1. Lightbox or image preview close
        const lightboxClose = document.querySelector<HTMLButtonElement>('.drawer-lightbox-close')
        if (lightboxClose) {
          lightboxClose.click()
          return
        }

        // 2. Open drawer or modal close
        const activeCloseBtn = document.querySelector<HTMLButtonElement>(
          '.drawer-close-btn, .drawer-back-btn, button[aria-label="إغلاق"], button[aria-label="العودة إلى جدول المواد"]'
        )
        if (activeCloseBtn && activeCloseBtn.offsetParent !== null) {
          activeCloseBtn.click()
          return
        }

        // 3. Navigation routing
        const path = location.pathname.toLowerCase()
        const isRoot = path === '/' || path === '/login' || path === '/today'

        if (isRoot) {
          App.exitApp()
        } else if (canGoBack) {
          navigate(-1)
        } else {
          navigate('/')
        }
      }).then(handle => {
        if (!isSubscribed) {
          handle.remove()
        } else {
          removeListener = () => handle.remove()
        }
      })
    }).catch(err => {
      console.warn('[useAndroidBackNavigation] Back button listener initialization skipped:', err)
    })

    return () => {
      isSubscribed = false
      removeListener?.()
    }
  }, [navigate, location])
}

/**
 * Helper component that activates Android back navigation inside Router context.
 */
export function AndroidBackNavigationHandler() {
  useAndroidBackNavigation()
  return null
}
