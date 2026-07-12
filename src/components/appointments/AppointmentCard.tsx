import { format, parseISO } from 'date-fns'
import { AlertCircle, ChevronRight, Clock } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import { statusMeta } from '../../lib/appointmentConstants'
import type { Appointment, AppointmentStatus, Provider } from '../../types'

interface Props {
  appointment: Appointment
  provider?: Provider | null
  authorName?: string
  compact?: boolean
  onClick?: () => void
}

export function AppointmentCard({ appointment: appt, provider, authorName, compact, onClick }: Props) {
  const sm = statusMeta(appt.status as AppointmentStatus)

  const dateStr = format(parseISO(appt.appt_date + 'T12:00:00'), 'MMM d, yyyy')
  const timeStr = appt.appt_time
    ? format(new Date(`1970-01-01T${appt.appt_time}`), 'h:mm a')
    : null

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-warm-200 shadow-sm transition-all ${
          onClick ? 'cursor-pointer hover:shadow-md hover:border-rose-200 active:scale-[0.99]' : ''
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ModuleIcon name="appointments" className="w-3.5 h-3.5 text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${sm.color}`}>
              {sm.label}
            </span>
            <span className="text-xs font-medium text-gray-700 truncate">
              {provider?.name ?? 'No provider'} · {appt.type}
            </span>
          </div>
          {appt.notes && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{appt.notes}</p>
          )}
          {authorName && (
            <p className="text-xs text-gray-400 mt-0.5">
              Logged by <span className="font-medium text-gray-500">{authorName}</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-xs text-gray-400">{format(parseISO(appt.appt_date + 'T12:00:00'), 'MMM d')}</span>
          {timeStr && <p className="text-xs text-gray-400">{timeStr}</p>}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-warm-200 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-rose-200 active:scale-[0.99]' : ''
      }`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ModuleIcon name="appointments" className="w-4 h-4 text-rose-600" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {provider?.name ?? 'No provider'} — {appt.type}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${sm.color}`}>
                    {sm.label}
                  </span>
                </div>
              </div>
              {onClick && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            </div>

            {/* Date / time */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <ModuleIcon name="appointments" className="w-3 h-3" />
                {dateStr}
              </span>
              {timeStr && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeStr}
                </span>
              )}
            </div>

            {/* Notes */}
            {appt.notes && (
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{appt.notes}</p>
            )}

            {/* Follow-up */}
            {appt.followup_needed && (
              <div className="flex items-start gap-1.5 mt-2 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">Follow-up needed</span>
                  {appt.followup_text && <p className="mt-0.5 font-normal">{appt.followup_text}</p>}
                  {appt.followup_date && (
                    <p className="mt-0.5 text-amber-600">
                      By {format(parseISO(appt.followup_date + 'T12:00:00'), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
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
