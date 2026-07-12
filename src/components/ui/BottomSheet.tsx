import { type ReactNode, useEffect, useRef, useState } from 'react'
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
  const [mounted,  setMounted]  = useState(open)
  // `visible` drives the CSS translateY (true = on-screen, false = off-screen)
  const [visible,  setVisible]  = useState(false)

  useEffect(() => {
    if (open) {
      // 1. Mount the node so it's in the DOM (but off-screen via transform)
      setMounted(true)
      // 2. Double rAF: first frame paints the off-screen state, second triggers the slide
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      // Slide out first, then unmount after the transition finishes
      setVisible(false)
    }
  }, [open])

  // Body-scroll lock
  useEffect(() => {
    document.body.style.overflow = mounted ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mounted])

  // Unmount only after the closing animation finishes
  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName === 'transform' && !open) {
      setMounted(false)
    }
  }

  // ── Swipe-down-to-dismiss ───────────────────────────────────────────────────
  const touchStartY  = useRef<number | null>(null)
  const sheetRef     = useRef<HTMLDivElement>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null || !sheetRef.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      // Follow finger downward, resist going up past 0
      sheetRef.current.style.transition = 'none'
      sheetRef.current.style.transform  = `translateY(${delta}px)`
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null || !sheetRef.current) return
    const delta = e.changedTouches[0].clientY - touchStartY.current

    // Re-enable transition before snapping back or dismissing
    sheetRef.current.style.transition = `transform ${DURATION}ms ${EASING}`

    if (delta > 90) {
      // Dismiss: let the CSS transition take it off-screen
      sheetRef.current.style.transform = 'translateY(100%)'
      setTimeout(onClose, DURATION)
    } else {
      // Snap back
      sheetRef.current.style.transform = 'translateY(0)'
    }

    touchStartY.current = null
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop — fades in/out in parallel */}
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{
          background:  'rgba(0,0,0,0.4)',
          opacity:     visible ? 1 : 0,
          transition:  `opacity ${DURATION}ms ${EASING}`,
          willChange:  'opacity',
        }}
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        className="relative bg-white rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col"
        style={{
          transform:   visible ? 'translateY(0)' : 'translateY(100%)',
          transition:  `transform ${DURATION}ms ${EASING}`,
          willChange:  'transform',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Drag handle + title bar (touch target for swipe) */}
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

        {/* Scrollable content — fully interactive as soon as it appears */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
