import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

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
  const sheetRef    = useRef<HTMLDivElement>(null)

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
        className="relative bg-white rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col"
        style={{
          transform:  visible ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${DURATION}ms ${EASING}`,
          willChange: 'transform',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div
          className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-warm-200 select-none"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
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
