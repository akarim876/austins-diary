import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'
import { PROVIDER_ROLES } from '../../lib/appointmentConstants'
import type { Provider, ProviderRole } from '../../types'

interface Props {
  profileId: string
  existingProvider?: Provider | null
  /** If true, show only the essential fields (name + role) for quick inline creation. */
  compact?: boolean
  onSaved: (provider: Provider) => void
  onCancel: () => void
}

export function ProviderForm({ profileId, existingProvider, compact, onSaved, onCancel }: Props) {
  const { user } = useAuth()

  const [name,         setName]         = useState(existingProvider?.name         ?? '')
  const [role,         setRole]         = useState<ProviderRole>(existingProvider?.role as ProviderRole ?? 'Pediatrician')
  const [roleOther,    setRoleOther]    = useState(existingProvider?.role_other    ?? '')
  const [organization, setOrganization] = useState(existingProvider?.organization ?? '')
  const [phone,        setPhone]        = useState(existingProvider?.phone        ?? '')
  const [email,        setEmail]        = useState(existingProvider?.email        ?? '')
  const [address,      setAddress]      = useState(existingProvider?.address      ?? '')
  const [notes,        setNotes]        = useState(existingProvider?.notes        ?? '')
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [nameError,    setNameError]    = useState('')

  async function handleSave() {
    if (!name.trim()) { setNameError('Name is required'); return }
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        profile_id:   profileId,
        author_id:    user.id,
        name:         name.trim(),
        role,
        role_other:   role === 'Other' ? roleOther.trim() || null : null,
        organization: organization.trim() || null,
        phone:        phone.trim() || null,
        email:        email.trim() || null,
        address:      address.trim() || null,
        notes:        notes.trim() || null,
      }
      if (existingProvider) {
        const { data, error } = await supabase.from('providers').update(payload).eq('id', existingProvider.id).select().single()
        if (error) throw error
        toast.success('Provider updated')
        onSaved(data as Provider)
      } else {
        const id = crypto.randomUUID()
        const { data, error } = await supabase.from('providers').insert({ ...payload, id }).select().single()
        if (error) throw error
        toast.success('Provider added')
        onSaved(data as Provider)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save provider'))
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!existingProvider) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('providers').delete().eq('id', existingProvider.id)
      if (error) throw error
      toast.success('Provider removed')
      onSaved(existingProvider)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally { setDeleting(false) }
  }

  return (
    <div className="px-4 pt-2 pb-6 space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Provider name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setNameError('') }}
          placeholder="e.g. Dr. Sarah Kim"
          autoFocus={!compact}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition ${
            nameError ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
        />
        {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
      </div>

      {/* Role */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Role / specialty
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDER_ROLES.map(r => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                role === r
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {r}
            </button>
          ))}
        </div>
        {role === 'Other' && (
          <input
            type="text"
            value={roleOther}
            onChange={e => setRoleOther(e.target.value)}
            placeholder="Describe role…"
            className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
          />
        )}
      </div>

      {!compact && (
        <>
          {/* Organization */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Practice / organization <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <input type="text" value={organization} onChange={e => setOrganization(e.target.value)}
              placeholder="e.g. Children's Health Associates"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition" />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="dr@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Address <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, Suite 4"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Sees him every other Tuesday; prefers email over calls"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition resize-none" />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {existingProvider && !compact && (
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
          {saving ? <Spinner className="w-4 h-4" /> : existingProvider ? 'Save changes' : compact ? 'Add provider' : 'Save provider'}
        </button>
      </div>
    </div>
  )
}
