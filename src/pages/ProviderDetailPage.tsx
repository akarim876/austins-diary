import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, CalendarCheck, Edit2, Mail, Phone, Plus } from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useProfile } from '../contexts/ProfileContext'
import { useProvider } from '../hooks/useProviders'
import { useProviders } from '../hooks/useProviders'
import { useAppointmentsForProvider } from '../hooks/useAppointments'
import { useProfileMembers } from '../hooks/useProfileMembers'
import { useMyRole, canCreate } from '../hooks/useMyRole'
import { ProviderForm } from '../components/appointments/ProviderForm'
import { AppointmentForm } from '../components/appointments/AppointmentForm'
import { AppointmentCard } from '../components/appointments/AppointmentCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import { ROLE_COLORS } from '../lib/appointmentConstants'
import type { Appointment, ProviderRole } from '../types'

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const myRole = useMyRole(activeProfile?.id ?? null)
  const memberMap = useProfileMembers(activeProfile?.id ?? null)

  const { provider, loading: providerLoading, refetch: refetchProvider } = useProvider(id ?? null)
  const { providers, refetch: refetchProviders } = useProviders(activeProfile?.id ?? null)
  const { appointments, loading: apptLoading, refetch: refetchAppts } = useAppointmentsForProvider(id ?? null)

  const [editProviderOpen, setEditProviderOpen] = useState(false)
  const [apptFormOpen,     setApptFormOpen]     = useState(false)
  const [editingAppt,      setEditingAppt]       = useState<Appointment | null>(null)

  const loading = providerLoading || apptLoading

  // Sort: upcoming first, then past descending
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcoming = appointments.filter(a => new Date(a.appt_date + 'T00:00:00') >= today)
    .sort((a, b) => a.appt_date.localeCompare(b.appt_date))
  const past = appointments.filter(a => new Date(a.appt_date + 'T00:00:00') < today)
    .sort((a, b) => b.appt_date.localeCompare(a.appt_date))

  if (loading && !provider) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-warm-50">
        <Spinner className="w-8 h-8 text-rose-400" />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-warm-50 gap-4">
        <p className="text-gray-500">Provider not found</p>
        <button onClick={() => navigate('/providers')} className="text-rose-500 hover:underline text-sm">
          ← Back to providers
        </button>
      </div>
    )
  }

  const displayRole = provider.role === 'Other' && provider.role_other
    ? provider.role_other
    : provider.role

  return (
    <div className="min-h-screen bg-warm-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-warm-50/95 backdrop-blur border-b border-warm-200">
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition -ml-1">
              <ArrowLeft className="w-4.5 h-4.5 text-gray-600" />
            </button>
            <h1 className="flex-1 text-lg font-bold text-gray-900 truncate">{provider.name}</h1>
            {canCreate(myRole) && (
              <button onClick={() => setEditProviderOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                <Edit2 className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Provider summary card */}
        <div className="bg-white rounded-xl border border-warm-200 shadow-sm px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
              <ModuleIcon name="appointments" className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{provider.name}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[provider.role as ProviderRole]}`}>
                {displayRole}
              </span>
            </div>
          </div>

          {provider.organization && (
            <p className="text-sm text-gray-600">{provider.organization}</p>
          )}

          {(provider.phone || provider.email) && (
            <div className="flex flex-wrap gap-4">
              {provider.phone && (
                <a href={`tel:${provider.phone}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-rose-600 transition">
                  <Phone className="w-3.5 h-3.5" /> {provider.phone}
                </a>
              )}
              {provider.email && (
                <a href={`mailto:${provider.email}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-rose-600 transition">
                  <Mail className="w-3.5 h-3.5" /> {provider.email}
                </a>
              )}
            </div>
          )}

          {provider.address && (
            <p className="text-sm text-gray-500">{provider.address}</p>
          )}

          {provider.notes && (
            <div className="pt-2 border-t border-warm-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">{provider.notes}</p>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-1 border-t border-warm-100">
            Added {format(parseISO(provider.created_at), 'MMM d, yyyy')}
          </div>
        </div>

        {/* Appointments section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Appointments <span className="text-gray-400 font-normal">({appointments.length})</span>
            </h2>
            {canCreate(myRole) && (
              <button onClick={() => { setEditingAppt(null); setApptFormOpen(true) }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition border border-rose-200">
                <Plus className="w-3 h-3" /> Add appointment
              </button>
            )}
          </div>

          {apptLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6 text-rose-400" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-warm-200 text-center">
              <CalendarCheck className="w-8 h-8 text-rose-200 mb-2" />
              <p className="text-sm text-gray-400">No appointments logged yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2">Upcoming</p>
                  <div className="space-y-2">
                    {upcoming.map(a => (
                      <AppointmentCard key={a.id} appointment={a} provider={provider}
                        authorName={memberMap.get(a.author_id)}
                        onClick={() => { setEditingAppt(a); setApptFormOpen(true) }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Past</p>
                  <div className="space-y-2">
                    {past.map(a => (
                      <AppointmentCard key={a.id} appointment={a} provider={provider}
                        authorName={memberMap.get(a.author_id)}
                        onClick={() => { setEditingAppt(a); setApptFormOpen(true) }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit provider sheet */}
      <BottomSheet open={editProviderOpen} onClose={() => setEditProviderOpen(false)} title="Edit provider">
        <ProviderForm profileId={activeProfile?.id ?? ''} existingProvider={provider}
          onSaved={() => { setEditProviderOpen(false); refetchProvider(); refetchProviders() }}
          onCancel={() => setEditProviderOpen(false)} />
      </BottomSheet>

      {/* Appointment form sheet */}
      <BottomSheet open={apptFormOpen} onClose={() => { setApptFormOpen(false); setEditingAppt(null) }}
        title={editingAppt ? 'Edit appointment' : 'New appointment'}>
        <AppointmentForm profileId={activeProfile?.id ?? ''} providers={providers}
          existingAppt={editingAppt} defaultProviderId={provider.id}
          onSaved={(_, newProvider) => {
            setApptFormOpen(false); setEditingAppt(null)
            refetchAppts()
            if (newProvider) refetchProviders()
          }}
          onCancel={() => { setApptFormOpen(false); setEditingAppt(null) }} />
      </BottomSheet>
    </div>
  )
}
