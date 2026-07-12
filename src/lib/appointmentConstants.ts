import type { ProviderRole, AppointmentType, AppointmentStatus } from '../types'

// ─── Provider roles ───────────────────────────────────────────────────────────
export const PROVIDER_ROLES: ProviderRole[] = [
  'Pediatrician', 'Psychiatrist', 'ABA Therapist', 'OT',
  'Speech Therapist', 'Neurologist', 'School/IEP Contact', 'Other',
]

export const ROLE_COLORS: Record<ProviderRole, string> = {
  'Pediatrician':      'bg-blue-100 text-blue-700',
  'Psychiatrist':      'bg-purple-100 text-purple-700',
  'ABA Therapist':     'bg-amber-100 text-amber-700',
  'OT':                'bg-orange-100 text-orange-700',
  'Speech Therapist':  'bg-pink-100 text-pink-700',
  'Neurologist':       'bg-red-100 text-red-700',
  'School/IEP Contact':'bg-teal-100 text-teal-700',
  'Other':             'bg-gray-100 text-gray-600',
}

// ─── Appointment types ────────────────────────────────────────────────────────
export const APPOINTMENT_TYPES: AppointmentType[] = [
  'Regular session', 'Evaluation', 'School meeting', 'Follow-up', 'Other',
]

// ─── Appointment statuses ─────────────────────────────────────────────────────
export const APPOINTMENT_STATUSES: Array<{
  value: AppointmentStatus
  label: string
  color: string        // badge classes
  dotColor: string
}> = [
  { value: 'upcoming',   label: 'Upcoming',   color: 'bg-rose-100 text-rose-700 border-rose-200',     dotColor: 'bg-rose-400'  },
  { value: 'completed',  label: 'Completed',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  { value: 'cancelled',  label: 'Cancelled',  color: 'bg-gray-100 text-gray-500 border-gray-200',     dotColor: 'bg-gray-400'  },
  { value: 'no_show',    label: 'No-show',    color: 'bg-red-100 text-red-700 border-red-200',        dotColor: 'bg-red-500'   },
]

export function statusMeta(status: AppointmentStatus) {
  return APPOINTMENT_STATUSES.find(s => s.value === status) ?? APPOINTMENT_STATUSES[0]
}

/** Given a date string 'yyyy-MM-dd', return the default status. */
export function defaultStatus(dateStr: string): AppointmentStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return d < today ? 'completed' : 'upcoming'
}
