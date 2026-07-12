import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Plus } from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useProfile } from '../contexts/ProfileContext'
import { useProviders } from '../hooks/useProviders'
import { useAppointments } from '../hooks/useAppointments'
import { useProfileMembers } from '../hooks/useProfileMembers'
import { useMyRole, canCreate } from '../hooks/useMyRole'
import { ProviderCard } from '../components/appointments/ProviderCard'
import { ProviderForm } from '../components/appointments/ProviderForm'
import { AppointmentCard } from '../components/appointments/AppointmentCard'
import { AppointmentForm } from '../components/appointments/AppointmentForm'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import { PROVIDER_ROLES } from '../lib/appointmentConstants'
import type { Appointment, Provider, ProviderRole } from '../types'

type MainTab = 'providers' | 'appointments'
type ApptFilter = 'all' | 'upcoming' | 'past'

export function ProvidersPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const myRole = useMyRole(activeProfile?.id ?? null)
  const memberMap = useProfileMembers(activeProfile?.id ?? null)

  const { providers, loading: pLoading, refetch: refetchProviders } = useProviders(activeProfile?.id ?? null)
  const { appointments, loading: aLoading, refetch: refetchAppts } = useAppointments(activeProfile?.id ?? null)

  const [mainTab,        setMainTab]        = useState<MainTab>('providers')
  const [roleFilter,     setRoleFilter]     = useState<ProviderRole | 'all'>('all')
  const [apptFilter,     setApptFilter]     = useState<ApptFilter>('upcoming')
  const [providerFilter, setProviderFilter] = useState<string>('all')

  const [providerFormOpen, setProviderFormOpen] = useState(false)
  const [editingProvider,  setEditingProvider]  = useState<Provider | null>(null)
  const [apptFormOpen,     setApptFormOpen]     = useState(false)
  const [editingAppt,      setEditingAppt]      = useState<Appointment | null>(null)

  const providerById = useMemo(() => new Map(providers.map(p => [p.id, p])), [providers])

  const apptCountByProvider = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of appointments) {
      if (a.provider_id) m.set(a.provider_id, (m.get(a.provider_id) ?? 0) + 1)
    }
    return m
  }, [appointments])

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const filteredProviders = useMemo(() =>
    providers.filter(p => roleFilter === 'all' || p.role === roleFilter),
    [providers, roleFilter]
  )

  const filteredAppts = useMemo(() => {
    return appointments.filter(a => {
      if (providerFilter !== 'all' && a.provider_id !== providerFilter) return false
      const d = new Date(a.appt_date + 'T00:00:00')
      if (apptFilter === 'upcoming') return d >= today
      if (apptFilter === 'past')     return d <  today
      return true
    })
  }, [appointments, providerFilter, apptFilter, today])

  if (!activeProfile) return null
  const loading = pLoading || aLoading

  return (
    <div className="min-h-screen bg-warm-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-warm-50/95 backdrop-blur border-b border-warm-200">
        <div className="px-4 pt-5 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center">
                <ModuleIcon name="appointments" className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Providers</h1>
            </div>
            {canCreate(myRole) && (
              <button
                onClick={() => {
                  if (mainTab === 'providers') { setEditingProvider(null); setProviderFormOpen(true) }
                  else { setEditingAppt(null); setApptFormOpen(true) }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {mainTab === 'providers' ? 'New provider' : 'New appointment'}
              </button>
            )}
          </div>

          {/* Main tabs */}
          <div className="flex border-b border-warm-200">
            {(['providers', 'appointments'] as MainTab[]).map(tab => (
              <button key={tab} onClick={() => setMainTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                  mainTab === tab
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'providers' ? `Providers${providers.length ? ` (${providers.length})` : ''}` : 'Appointments'}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-filters */}
        {mainTab === 'providers' && (
          <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-hide">
            <button onClick={() => setRoleFilter('all')}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                roleFilter === 'all' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              All
            </button>
            {PROVIDER_ROLES.map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  roleFilter === r ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {r}
              </button>
            ))}
          </div>
        )}

        {mainTab === 'appointments' && (
          <div className="flex gap-3 px-4 py-2.5">
            {(['upcoming', 'past', 'all'] as ApptFilter[]).map(f => (
              <button key={f} onClick={() => setApptFilter(f)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border capitalize transition-all ${
                  apptFilter === f ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {f}
              </button>
            ))}
            {providers.length > 0 && (
              <select
                value={providerFilter}
                onChange={e => setProviderFilter(e.target.value)}
                className="ml-auto flex-shrink-0 px-2 py-1 rounded-full text-xs border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-rose-400"
              >
                <option value="all">All providers</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-7 h-7 text-rose-400" />
          </div>
        ) : mainTab === 'providers' ? (
          filteredProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
                <ModuleIcon name="appointments" className="w-7 h-7 text-rose-300" />
              </div>
              {providers.length === 0 ? (
                <>
                  <p className="font-semibold text-gray-700">No providers yet</p>
                  {canCreate(myRole) && <p className="text-sm text-gray-400 mt-1">Tap "New provider" to add one</p>}
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-700">No providers match this filter</p>
                  <button onClick={() => setRoleFilter('all')} className="text-sm text-rose-500 mt-1 hover:underline">Clear filter</button>
                </>
              )}
            </div>
          ) : (
            filteredProviders.map(p => (
              <ProviderCard key={p.id} provider={p}
                appointmentCount={apptCountByProvider.get(p.id)}
                onClick={() => navigate(`/providers/${p.id}`)}
              />
            ))
          )
        ) : (
          filteredAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
                <CalendarCheck className="w-7 h-7 text-rose-300" />
              </div>
              <p className="font-semibold text-gray-700">
                {appointments.length === 0 ? 'No appointments yet' : 'No appointments match these filters'}
              </p>
              {appointments.length === 0 && canCreate(myRole) && (
                <p className="text-sm text-gray-400 mt-1">Tap "New appointment" to add one</p>
              )}
            </div>
          ) : (
            filteredAppts.map(a => (
              <AppointmentCard key={a.id} appointment={a}
                provider={a.provider_id ? providerById.get(a.provider_id) : null}
                authorName={memberMap.get(a.author_id)}
                onClick={() => { setEditingAppt(a); setApptFormOpen(true) }}
              />
            ))
          )
        )}
      </div>

      {/* Provider Form Sheet */}
      <BottomSheet open={providerFormOpen} onClose={() => { setProviderFormOpen(false); setEditingProvider(null) }}
        title={editingProvider ? 'Edit provider' : 'New provider'}>
        <ProviderForm profileId={activeProfile.id} existingProvider={editingProvider}
          onSaved={() => { setProviderFormOpen(false); setEditingProvider(null); refetchProviders() }}
          onCancel={() => { setProviderFormOpen(false); setEditingProvider(null) }} />
      </BottomSheet>

      {/* Appointment Form Sheet */}
      <BottomSheet open={apptFormOpen} onClose={() => { setApptFormOpen(false); setEditingAppt(null) }}
        title={editingAppt ? 'Edit appointment' : 'New appointment'}>
        <AppointmentForm profileId={activeProfile.id} providers={providers}
          existingAppt={editingAppt}
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
