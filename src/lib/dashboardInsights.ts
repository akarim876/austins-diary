import { addDays, format, parseISO } from 'date-fns'
import type { BehaviorChartPoint, SleepChartPoint } from '../hooks/useDashboard'

export interface SleepBehaviorInsight {
  /** Avg next-day behavior incidents following a night under `threshold` hours */
  lowAvg: number
  /** Avg next-day behavior incidents following a night at/above `threshold` hours */
  okAvg: number
  lowNights: number
  okNights: number
  threshold: number
}

const MIN_NIGHTS_PER_BUCKET = 3

/**
 * Compares next-day behavior-incident counts following a "short" sleep night
 * vs a night that met the `threshold`. This is a plain average comparison
 * over whatever data has been logged — not a statistical significance test —
 * so it's only returned once there's enough data in *both* buckets to be a
 * reasonable read, rather than surfacing a misleading signal from 1–2 nights.
 */
export function computeSleepBehaviorInsight(
  sleepChart: SleepChartPoint[],
  behaviorChart: BehaviorChartPoint[],
  threshold = 7,
): SleepBehaviorInsight | null {
  const behaviorCountByDate = new Map(behaviorChart.map(p => [p.date, p.count]))

  const lowNightCounts: number[] = []
  const okNightCounts: number[] = []

  for (const night of sleepChart) {
    if (night.hours == null) continue
    const nextDate = format(addDays(parseISO(night.date), 1), 'yyyy-MM-dd')
    const nextDayCount = behaviorCountByDate.get(nextDate)
    if (nextDayCount == null) continue // next day falls outside the loaded window

    if (night.hours < threshold) lowNightCounts.push(nextDayCount)
    else okNightCounts.push(nextDayCount)
  }

  if (lowNightCounts.length < MIN_NIGHTS_PER_BUCKET || okNightCounts.length < MIN_NIGHTS_PER_BUCKET) {
    return null
  }

  const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

  return {
    lowAvg: avg(lowNightCounts),
    okAvg: avg(okNightCounts),
    lowNights: lowNightCounts.length,
    okNights: okNightCounts.length,
    threshold,
  }
}
