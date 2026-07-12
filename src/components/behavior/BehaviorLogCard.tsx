import { format, parseISO } from 'date-fns'
import { Link2, User } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import type { BehaviorLog, SensoryLog } from '../../types'
import { SEVERITY_LABELS, HELPED_OPTIONS } from '../../lib/behaviorConstants'
import { REGULATION_LABEL, REGULATION_ZONES } from '../../lib/sensoryConstants'

interface Props {
  log: BehaviorLog
  linkedSensoryLog?: SensoryLog | null
  authorName?: string
  onClick?: () => void
  onLinkedSensoryClick?: () => void
  compact?: boolean
}

export function BehaviorLogCard({
  log, linkedSensoryLog, authorName, onClick, onLinkedSensoryClick, compact = false,
}: Props) {
  const severityMeta = SEVERITY_LABELS[log.severity] ?? SEVERITY_LABELS[3]
  const helpedMeta = HELPED_OPTIONS.find(o => o.value === log.helped)
  const timeStr = log.time_of_day.slice(0, 5)  // "HH:MM"

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left flex items-start gap-3 bg-amber-50 rounded-xl border border-amber-200 p-3 hover:border-amber-300 hover:shadow-sm transition-all"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ModuleIcon name="behavior" className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-amber-700 capitalize">{log.behavior}</span>
            <span className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${severityMeta.bg} ${severityMeta.color}`}>
              {severityMeta.label}
            </span>
            <span className="text-xs text-gray-400">{timeStr}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 capitalize truncate">
            Trigger: {log.antecedent}
            {log.location ? ` · ${log.location}` : ''}
          </p>
          {linkedSensoryLog && (
            <p className="text-xs text-violet-600 mt-0.5 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Linked sensory event
            </p>
          )}
          {authorName && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" /> {authorName}
            </p>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
        <ModuleIcon name="behavior" className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
          Behavior Log
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {format(parseISO(log.entry_date), 'EEE, MMM d')} · {timeStr}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Behavior + severity */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 capitalize text-sm">{log.behavior}</span>
          <span className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${severityMeta.bg} ${severityMeta.color}`}>
            {severityMeta.label}
          </span>
          {log.duration_mins && (
            <span className="text-xs text-gray-400">{log.duration_mins} min</span>
          )}
          {log.location && (
            <span className="text-xs text-gray-400 capitalize">· {log.location}</span>
          )}
        </div>

        {/* ABC summary */}
        <div className="grid grid-cols-[3rem_1fr] gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold text-gray-400">Trigger</span>
          <span className="text-gray-700 capitalize">
            {log.antecedent}
            {log.antecedent_note ? ` — ${log.antecedent_note}` : ''}
          </span>
          {log.consequence && (
            <>
              <span className="font-semibold text-gray-400">Response</span>
              <span className="text-gray-700 line-clamp-2">{log.consequence}</span>
            </>
          )}
        </div>

        {/* Helped badge */}
        {helpedMeta && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Helped?</span>
            <span className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${helpedMeta.color}`}>
              {helpedMeta.label}
            </span>
          </div>
        )}

        {/* Author */}
        {authorName && (
          <div className="flex items-center gap-1 text-xs text-gray-400 pt-1 border-t border-gray-100">
            <User className="w-3 h-3" /> Logged by {authorName}
          </div>
        )}

        {/* Linked sensory event */}
        {linkedSensoryLog && (() => {
          const zone = REGULATION_ZONES.find(z => z.value === linkedSensoryLog.regulation_level) ?? REGULATION_ZONES[0]
          return (
            <div
              onClick={e => { e.stopPropagation(); onLinkedSensoryClick?.() }}
              className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 cursor-pointer hover:bg-violet-100 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <span className={`text-xs font-semibold ${zone.color}`}>
                  {zone.emoji} {REGULATION_LABEL[linkedSensoryLog.regulation_level]}
                </span>
                {linkedSensoryLog.sensory_triggers.length > 0 && (
                  <span className="ml-1.5 text-xs text-gray-400">
                    — {linkedSensoryLog.sensory_triggers.slice(0, 2).join(', ')}
                    {linkedSensoryLog.sensory_triggers.length > 2 ? '…' : ''}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-violet-600">Sensory event →</span>
            </div>
          )
        })()}
      </div>
    </button>
  )
}
