import type { GoalSource, GoalStatus, ProgressRating } from '../types'

// ─── Sources ──────────────────────────────────────────────────────────────────
export const GOAL_SOURCES: GoalSource[] = [
  'IEP', 'ABA', 'OT', 'Speech', 'Behavior Plan', 'Other',
]

export const SOURCE_COLORS: Record<GoalSource, string> = {
  'IEP':           'bg-blue-100 text-blue-700',
  'ABA':           'bg-amber-100 text-amber-700',
  'OT':            'bg-orange-100 text-orange-700',
  'Speech':        'bg-purple-100 text-purple-700',
  'Behavior Plan': 'bg-red-100 text-red-700',
  'Other':         'bg-gray-100 text-gray-600',
}

// ─── Statuses ─────────────────────────────────────────────────────────────────
export const GOAL_STATUSES: Array<{ value: GoalStatus; label: string; color: string }> = [
  { value: 'active',       label: 'Active',       color: 'bg-brand-50 text-brand-700 border-brand-200'    },
  { value: 'on_hold',      label: 'On hold',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'achieved',     label: 'Achieved',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'discontinued', label: 'Discontinued', color: 'bg-gray-100 text-gray-500 border-gray-200'   },
]

export function statusMeta(status: GoalStatus) {
  return GOAL_STATUSES.find(s => s.value === status) ?? GOAL_STATUSES[0]
}

// ─── Progress ratings ─────────────────────────────────────────────────────────
export const PROGRESS_RATINGS: Array<{
  value: ProgressRating
  label: string
  shortLabel: string
  color: string      // Tailwind badge classes
  dotColor: string   // for timeline dots
}> = [
  { value: 'regression',      label: 'Regression',      shortLabel: '↓',  color: 'bg-red-100 text-red-700 border-red-200',       dotColor: 'bg-red-400'     },
  { value: 'no_change',       label: 'No change',       shortLabel: '—',  color: 'bg-gray-100 text-gray-600 border-gray-200',    dotColor: 'bg-gray-400'    },
  { value: 'slight_progress', label: 'Slight progress', shortLabel: '↑',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotColor: 'bg-yellow-400' },
  { value: 'good_progress',   label: 'Good progress',   shortLabel: '↑↑', color: 'bg-brand-50 text-brand-700 border-brand-200',    dotColor: 'bg-brand-500'    },
  { value: 'goal_met',        label: 'Goal met',        shortLabel: '★',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
]

export function ratingMeta(rating: ProgressRating) {
  return PROGRESS_RATINGS.find(r => r.value === rating) ?? PROGRESS_RATINGS[1]
}
