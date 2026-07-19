/**
 * Horizontally scrollable day strip.
 *
 * Scroll and selection are independent:
 *  - Swiping scrolls freely (native overflow-x) with no selection side effects
 *  - The selected day keeps its highlight even when scrolled out of view
 *  - Tapping a day selects it without re-centering the strip
 *  - "Back to today" both selects today and scrolls it into the center
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  addDays, format, isToday, parseISO, startOfDay,
} from 'date-fns'

const VISIBLE = 7
/** Days rendered on each side of today */
const RANGE = 90
const TOTAL = RANGE * 2 + 1

export interface WeekStripHandle {
  /** Select today and scroll it into the center of the strip */
  goToToday: () => void
  /** Scroll so the given date is centered (does not change selection) */
  scrollToDate: (date: string, smooth?: boolean) => void
}

export interface WeekStripProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  dotsByDate?: Record<string, string[]>
  maxDate?: string
  /** Fires when the visible scroll window changes (for dot fetching) */
  onVisibleRangeChange?: (start: string, end: string) => void
}

export const WeekStrip = forwardRef<WeekStripHandle, WeekStripProps>(function WeekStrip(
  {
    selectedDate,
    onSelectDate,
    dotsByDate = {},
    maxDate,
    onVisibleRangeChange,
  },
  ref,
) {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const limit     = maxDate ?? today
  const isOnToday = selectedDate === today

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [cellPx, setCellPx] = useState(0)
  const [visibleMonth, setVisibleMonth] = useState(() => format(parseISO(selectedDate), 'MMMM yyyy'))
  const didInitScroll = useRef(false)
  const suppressClick = useRef(false)
  const scrollRaf = useRef<number | null>(null)

  // Fixed day list centered on today (stable identity)
  const days = useMemo(() => {
    const origin = startOfDay(new Date())
    return Array.from({ length: TOTAL }, (_, i) => addDays(origin, i - RANGE))
  }, [today]) // recompute if calendar day rolls over while app is open

  const dateToIndex = useCallback((dateStr: string) => {
    const origin = startOfDay(new Date())
    const target = startOfDay(parseISO(dateStr))
    const idx = Math.round((target.getTime() - origin.getTime()) / 86_400_000) + RANGE
    return Math.max(0, Math.min(TOTAL - 1, idx))
  }, [])

  const scrollToDate = useCallback((dateStr: string, smooth = true) => {
    const el = scrollerRef.current
    if (!el || cellPx === 0) return
    const idx = dateToIndex(dateStr)
    // Center the cell in the viewport (7 cells wide)
    const left = idx * cellPx - (VISIBLE / 2 - 0.5) * cellPx
    el.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' })
  }, [cellPx, dateToIndex])

  const goToToday = useCallback(() => {
    onSelectDate(today)
    scrollToDate(today, true)
  }, [onSelectDate, today, scrollToDate])

  useImperativeHandle(ref, () => ({ goToToday, scrollToDate }), [goToToday, scrollToDate])

  // Measure cell width from container
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    function measure() {
      setCellPx((scrollerRef.current?.clientWidth ?? 0) / VISIBLE)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Initial scroll: center on selected date (usually today) without animation
  useLayoutEffect(() => {
    if (cellPx === 0 || didInitScroll.current) return
    didInitScroll.current = true
    scrollToDate(selectedDate, false)
  }, [cellPx, selectedDate, scrollToDate])

  const reportVisibleRange = useCallback(() => {
    const el = scrollerRef.current
    if (!el || cellPx === 0) return

    const firstIdx = Math.max(0, Math.floor(el.scrollLeft / cellPx))
    const lastIdx  = Math.min(TOTAL - 1, Math.ceil((el.scrollLeft + el.clientWidth) / cellPx) - 1)
    const midIdx   = Math.round((firstIdx + lastIdx) / 2)

    const start = format(days[firstIdx], 'yyyy-MM-dd')
    const end   = format(days[lastIdx], 'yyyy-MM-dd')
    setVisibleMonth(format(days[midIdx], 'MMMM yyyy'))
    onVisibleRangeChange?.(start, end)
  }, [cellPx, days, onVisibleRangeChange])

  useEffect(() => {
    if (cellPx === 0) return
    reportVisibleRange()
  }, [cellPx, reportVisibleRange])

  function handleScroll() {
    if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current)
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null
      reportVisibleRange()
    })
  }

  // Distinguish tap from scroll-drag on touch devices
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  function handlePointerDown(e: React.PointerEvent) {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    suppressClick.current = false
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointerStart.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    if (dx > 8 || dy > 8) suppressClick.current = true
  }

  function handlePointerUp() {
    pointerStart.current = null
  }

  function handleTap(dayDate: Date) {
    if (suppressClick.current) return
    const dateStr = format(dayDate, 'yyyy-MM-dd')
    if (dateStr > limit) return
    if (dateStr === selectedDate) return
    onSelectDate(dateStr)
    // Intentionally do NOT scroll / re-center
  }

  return (
    <div className="select-none">
      <p
        className="text-center text-xs font-medium mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {visibleMonth}
      </p>

      <div
        ref={scrollerRef}
        className="overflow-x-auto scrollbar-none"
        style={{
          height: 76,
          // Allow horizontal pan; keep vertical page scroll available
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {cellPx > 0 && (
          <div className="flex" style={{ width: TOTAL * cellPx }}>
            {days.map((day) => {
              const dateStr    = format(day, 'yyyy-MM-dd')
              const isSelected = dateStr === selectedDate
              const isTodayDay = isToday(day)
              const isFuture   = dateStr > limit
              const dots       = dotsByDate[dateStr] ?? []

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleTap(day)}
                  disabled={isFuture}
                  style={{ width: cellPx }}
                  className={`
                    flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-1
                    rounded-xl
                    ${isFuture ? 'opacity-25 cursor-not-allowed' : !isSelected ? 'hover:bg-black/5' : ''}
                  `}
                >
                  <span
                    className="text-[9px] font-semibold tracking-wider"
                    style={{
                      color: isSelected
                        ? 'rgba(255,255,255,0.85)'
                        : isTodayDay
                          ? 'var(--color-accent)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    {format(day, 'EEE').toUpperCase()}
                  </span>

                  <span
                    className="text-base font-bold leading-none w-9 h-9 flex items-center justify-center rounded-full"
                    style={{
                      background: isSelected ? 'var(--color-accent)' : 'transparent',
                      color: isSelected
                        ? '#ffffff'
                        : isTodayDay
                          ? 'var(--color-accent)'
                          : 'var(--color-text)',
                    }}
                  >
                    {format(day, 'd')}
                  </span>

                  <div className="flex gap-0.5" style={{ height: 6 }}>
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

      {/* "Back to today" — selects today AND scrolls it into view */}
      <div className="flex justify-center mt-2" style={{ minHeight: 24 }}>
        {!isOnToday && (
          <button
            type="button"
            onClick={goToToday}
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
})
