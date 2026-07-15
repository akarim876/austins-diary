/**
 * Icon and color palettes for custom trackers.
 * Icons come from lucide-react — rendered by TrackerIcon component.
 */

import {
  Activity,
  Apple,
  Award,
  Brain,
  Clock,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Gamepad2,
  Heart,
  Moon,
  Music,
  Pencil,
  Phone,
  Pill,
  Smile,
  Star,
  Sun,
  Target,
  Timer,
  TrendingUp,
  Tv,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export const TRACKER_ICON_MAP: Record<string, LucideIcon> = {
  activity:   Activity,
  apple:      Apple,
  award:      Award,
  brain:      Brain,
  clock:      Clock,
  coffee:     Coffee,
  droplets:   Droplets,
  dumbbell:   Dumbbell,
  flame:      Flame,
  footprints: Footprints,
  gamepad:    Gamepad2,
  heart:      Heart,
  moon:       Moon,
  music:      Music,
  pencil:     Pencil,
  phone:      Phone,
  pill:       Pill,
  smile:      Smile,
  star:       Star,
  sun:        Sun,
  target:     Target,
  timer:      Timer,
  trending:   TrendingUp,
  tv:         Tv,
  zap:        Zap,
}

export type TrackerIconName = keyof typeof TRACKER_ICON_MAP

export const TRACKER_ICON_NAMES = Object.keys(TRACKER_ICON_MAP) as TrackerIconName[]

export const TRACKER_COLORS = [
  '#5B7B7A', // sage
  '#C1694F', // terracotta
  '#3E7C7C', // coastal
  '#7C6A8E', // plum
  '#D99A6C', // amber
  '#8FB89C', // mint
  '#6875C8', // indigo
  '#C77B6A', // coral
  '#9B8EC4', // violet
  '#2E7D60', // forest
] as const

export type TrackerColor = typeof TRACKER_COLORS[number]

/** Return a lucide component for a tracker icon name (falls back to Star). */
export function getTrackerIcon(name: string): LucideIcon {
  return TRACKER_ICON_MAP[name] ?? Star
}

/** Hex → subtle background (same 12% alpha pattern used elsewhere) */
export function trackerIconBg(color: string): string {
  return color + '1E'  // ~12% opacity hex suffix
}

export type TrackerType = 'duration' | 'counter' | 'yes_no' | 'rating'

export const TRACKER_TYPE_OPTIONS: { id: TrackerType; label: string; description: string }[] = [
  {
    id: 'duration',
    label: 'Duration',
    description:
      'Log how long something lasted — screen time, a meltdown, outdoor play, a therapy session. Enter minutes manually or use a start/stop timer. Each entry stores a duration, an optional start time, and a notes field. Great for tracking anything where length matters more than a simple count.',
  },
  {
    id: 'counter',
    label: 'Counter',
    description:
      'Tally how many times something happens in a day — bites at a meal, requests for a break, self-injurious behaviors, positive interactions. Tap + to increment, − to decrement. Each log entry records the count at that moment with an optional note. Ideal for frequency tracking where you want a running total.',
  },
  {
    id: 'yes_no',
    label: 'Yes / No',
    description:
      'Record whether something happened at all on a given day — Did they take their medication? Did they sleep in their own bed? Did a challenging behavior occur? One toggle per day with an optional note. Simple and fast for routines and daily check-ins where a true/false answer is all you need.',
  },
  {
    id: 'rating',
    label: 'Rating',
    description:
      'Capture a subjective level or quality on a 1–5 scale — mood, pain, appetite, cooperation, anxiety. Each entry stores the score, an optional time, and a notes field. Useful when "good day / bad day" is too vague but a full behavior log is more than you need. Trends show up clearly in the History charts over time.',
  },
]

export function trackerTypeLabel(t: TrackerType): string {
  return TRACKER_TYPE_OPTIONS.find(o => o.id === t)?.label ?? t
}

/** Format a log value for display, given the tracker type. */
export function formatTrackerValue(
  type: TrackerType,
  opts: {
    duration_minutes?: number | null
    counter_value?: number | null
    yes_no_value?: boolean | null
    rating_value?: number | null
  },
): string {
  switch (type) {
    case 'duration': {
      const m = opts.duration_minutes
      if (!m) return '—'
      const h = Math.floor(m / 60), r = m % 60
      return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${m} min`
    }
    case 'counter':
      return opts.counter_value != null ? String(opts.counter_value) : '—'
    case 'yes_no':
      return opts.yes_no_value == null ? '—' : opts.yes_no_value ? 'Yes' : 'No'
    case 'rating':
      return opts.rating_value != null ? `${opts.rating_value}/5` : '—'
  }
}
