import { format, parseISO } from 'date-fns'
import { Link2, User } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import type { SensoryLog, BehaviorLog } from '../../types'
import { REGULATION_ZONES, HELPED_OPTIONS, REGULATION_LABEL } from '../../lib/sensoryConstants'
import { SEVERITY_LABELS } from '../../lib/behaviorConstants'

interface Props {
  log: SensoryLog
  linkedBehaviorLog?: BehaviorLog | null
  authorName?: string
  onClick?: () => void
  onLinkedBehaviorClick?: () => void
  compact?: boolean
}

export function SensoryLogCard({
  log, linkedBehaviorLog, authorName, onClick, onLinkedBehaviorClick, compact = false,
}: Props) {
  const zone       = REGULATION_ZONES.find(z => z.value === log.regulation_level) ?? REGULATION_ZONES[0]
  const helpedMeta = HELPED_OPTIONS.find(o => o.value === log.helped)
  const timeStr    = log.time_of_day.slice(0, 5)

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left flex items-start gap-3 ${zone.bg} rounded-xl border ${zone.border} p-3 hover:shadow-sm transition-all`}
      >
        <div className={`w-8 h-8 rounded-xl ${zone.selectedBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <ModuleIcon name="sensory" className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold ${zone.color}`}>
              {REGULATION_LABEL[log.regulation_level]}
            </span>
            <span className="text-xs text-gray-400">{timeStr}</span>
            {log.duration_mins && (
              <span className="text-xs text-gray-400">{log.duration_mins} min</span>
            )}
          </div>
          {log.sensory_triggers.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {log.sensory_triggers.join(', ')}
              {log.location ? ` · ${log.location}` : ''}
            </p>
          )}
          {log.behavior_log_id && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Linked to behavior log
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
      className="w-full text-left bg-white rounded-xl border border-violet-200 shadow-sm hover:shadow-md hover:border-violet-300 transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100">
        <ModuleIcon name="sensory" className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
          Sensory &amp; Regulation
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {format(parseISO(log.entry_date), 'EEE, MMM d')} · {timeStr}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Zone + meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${zone.color}`}>
            {zone.emoji} {REGULATION_LABEL[log.regulation_level]}
          </span>
          {log.duration_mins && (
            <span className="text-xs text-gray-400">{log.duration_mins} min</span>
          )}
          {log.location && (
            <span className="text-xs text-gray-400 capitalize">· {log.location}</span>
          )}
        </div>

        {/* Triggers */}
        {log.sensory_triggers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {log.sensory_triggers.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-xl bg-violet-50 text-xs text-violet-700 font-semibold">
                {t}
              </span>
            ))}
            {log.sensory_triggers_other && (
              <span className="text-xs text-gray-500 italic self-center">{log.sensory_triggers_other}</span>
            )}
          </div>
        )}

        {/* Strategies */}
        {log.calming_strategies.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-xs text-gray-400 mr-0.5">Strategy:</span>
            {log.calming_strategies.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-xl bg-teal-50 text-xs text-teal-700 font-semibold">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {log.notes && (
          <p className="text-xs text-gray-600 line-clamp-2 italic">{log.notes}</p>
        )}

        {/* Helped */}
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

        {/* Linked behavior log */}
        {linkedBehaviorLog && (
          <div
            onClick={e => { e.stopPropagation(); onLinkedBehaviorClick?.() }}
            className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <span className="text-xs font-semibold text-amber-800 capitalize">{linkedBehaviorLog.behavior}</span>
              <span className={`ml-2 text-xs px-2.5 py-1 rounded-xl font-semibold ${SEVERITY_LABELS[linkedBehaviorLog.severity]?.bg ?? ''} ${SEVERITY_LABELS[linkedBehaviorLog.severity]?.color ?? ''}`}>
                {SEVERITY_LABELS[linkedBehaviorLog.severity]?.label}
              </span>
            </div>
            <span className="text-[10px] text-amber-600">Linked behavior →</span>
          </div>
        )}
      </div>
    </button>
  )
}
