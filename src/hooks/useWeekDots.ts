/**
 * Fetches which dates have entries for each module within a date range.
 * Returns a Record<dateStr, string[]> of up to 3 CSS color values per day.
 * Used by WeekStrip on the Dashboard where we don't already have all logs in memory.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'

// Priority-ordered dot colors (first 3 win per day)
const MODULE_COLORS: { table: string; dateCol: string; color: string }[] = [
  { table: 'behavior_logs',   dateCol: 'entry_date', color: '#D4A843' },  // amber
  { table: 'sensory_logs',    dateCol: 'entry_date', color: '#9B8EC4' },  // violet
  { table: 'diet_logs',       dateCol: 'entry_date', color: '#7CB48F' },  // mint
  { table: 'sleep_logs',      dateCol: 'log_date',   color: '#6875C8' },  // indigo
  { table: 'diary_entries',   dateCol: 'entry_date', color: '#5B7B7A' },  // accent
  { table: 'appointments',    dateCol: 'appt_date',  color: '#C77B6A' },  // coral
  { table: 'progress_notes',  dateCol: 'note_date',  color: '#2E7D60' },  // forest
]

export function useWeekDots(profileId: string | null, centerDate: string) {
  const [dotsByDate, setDotsByDate] = useState<Record<string, string[]>>({})
  // Cache the fetched window so we don't re-query on every swipe
  const cachedRange = useRef<{ start: string; end: string } | null>(null)

  // Extend the window ±10 days so adjacent swipes don't trigger re-queries
  const { startDate, endDate } = useMemo(() => {
    const center = parseISO(centerDate)
    return {
      startDate: format(addDays(center, -10), 'yyyy-MM-dd'),
      endDate:   format(addDays(center, +10), 'yyyy-MM-dd'),
    }
  }, [centerDate])

  useEffect(() => {
    if (!profileId) return

    // Skip if the new center is still within the cached window
    if (
      cachedRange.current &&
      centerDate >= cachedRange.current.start &&
      centerDate <= cachedRange.current.end
    ) return

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

      cachedRange.current = { start: startDate, end: endDate }
      setDotsByDate(
        Object.fromEntries(
          Object.entries(map).map(([d, colors]) => [d, [...colors].slice(0, 3)])
        )
      )
    }

    fetch()
    return () => controller.abort()
  }, [profileId, startDate, endDate, centerDate])

  return dotsByDate
}
