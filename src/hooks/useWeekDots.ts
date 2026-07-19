/**
 * Fetches which dates have entries for each module within a date range.
 * Returns a Record<dateStr, string[]> of up to 3 CSS color values per day.
 *
 * Driven by the WeekStrip's *visible scroll window*, not the selected date —
 * users can browse far from the selected day while dots stay in sync.
 */
import { useEffect, useRef, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'

const MODULE_COLORS: { table: string; dateCol: string; color: string }[] = [
  { table: 'behavior_logs',   dateCol: 'entry_date', color: '#D4A843' },
  { table: 'sensory_logs',    dateCol: 'entry_date', color: '#9B8EC4' },
  { table: 'diet_logs',       dateCol: 'entry_date', color: '#7CB48F' },
  { table: 'sleep_logs',      dateCol: 'log_date',   color: '#6875C8' },
  { table: 'diary_entries',   dateCol: 'entry_date', color: '#5B7B7A' },
  { table: 'appointments',    dateCol: 'appt_date',  color: '#C77B6A' },
  { table: 'progress_notes',  dateCol: 'note_date',  color: '#2E7D60' },
]

/** Padding around the visible window so adjacent scrolls don't always re-fetch */
const PAD_DAYS = 14

export function useWeekDots(
  profileId: string | null,
  visibleStart: string | null,
  visibleEnd: string | null,
) {
  const [dotsByDate, setDotsByDate] = useState<Record<string, string[]>>({})
  /** Inclusive range already fetched and merged into dotsByDate */
  const cachedRange = useRef<{ start: string; end: string } | null>(null)

  // Reset cache when the active profile changes
  useEffect(() => {
    cachedRange.current = null
    setDotsByDate({})
  }, [profileId])

  useEffect(() => {
    if (!profileId || !visibleStart || !visibleEnd) return

    const cached = cachedRange.current
    // Skip if the entire visible window is already covered
    if (
      cached &&
      visibleStart >= cached.start &&
      visibleEnd <= cached.end
    ) return

    const startDate = format(addDays(parseISO(visibleStart), -PAD_DAYS), 'yyyy-MM-dd')
    const endDate   = format(addDays(parseISO(visibleEnd),   +PAD_DAYS), 'yyyy-MM-dd')

    const controller = new AbortController()

    async function fetch() {
      const results = await Promise.all(
        MODULE_COLORS.map(({ table, dateCol }) =>
          supabase
            .from(table as 'behavior_logs')
            .select(dateCol)
            .eq('profile_id', profileId!)
            .gte(dateCol, startDate)
            .lte(dateCol, endDate)
        )
      )

      if (controller.signal.aborted) return

      const map: Record<string, Set<string>> = {}
      results.forEach(({ data }, idx) => {
        const { dateCol, color } = MODULE_COLORS[idx]
        for (const row of (data ?? []) as unknown as Record<string, string>[]) {
          const d = row[dateCol]
          if (!map[d]) map[d] = new Set()
          map[d].add(color)
        }
      })

      const next = Object.fromEntries(
        Object.entries(map).map(([d, colors]) => [d, [...colors].slice(0, 3)])
      )

      // Expand cache bounds and merge dots so browsing back doesn't flash empty
      if (!cachedRange.current) {
        cachedRange.current = { start: startDate, end: endDate }
      } else {
        cachedRange.current = {
          start: startDate < cachedRange.current.start ? startDate : cachedRange.current.start,
          end:   endDate   > cachedRange.current.end   ? endDate   : cachedRange.current.end,
        }
      }

      setDotsByDate(prev => ({ ...prev, ...next }))
    }

    fetch()
    return () => controller.abort()
  }, [profileId, visibleStart, visibleEnd])

  return dotsByDate
}
