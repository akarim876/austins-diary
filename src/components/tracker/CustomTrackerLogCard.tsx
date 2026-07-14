/**
 * Compact display card for a custom tracker log entry.
 * Shows the tracker icon, name, formatted value, and optional notes.
 */

import { getTrackerIcon, trackerIconBg, formatTrackerValue } from '../../lib/trackerIcons'
import type { CustomTracker, CustomTrackerLog } from '../../types'

interface Props {
  log:     CustomTrackerLog
  tracker: CustomTracker
  onClick?: () => void
}

export function CustomTrackerLogCard({ log, tracker, onClick }: Props) {
  const Icon  = getTrackerIcon(tracker.icon_name)
  const value = formatTrackerValue(tracker.tracker_type, log)
  const bg    = trackerIconBg(tracker.color)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-start gap-3 p-3 rounded-xl border border-warm-100 text-left transition hover:bg-warm-50 disabled:cursor-default"
    >
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: bg }}
      >
        <Icon className="w-4 h-4" style={{ color: tracker.color }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{tracker.name}</p>
          <span
            className="text-sm font-bold tabular-nums flex-shrink-0"
            style={{ color: tracker.color }}
          >
            {value}
          </span>
        </div>
        {log.notes && (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{log.notes}</p>
        )}
      </div>
    </button>
  )
}
