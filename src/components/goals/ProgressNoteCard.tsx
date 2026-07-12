import { format, parseISO } from 'date-fns'
import { ModuleIcon } from '../ui/ModuleIcon'
import { ratingMeta } from '../../lib/goalConstants'
import type { Goal, ProgressNote } from '../../types'

interface Props {
  note: ProgressNote
  goal?: Goal | null
  authorName?: string
  compact?: boolean
  onClick?: () => void
}

export function ProgressNoteCard({ note, goal, authorName, compact, onClick }: Props) {
  const rm = ratingMeta(note.rating as Parameters<typeof ratingMeta>[0])

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-warm-200 shadow-sm transition-all ${
          onClick ? 'cursor-pointer hover:shadow-md hover:border-teal-200 active:scale-[0.99]' : ''
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ModuleIcon name="goals" className="w-3.5 h-3.5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${rm.color}`}>
              {rm.label}
            </span>
            {goal && (
              <span className="text-xs text-gray-500 truncate">{goal.title}</span>
            )}
          </div>
          {note.notes && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{note.notes}</p>
          )}
          {authorName && (
            <p className="text-xs text-gray-400 mt-0.5">
              Logged by <span className="font-medium text-gray-500">{authorName}</span>
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
          {format(parseISO(note.note_date + 'T12:00:00'), 'MMM d')}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-warm-200 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-teal-200 active:scale-[0.99]' : ''
      }`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ModuleIcon name="goals" className="w-4 h-4 text-teal-600" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${rm.color}`}>
                    {rm.label}
                  </span>
                  {goal && (
                    <span className="text-xs font-medium text-gray-600 truncate">{goal.title}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {format(parseISO(note.note_date + 'T12:00:00'), 'MMM d, yyyy')}
              </span>
            </div>

            {/* Notes */}
            {note.notes && (
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{note.notes}</p>
            )}

            {/* Footer */}
            {authorName && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-gray-400">Logged by</span>
                <span className="text-xs font-medium text-gray-500">{authorName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
