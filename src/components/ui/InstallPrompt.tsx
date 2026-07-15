/**
 * PWA install prompt.
 *
 * Listens for the browser's `beforeinstallprompt` event, suppresses the
 * default banner, and shows a styled in-app banner instead — but only after
 * the user has been in the app for 60 seconds (avoids prompting brand-new
 * visitors who haven't seen any value yet).
 *
 * The banner is permanently dismissed once the user taps "Install" or "×".
 * Dismissal is stored in localStorage so it never resurfaces.
 */
import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'pwa-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already dismissed permanently
    if (localStorage.getItem(DISMISS_KEY)) return
    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent

      // Wait 60 s before surfacing the prompt so users see value first
      setTimeout(() => {
        if (deferredPrompt.current) setVisible(true)
      }, 60_000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, '1')
      setVisible(false)
      deferredPrompt.current = null
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
    deferredPrompt.current = null
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
      style={{ filter: 'drop-shadow(0 4px 16px rgba(51,50,46,0.15))' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(91,123,122,0.2)',
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-accent)' }}
        >
          <Download className="w-5 h-5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
            Add to Home Screen
          </p>
          <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--color-text-muted)' }}>
            Install Austin's Diary for quick access — no app store needed.
          </p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: 'var(--color-accent)' }}
        >
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
