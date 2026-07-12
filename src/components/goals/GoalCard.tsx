import { format, parseISO } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import { SOURCE_COLORS, statusMeta } from '../../lib/goalConstants'
import type { Goal, GoalSource } from '../../types'

interface Props {
  goal: Goal
  progressCount?: number
  onClick?: () => void
}

export function GoalCard({ goal, progressCount, onClick }: Props) {
  const sm = statusMeta(goal.status)

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-warm-200 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-brand-200 active:scale-[0.99]' : ''
      }`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ModuleIcon name="goals" className="w-4 h-4 text-brand-600" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm leading-tight">{goal.title}</p>
              {onClick && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />}
            </div>

            {/* Source + status badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${SOURCE_COLORS[goal.source as GoalSource]}`}>
                {goal.source}
              </span>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${sm.color}`}>
                {sm.label}
              </span>
              {progressCount !== undefined && progressCount > 0 && (
                <span className="text-xs text-gray-400">
                  {progressCount} note{progressCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Description snippet */}
            {goal.description && (
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                {goal.description}
              </p>
            )}

            {/* Dates */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>Started {format(parseISO(goal.start_date + 'T12:00:00'), 'MMM d, yyyy')}</span>
              {goal.target_date && (
                <span>· Target {format(parseISO(goal.target_date + 'T12:00:00'), 'MMM d, yyyy')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
