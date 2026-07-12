import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'
import { ProviderForm } from './ProviderForm'
import {
  APPOINTMENT_TYPES, APPOINTMENT_STATUSES, defaultStatus,
} from '../../lib/appointmentConstants'
import type { Appointment, AppointmentStatus, AppointmentType, Provider } from '../../types'

interface Props {
  profileId: string
  providers: Provider[]
  existingAppt?: Appointment | null
  /** Pre-fill the date (from calendar day). */
  defaultDate?: string
  /** Pre-select a provider. */
  defaultProviderId?: string
  onSaved: (appt: Appointment, newProvider?: Provider) => void | Promise<void>
  onCancel: () => void
}

export function AppointmentForm({
  profileId, providers, existingAppt, defaultDate, defaultProviderId,
  onSaved, onCancel,
}: Props) {
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [apptDate,  setApptDate]  = useState(existingAppt?.appt_date  ?? defaultDate ?? today)
  const [apptTime,  setApptTime]  = useState(existingAppt?.appt_time  ?? '')
  const [type,      setType]      = useState<AppointmentType>(existingAppt?.type as AppointmentType ?? 'Regular session')
  const [status,    setStatus]    = useState<AppointmentStatus>(existingAppt?.status as AppointmentStatus ?? defaultStatus(defaultDate ?? today))
  const [providerId, setProviderId] = useState<string>(existingAppt?.provider_id ?? defaultProviderId ?? '')
  const [notes,     setNotes]     = useState(existingAppt?.notes ?? '')
  const [followup,  setFollowup]  = useState(existingAppt?.followup_needed ?? false)
  const [followupText, setFollowupText] = useState(existingAppt?.followup_text ?? '')
  const [followupDate, setFollowupDate] = useState(existingAppt?.followup_date ?? '')

  const [search,    setSearch]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  // Quick-add provider inline state
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showProviderPicker, setShowProviderPicker] = useState(false)

  // Track providers list locally so quick-add updates it immediately
  const [localProviders, setLocalProviders] = useState<Provider[]>(providers)

  // Sync if parent updates providers (e.g. after a save)
  useMemo(() => setLocalProviders(providers), [providers])

  const selectedProvider = localProviders.find(p => p.id === providerId) ?? null

  const filteredProviders = useMemo(() =>
    localProviders.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase())
    ), [localProviders, search])

  // When date changes, auto-update status only if not manually edited
  function handleDateChange(d: string) {
    setApptDate(d)
    if (!existingAppt) setStatus(defaultStatus(d))
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        profile_id:      profileId,
        author_id:       user.id,
        provider_id:     providerId || null,
        appt_date:       apptDate,
        appt_time:       apptTime || null,
        type,
        status,
        notes:           notes.trim() || null,
        followup_needed: followup,
        followup_text:   followup ? followupText.trim() || null : null,
        followup_date:   followup ? followupDate || null : null,
      }
      if (existingAppt) {
        const { data, error } = await supabase.from('appointments').update(payload).eq('id', existingAppt.id).select().single()
        if (error) throw error
        toast.success('Appointment updated')
        await onSaved(data as Appointment)
      } else {
        const { data, error } = await supabase.from('appointments').insert({ ...payload, id: crypto.randomUUID() }).select().single()
        if (error) throw error
        toast.success('Appointment saved')
        await onSaved(data as Appointment)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save'))
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!existingAppt) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', existingAppt.id)
      if (error) throw error
      toast.success('Appointment deleted')
      onSaved(existingAppt)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally { setDeleting(false) }
  }

  return (
    <div className="px-4 pt-2 pb-6 space-y-5">

      {/* Date & time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date</label>
          <input type="date" value={apptDate} onChange={e => handleDateChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition bg-white" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Time <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
          <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition bg-white" />
        </div>
      </div>

      {/* Provider selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Provider <span className="text-gray-400 font-normal normal-case">(optional)</span></label>

        {showQuickAdd ? (
          <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/30">
            <div className="px-3 pt-3 pb-1">
              <p className="text-xs font-semibold text-rose-700 mb-2">Add new provider</p>
            </div>
            <ProviderForm
              profileId={profileId}
              compact
              onSaved={(p) => {
                setLocalProviders(prev => [...prev, p].sort((a,b) => a.name.localeCompare(b.name)))
                setProviderId(p.id)
                setShowQuickAdd(false)
              }}
              onCancel={() => setShowQuickAdd(false)}
            />
          </div>
        ) : (
          <>
            {/* Selected provider display / picker toggle */}
            <button
              type="button"
              onClick={() => setShowProviderPicker(v => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-left hover:border-gray-300 transition"
            >
              <span className={selectedProvider ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                {selectedProvider ? selectedProvider.name : 'No provider selected'}
              </span>
              <div className="flex items-center gap-2">
                {selectedProvider && (
                  <span
                    onClick={e => { e.stopPropagation(); setProviderId('') }}
                    className="text-xs text-gray-400 hover:text-red-500 transition px-1"
                  >✕</span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProviderPicker ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showProviderPicker && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-md bg-white">
                {localProviders.length > 4 && (
                  <div className="relative border-b border-gray-100">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search providers…"
                      className="w-full pl-8 pr-3 py-2 text-sm focus:outline-none" />
                  </div>
                )}
                <div className="max-h-44 overflow-y-auto">
                  <button type="button" onClick={() => { setProviderId(''); setShowProviderPicker(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-50">
                    None
                  </button>
                  {filteredProviders.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setProviderId(p.id); setShowProviderPicker(false); setSearch('') }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        providerId === p.id ? 'bg-rose-50 font-semibold text-rose-800' : 'hover:bg-gray-50 text-gray-700'
                      }`}>
                      {p.name}
                      <span className="ml-2 text-xs text-gray-400 font-normal">{p.role}</span>
                    </button>
                  ))}
                  {filteredProviders.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-3">No results</p>
                  )}
                </div>
                {/* Quick-add trigger inside dropdown */}
                <div className="border-t border-gray-100">
                  <button type="button" onClick={() => { setShowProviderPicker(false); setShowQuickAdd(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add new provider…
                  </button>
                </div>
              </div>
            )}

            {/* Quick-add link when list is empty */}
            {localProviders.length === 0 && (
              <button type="button" onClick={() => setShowQuickAdd(true)}
                className="mt-2 flex items-center gap-1 text-xs text-rose-500 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add a provider first
              </button>
            )}
          </>
        )}
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type</label>
        <div className="flex flex-wrap gap-1.5">
          {APPOINTMENT_TYPES.map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                type === t
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
        <div className="flex flex-wrap gap-1.5">
          {APPOINTMENT_STATUSES.map(s => (
            <button key={s.value} type="button" onClick={() => setStatus(s.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                status === s.value
                  ? s.color + ' ring-2 ring-offset-1 ring-rose-400'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Summary / notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="What was discussed, recommended, or observed…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition resize-none" />
      </div>

      {/* Follow-up toggle */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setFollowup(v => !v)}
          className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            followup
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            followup ? 'bg-amber-400 border-amber-400' : 'border-gray-300'
          }`}>
            {followup && <span className="w-2 h-2 rounded-full bg-white" />}
          </span>
          Follow-up needed
        </button>

        {followup && (
          <div className="space-y-2 pl-1">
            <textarea rows={2} value={followupText} onChange={e => setFollowupText(e.target.value)}
              placeholder="What needs to be followed up on?"
              className="w-full px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target date <span className="text-gray-400">(optional)</span></label>
              <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition" />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {existingAppt && (
          <button type="button" onClick={handleDelete} disabled={deleting || saving}
            className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition disabled:opacity-50">
            {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Spinner className="w-4 h-4" /> : existingAppt ? 'Save changes' : 'Save appointment'}
        </button>
      </div>
    </div>
  )
}
