import { format, parseISO } from 'date-fns'
import { ArrowRight, Bell } from 'lucide-react'
import type { Appointment, Provider } from '../../types'

interface Props {
  appointment: Appointment   // the ORIGINAL appointment that has the follow-up
  provider?: Provider | null
  onViewOriginal: () => void
  onConvert: () => void
}

export function FollowupReminderCard({ appointment, provider, onViewOriginal, onConvert }: Props) {
  return (
    <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/60 px-4 py-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Follow-up reminder</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
            {provider?.name ?? 'No provider'} — {appointment.type}
          </p>
          {appointment.appt_date && (
            <p className="text-xs text-gray-500 mt-0.5">
              Original appt: {format(parseISO(appointment.appt_date + 'T12:00:00'), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Follow-up text */}
      {appointment.followup_text && (
        <p className="text-sm text-gray-700 leading-relaxed pl-0.5">
          {appointment.followup_text}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onViewOriginal}
          className="flex-1 py-2 rounded-xl border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-100 transition"
        >
          View original
        </button>
        <button
          type="button"
          onClick={onConvert}
          className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-1"
        >
          Convert to appointment
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
