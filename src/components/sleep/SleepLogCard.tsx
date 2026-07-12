import { format, parseISO } from 'date-fns'
import { BedDouble, Clock, SunSnow, Zap } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import { qualityColor, qualityLabel, formatDuration, calcNapMinutes } from '../../lib/sleepConstants'
import type { SleepLog } from '../../types'

interface Props {
  log: SleepLog
  authorName?: string
  compact?: boolean
  onClick?: () => void
}

function fmt12(time: string | null): string {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function SleepLogCard({ log, authorName, compact, onClick }: Props) {
  const isDraft = !log.bedtime || !log.wake_time

  const totalNapMins = log.naps.reduce((acc, n) => {
    if (n.start_time && n.end_time) acc += calcNapMinutes(n.start_time, n.end_time)
    return acc
  }, 0)

  const cardClass = `
    bg-white rounded-xl border shadow-sm transition-all
    ${isDraft ? 'border-indigo-200 bg-indigo-50/30' : 'border-warm-200'}
    ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 active:scale-[0.99]' : ''}
  `

  return (
    <div className={cardClass} onClick={onClick}>
      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ModuleIcon name="sleep" className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">
                {format(parseISO(log.log_date + 'T12:00:00'), 'MMM d')} night
              </span>
              {isDraft && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  Draft
                </span>
              )}
              {log.sleep_quality && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${qualityColor(log.sleep_quality)}`}>
                  {qualityLabel(log.sleep_quality)}
                </span>
              )}
            </div>

            {/* Sleep window */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <BedDouble className="w-3.5 h-3.5 text-indigo-400" />
                {fmt12(log.bedtime)}
                {' → '}
                {fmt12(log.wake_time)}
              </span>
              {log.total_sleep_minutes != null && (
                <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                  <Clock className="w-3 h-3" />
                  {formatDuration(log.total_sleep_minutes)}
                </span>
              )}
            </div>

            {/* Stats row */}
            {!compact && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {log.night_wakings_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {log.night_wakings_count} waking{log.night_wakings_count !== 1 ? 's' : ''}
                  </span>
                )}
                {log.nap_enabled && log.naps.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <SunSnow className="w-3 h-3 text-sky-400" />
                    {log.naps.length} nap{log.naps.length !== 1 ? 's' : ''}
                    {totalNapMins > 0 && ` · ${formatDuration(totalNapMins)}`}
                  </span>
                )}
                {log.notes && (
                  <span className="text-xs text-gray-400 italic truncate max-w-[180px]">{log.notes}</span>
                )}
              </div>
            )}

            {/* Compact stats */}
            {compact && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {log.night_wakings_count > 0 && (
                  <span className="text-xs text-gray-400">
                    {log.night_wakings_count}× waking
                  </span>
                )}
                {log.nap_enabled && log.naps.length > 0 && totalNapMins > 0 && (
                  <span className="text-xs text-gray-400">
                    nap {formatDuration(totalNapMins)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Waking details — only on full card */}
        {!compact && log.night_wakings_detail.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {log.night_wakings_detail.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500 pl-10">
                <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                Waking {i + 1}: {w.cause}{w.cause === 'Other' && w.cause_other ? ` — ${w.cause_other}` : ''}
                {w.duration_minutes ? `, ${w.duration_minutes} min` : ''}
              </div>
            ))}
          </div>
        )}

        {/* Nap details — only on full card */}
        {!compact && log.nap_enabled && log.naps.length > 0 && (
          <div className="mt-2 space-y-1 pl-10">
            {log.naps.map((n, i) => (
              <div key={i} className="text-xs text-gray-500 flex items-center gap-1">
                <SunSnow className="w-3 h-3 text-sky-400 flex-shrink-0" />
                Nap {i + 1}: {fmt12(n.start_time)} – {fmt12(n.end_time)}
                {n.start_time && n.end_time && calcNapMinutes(n.start_time, n.end_time) > 0 && (
                  <span className="text-sky-600 font-medium">
                    ({formatDuration(calcNapMinutes(n.start_time, n.end_time))})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Author badge */}
        {authorName && (
          <div className="mt-2 pl-10">
            <span className="text-xs text-gray-400">Logged by {authorName}</span>
          </div>
        )}
      </div>
    </div>
  )
}
