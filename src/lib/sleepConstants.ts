export const SLEEP_QUALITY_OPTIONS = [
  { value: 1, label: 'Very poor', color: 'bg-red-100 text-red-700 border-red-200'     },
  { value: 2, label: 'Poor',      color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 3, label: 'Fair',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 4, label: 'Good',      color: 'bg-teal-100 text-teal-700 border-teal-200'   },
  { value: 5, label: 'Very good', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
] as const

export const WAKING_CAUSES = ['Noise', 'Bathroom', 'Nightmare', 'Unknown', 'Other'] as const

/** Color class for a quality value (1–5). Falls back to gray. */
export function qualityColor(q: number | null): string {
  return SLEEP_QUALITY_OPTIONS.find(o => o.value === q)?.color ?? 'bg-gray-100 text-gray-500 border-gray-200'
}

export function qualityLabel(q: number | null): string {
  return SLEEP_QUALITY_OPTIONS.find(o => o.value === q)?.label ?? 'Unknown'
}

/**
 * Given two time strings in "HH:MM" format, calculate total sleep minutes.
 * Assumes wake_time is on the NEXT calendar day if it is earlier than bedtime
 * (i.e. sleep crosses midnight, which is the normal case).
 */
export function calcSleepMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  const bed  = bh * 60 + bm
  const wake = wh * 60 + wm
  return wake <= bed ? 24 * 60 - bed + wake : wake - bed
}

/** Format a minute count as "Xh Ym" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Calculate nap duration in minutes from HH:MM strings */
export function calcNapMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const s = sh * 60 + sm
  const e = eh * 60 + em
  return e > s ? e - s : 0
}
