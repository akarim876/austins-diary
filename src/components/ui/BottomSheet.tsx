import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const DURATION = 260 // ms

export function BottomSheet({ open, onClose, title, children }: Props) {
  // `mounted` keeps the DOM node alive during the close animation
  const [mounted, setMounted] = useState(open)
  // `visible` drives the CSS translateY (true = on-screen, false = off-screen)
  const [visible, setVisible] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }

    if (open) {
      setMounted(true)
      // Double rAF: first frame paints off-screen, second triggers the slide-in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      // Fallback unmount — transitionend can fail to fire (reduced motion,
      // interrupted transitions), which used to leave an invisible full-screen
      // overlay blocking the navbar and all navigation.
      closeTimer.current = setTimeout(() => {
        setMounted(false)
        closeTimer.current = null
      }, DURATION + 80)
    }

    return () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current)
        closeTimer.current = null
      }
    }
  }, [open])

  // Body-scroll lock — only while the sheet is actually interactive
  useEffect(() => {
    if (!mounted || !visible) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mounted, visible])

  // ── Focus management ────────────────────────────────────────────────────
  // Remember what had focus before opening, move focus into the sheet once
  // it's visible/interactive, and restore focus to the trigger on close so
  // keyboard/screen-reader users aren't dropped back at the top of the page.
  useEffect(() => {
    if (visible) {
      previouslyFocused.current = document.activeElement as HTMLElement | null
      // If a child field already grabbed focus (e.g. a form's own autoFocus),
      // respect it — otherwise default to the close button so keyboard/SR
      // users land inside the dialog.
      const alreadyFocusedInside = sheetRef.current?.contains(document.activeElement)
      if (!alreadyFocusedInside) closeButtonRef.current?.focus()
    } else if (previouslyFocused.current) {
      previouslyFocused.current.focus()
      previouslyFocused.current = null
    }
  }, [visible])

  // Escape-to-close + a lightweight Tab focus trap while the sheet is open.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !sheetRef.current) return

    const focusable = Array.from(
      sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(el => el.offsetParent !== null)
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName === 'transform' && !open) {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current)
        closeTimer.current = null
      }
      setMounted(false)
    }
  }

  // ── Swipe-down-to-dismiss ───────────────────────────────────────────────────
  const touchStartY = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null || !sheetRef.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      sheetRef.current.style.transition = 'none'
      sheetRef.current.style.transform  = `translateY(${delta}px)`
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null || !sheetRef.current) return
    const delta = e.changedTouches[0].clientY - touchStartY.current

    sheetRef.current.style.transition = `transform ${DURATION}ms ${EASING}`

    if (delta > 90) {
      sheetRef.current.style.transform = 'translateY(100%)'
      setTimeout(onClose, DURATION)
    } else {
      sheetRef.current.style.transform = 'translateY(0)'
    }

    touchStartY.current = null
  }

  if (!mounted) return null

  // Disable hit-testing as soon as `open` flips false — do not wait for the
  // close animation / useEffect. A leftover full-screen layer above the nav
  // (z-50) was swallowing taps so the URL could update while the UI looked stuck.
  const interactive = open && visible

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    >
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{
          background: 'rgba(0,0,0,0.4)',
          opacity:    visible ? 1 : 0,
          transition: `opacity ${DURATION}ms ${EASING}`,
          willChange: 'opacity',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col"
        style={{
          background: 'var(--color-surface)',
          transform:  visible ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${DURATION}ms ${EASING}`,
          willChange: 'transform',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
        onKeyDown={handleKeyDown}
      >
        <div
          className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-warm-200 select-none"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: 'var(--color-warm-300)' }} aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="font-bold" style={{ color: 'var(--color-text)' }}>{title}</h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              style={{ background: 'var(--color-warm-100)' }}
            >
              <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
