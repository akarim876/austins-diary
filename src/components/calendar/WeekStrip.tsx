/**
 * Swipeable 7-day week strip with smooth transform-based animation.
 *
 * Layout:
 *   BUFFER cells off-screen left | 7 visible cells | BUFFER cells off-screen right
 *   (total TOTAL = 13 cells rendered to allow full ±3-day tap-to-select animation)
 *
 * Bug-fix notes:
 *   - touch-action:none on the container prevents the browser from intercepting
 *     horizontal touch gestures as page-scroll before pointer events can capture them.
 *   - e.preventDefault() in pointermove (once horizontal drag is confirmed) is a
 *     second layer of defense in case the browser starts a scroll before touch-action
 *     kicks in.
 *   - The animation state (cellOffset, withAnim) is set via useLayoutEffect, which
 *     runs synchronously after DOM mutations but BEFORE the browser paints. This
 *     ensures the CSS transition always starts from the last-painted transform value,
 *     so the selected-cell circle never "jumps" to the new position in an intermediate
 *     painted frame.
 */
import {
  useEffect, useLayoutEffect, useRef, useState, useCallback,
} from 'react'
import {
  addDays, differenceInCalendarDays, format, isToday, parseISO,
} from 'date-fns'

const VISIBLE = 7
const BUFFER  = 3                     // extra cells on each side for animation
const TOTAL   = VISIBLE + 2 * BUFFER  // 13
const CENTER_IDX = Math.floor(TOTAL / 2)  // 6
const ANIM_MS = 230
const SWIPE_THRESHOLD_PX = 36

export interface WeekStripProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  dotsByDate?: Record<string, string[]>
  maxDate?: string
}

export function WeekStrip({
  selectedDate,
  onSelectDate,
  dotsByDate = {},
  maxDate,
}: WeekStripProps) {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const limit     = maxDate ?? today
  const isOnToday = selectedDate === today

  // ── Measurement ──────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellPx, setCellPx] = useState(0)

  useLayoutEffect(() => {
    function measure() {
      setCellPx((containerRef.current?.offsetWidth ?? 0) / VISIBLE)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Animation state ───────────────────────────────────────────────────────────
  // displayCenter: the date at logical center of the 13-cell strip.
  // Animation: set cellOffset → strip slides → snap displayCenter → reset.
  const [displayCenter, setDisplayCenter] = useState(() => parseISO(selectedDate))
  const [cellOffset, setCellOffset]       = useState(0)
  const [withAnim, setWithAnim]           = useState(false)
  const [blocking, setBlocking]           = useState(false)

  const [dragPx, setDragPx]         = useState(0)
  const pointerStartX               = useRef<number | null>(null)
  const isDragging                  = useRef(false)
  const animTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSelectedRef             = useRef(selectedDate)

  // ── KEY FIX #2: use useLayoutEffect (not useEffect) ──────────────────────────
  // useLayoutEffect fires synchronously after DOM mutations but before the browser
  // paints. This means cellOffset and withAnim are always applied in the same
  // browser frame as the selectedDate-driven re-render, so the CSS transition
  // starts from the last-painted transform and the circle never jumps.
  useLayoutEffect(() => {
    if (prevSelectedRef.current === selectedDate) return
    const prev = prevSelectedRef.current
    prevSelectedRef.current = selectedDate

    const delta = differenceInCalendarDays(parseISO(selectedDate), parseISO(prev))

    if (Math.abs(delta) > BUFFER) {
      // Destination too far to animate cleanly — instant snap
      setWithAnim(false)
      setDragPx(0)
      setCellOffset(0)
      setDisplayCenter(parseISO(selectedDate))
      return
    }

    if (animTimer.current) clearTimeout(animTimer.current)
    setBlocking(true)
    setDragPx(0)
    setWithAnim(true)
    setCellOffset(delta)  // positive = future = slide left

    animTimer.current = setTimeout(() => {
      // Snap: update displayCenter, reset offset with NO transition
      setWithAnim(false)
      setDisplayCenter(parseISO(selectedDate))
      setCellOffset(0)
      setBlocking(false)
    }, ANIM_MS + 30)
  }, [selectedDate])

  useEffect(() => () => {
    if (animTimer.current) clearTimeout(animTimer.current)
  }, [])

  // ── Build 13-cell day array centered on displayCenter ────────────────────────
  const days = Array.from({ length: TOTAL }, (_, i) =>
    addDays(displayCenter, i - CENTER_IDX)
  )

  const translateX = -(BUFFER + cellOffset) * cellPx + dragPx

  // ── KEY FIX #1: touch-action + preventDefault for reliable mobile swipe ──────
  // touch-action:none is set on the container div (see style prop below).
  // Additionally, once a horizontal drag is confirmed we call preventDefault()
  // in the pointer-move handler to stop the browser from starting a scroll.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (blocking || cellPx === 0) return
    pointerStartX.current = e.clientX
    isDragging.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [blocking, cellPx])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerStartX.current === null) return
    const delta = e.clientX - pointerStartX.current
    if (Math.abs(delta) > 4) {
      isDragging.current = true
      // Prevent the browser from treating this as a page scroll
      e.preventDefault()
    }
    setDragPx(delta)
  }, [])

  const commitSwipe = useCallback((finalDelta: number) => {
    pointerStartX.current = null
    if (Math.abs(finalDelta) >= SWIPE_THRESHOLD_PX && isDragging.current) {
      const direction = finalDelta < 0 ? 1 : -1  // left swipe = advance
      const nextStr   = format(addDays(parseISO(selectedDate), direction), 'yyyy-MM-dd')
      if (direction > 0 && nextStr > limit) {
        setDragPx(0)  // already at limit, snap back
      } else {
        setDragPx(0)
        onSelectDate(nextStr)
      }
    } else {
      // Not a committed swipe — ease back to zero
      setWithAnim(true)
      setDragPx(0)
      requestAnimationFrame(() => requestAnimationFrame(() => setWithAnim(false)))
    }
    isDragging.current = false
  }, [selectedDate, limit, onSelectDate])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerStartX.current === null) return
    commitSwipe(e.clientX - pointerStartX.current)
  }, [commitSwipe])

  const handlePointerCancel = useCallback(() => {
    if (pointerStartX.current === null) return
    pointerStartX.current = null
    isDragging.current = false
    setDragPx(0)
  }, [])

  function handleTap(dayDate: Date) {
    if (blocking || isDragging.current) return
    const dateStr = format(dayDate, 'yyyy-MM-dd')
    if (dateStr > limit) return
    if (dateStr === selectedDate) return
    onSelectDate(dateStr)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="select-none">
      {/* Month + year context */}
      <p
        className="text-center text-xs font-medium mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {format(parseISO(selectedDate), 'MMMM yyyy')}
      </p>

      {/* Clipping container — touch-action:none prevents browser scroll capture */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{
          height: 76,
          touchAction: 'none',   // KEY FIX #1 — must be an inline style (not Tailwind)
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {cellPx > 0 && (
          <div
            className="absolute inset-y-0 left-0 flex"
            style={{
              width: TOTAL * cellPx,
              transform: `translateX(${translateX}px)`,
              // KEY FIX #2 (combined with useLayoutEffect above):
              // transition only active when withAnim=true, which is set in the
              // same layout pass as cellOffset, so the browser starts the animation
              // from the last painted position rather than an intermediate value.
              transition: withAnim ? `transform ${ANIM_MS}ms ease-out` : 'none',
              willChange: 'transform',
            }}
          >
            {days.map((day, idx) => {
              const dateStr    = format(day, 'yyyy-MM-dd')
              const isSelected = dateStr === selectedDate
              const isTodayDay = isToday(day)
              const isFuture   = dateStr > limit
              const dots       = dotsByDate[dateStr] ?? []

              return (
                <button
                  key={idx}
                  onClick={() => handleTap(day)}
                  disabled={isFuture || blocking}
                  style={{ width: cellPx }}
                  className={`
                    flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-1
                    rounded-xl active:scale-95
                    ${isFuture ? 'opacity-25 cursor-not-allowed' : !isSelected ? 'hover:bg-black/5' : ''}
                  `}
                >
                  {/* Day-of-week abbreviation */}
                  <span
                    className="text-[9px] font-semibold tracking-wider"
                    style={{
                      color: isSelected
                        ? 'rgba(255,255,255,0.85)'
                        : isTodayDay
                        ? 'var(--color-accent)'
                        : 'var(--color-text-muted)',
                      // Color change is instant — it's part of the same
                      // animation frame as the strip translate (via useLayoutEffect).
                    }}
                  >
                    {format(day, 'EEE').toUpperCase()}
                  </span>

                  {/* Day-number circle — same single transform as the strip */}
                  <span
                    className="text-base font-bold leading-none w-9 h-9 flex items-center justify-center rounded-full"
                    style={{
                      background: isSelected ? 'var(--color-accent)' : 'transparent',
                      color: isSelected
                        ? '#ffffff'
                        : isTodayDay
                        ? 'var(--color-accent)'
                        : 'var(--color-text)',
                      // No separate transition here — the circle IS part of the
                      // strip element and moves via the parent's translateX. Using
                      // an additional transition-colors would create two independent
                      // animation systems (layout + compositor) that drift out of sync.
                    }}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Entry dots (max 3) */}
                  <div className="flex gap-0.5" style={{ height: 6 }}>
                    {dots.slice(0, 3).map((color, di) => (
                      <span
                        key={di}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : color }}
                      />
                    ))}
                    {/* Reserve height even when no dots */}
                    {dots.length === 0 && <span className="w-1.5 h-1.5" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* "Today" pill — reserve space to avoid layout shift */}
      <div className="flex justify-center mt-2" style={{ minHeight: 24 }}>
        {!isOnToday && (
          <button
            onClick={() => onSelectDate(today)}
            className="text-xs font-semibold px-3 py-1 rounded-full transition-colors"
            style={{
              color: 'var(--color-accent)',
              background: 'var(--color-accent)' + '18',
            }}
          >
            Back to today
          </button>
        )}
      </div>
    </div>
  )
}
