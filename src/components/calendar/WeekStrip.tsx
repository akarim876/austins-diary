/**
 * Swipeable 7-day week strip with smooth transform-based animation.
 *
 * Layout:
 *   BUFFER cells off-screen left | 7 visible cells | BUFFER cells off-screen right
 *   (total TOTAL = 13 cells rendered to allow full ±3-day tap animation)
 *
 * Animation:
 *   - Tap any visible day: the strip slides so that day centers (via translateX)
 *   - Swipe left/right: advance or retreat 1 day per gesture
 *   - "Today" pill appears when the selected day isn't today
 */
import {
  useEffect, useLayoutEffect, useRef, useState, useCallback,
} from 'react'
import {
  addDays, differenceInCalendarDays, format, isToday, parseISO,
} from 'date-fns'

const VISIBLE = 7
const BUFFER  = 3                       // extra cells on each side for animation
const TOTAL   = VISIBLE + 2 * BUFFER    // 13
const ANIM_MS = 230
const SWIPE_THRESHOLD_PX = 36

export interface WeekStripProps {
  selectedDate: string                     // 'yyyy-MM-dd' — fully controlled
  onSelectDate: (date: string) => void
  /** date → up to 3 CSS color strings, shown as small dots */
  dotsByDate?: Record<string, string[]>
  /** Dates beyond this are dimmed and unselectable (default: today) */
  maxDate?: string
}

export function WeekStrip({
  selectedDate,
  onSelectDate,
  dotsByDate = {},
  maxDate,
}: WeekStripProps) {
  const today   = format(new Date(), 'yyyy-MM-dd')
  const limit   = maxDate ?? today
  const isOnToday = selectedDate === today

  // ── Measurement ──────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellPx, setCellPx] = useState(0)

  useLayoutEffect(() => {
    function measure() {
      const w = containerRef.current?.offsetWidth ?? 0
      setCellPx(w / VISIBLE)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Animation state ───────────────────────────────────────────────────────────
  // displayCenter: the date rendered at the logical center of the 13-cell strip.
  // We animate by shifting cellOffset (in cells) then snapping displayCenter.
  const [displayCenter, setDisplayCenter] = useState(() => parseISO(selectedDate))
  const [cellOffset, setCellOffset]       = useState(0)      // cells shifted (positive = left = future)
  const [withAnim, setWithAnim]           = useState(false)
  const [blocking, setBlocking]           = useState(false)

  // Pointer drag state
  const [dragPx, setDragPx] = useState(0)
  const pointerStartX  = useRef<number | null>(null)
  const isDragging     = useRef(false)
  const animTimer      = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevSelectedRef = useRef(selectedDate)

  // ── Respond to selectedDate prop changes ──────────────────────────────────────
  useEffect(() => {
    if (prevSelectedRef.current === selectedDate) return
    const prev = prevSelectedRef.current
    prevSelectedRef.current = selectedDate

    const delta = differenceInCalendarDays(parseISO(selectedDate), parseISO(prev))

    if (Math.abs(delta) > BUFFER) {
      // Too far — instant snap, no animation
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
    setCellOffset(delta)  // slide by delta cells

    animTimer.current = setTimeout(() => {
      // Snap: update center, reset offset instantly (no transition)
      setWithAnim(false)
      setDisplayCenter(parseISO(selectedDate))
      setCellOffset(0)
      setBlocking(false)
    }, ANIM_MS + 30)
  }, [selectedDate])

  useEffect(() => () => {
    if (animTimer.current) clearTimeout(animTimer.current)
  }, [])

  // ── Build the 13-cell day array around displayCenter ─────────────────────────
  // Index 6 (= TOTAL/2 floored) is the center (selected) day.
  const days = Array.from({ length: TOTAL }, (_, i) =>
    addDays(displayCenter, i - Math.floor(TOTAL / 2))
  )

  // translateX: -BUFFER cells initially, shifted by cellOffset, nudged by dragPx
  const translateX = -(BUFFER + cellOffset) * cellPx + dragPx

  // ── Pointer handlers (swipe) ──────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (blocking || cellPx === 0) return
    pointerStartX.current = e.clientX
    isDragging.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [blocking, cellPx])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerStartX.current === null) return
    const delta = e.clientX - pointerStartX.current
    if (Math.abs(delta) > 4) isDragging.current = true
    setDragPx(delta)
  }, [])

  const commitSwipe = useCallback((finalDelta: number) => {
    pointerStartX.current = null
    if (Math.abs(finalDelta) >= SWIPE_THRESHOLD_PX && isDragging.current) {
      const direction = finalDelta < 0 ? 1 : -1  // left swipe = advance (+1)
      const next = addDays(parseISO(selectedDate), direction)
      const nextStr = format(next, 'yyyy-MM-dd')
      if (direction > 0 && nextStr > limit) {
        // Can't go further — snap back
        setDragPx(0)
      } else {
        setDragPx(0)
        onSelectDate(nextStr)
      }
    } else {
      // Snap back with a quick ease
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

  // ── Tap handler ───────────────────────────────────────────────────────────────
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
      {/* Month + year context above the strip */}
      <p
        className="text-center text-xs font-medium mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {format(parseISO(selectedDate), 'MMMM yyyy')}
      </p>

      {/* The sliding strip */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height: 76 }}
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
              transition: withAnim ? `transform ${ANIM_MS}ms ease-out` : 'none',
              willChange: 'transform',
            }}
          >
            {days.map((day, idx) => {
              const dateStr   = format(day, 'yyyy-MM-dd')
              const isSelected = dateStr === selectedDate
              const isTodayDate = isToday(day)
              const isFuture   = dateStr > limit
              const dots       = dotsByDate[dateStr] ?? []

              return (
                <button
                  key={idx}
                  onClick={() => handleTap(day)}
                  disabled={isFuture || blocking}
                  style={{ width: cellPx }}
                  className={`
                    flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl
                    transition-colors duration-150 active:scale-95
                    ${isFuture
                      ? 'opacity-25 cursor-not-allowed'
                      : !isSelected ? 'hover:bg-black/5' : ''
                    }
                  `}
                >
                  {/* Day-of-week abbreviation */}
                  <span
                    className="text-[9px] font-semibold tracking-wider"
                    style={{
                      color: isSelected
                        ? 'rgba(255,255,255,0.8)'
                        : isTodayDate
                        ? 'var(--color-accent)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {format(day, 'EEE').toUpperCase()}
                  </span>

                  {/* Day number */}
                  <span
                    className={`
                      text-base font-bold leading-none w-9 h-9 flex items-center justify-center rounded-full
                      transition-colors duration-150
                      ${isSelected
                        ? 'bg-[var(--color-accent)] text-white'
                        : isTodayDate
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-text)]'
                      }
                    `}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Entry dots (max 3) */}
                  <div className="flex gap-0.5 h-1.5 mt-0.5">
                    {dots.slice(0, 3).map((color, di) => (
                      <span
                        key={di}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : color }}
                      />
                    ))}
                    {dots.length === 0 && <span className="w-1.5 h-1.5" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* "Today" pill — appears when not viewing today */}
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
