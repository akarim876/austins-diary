import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Activity, CalendarClock, Check, ChevronDown, ChevronRight, ChevronUp, Clock, Crown, Eye, EyeOff,
  LogOut, Mail, Palette, Pencil, Plus, Settings, Shield, Trash2, User, Users, Utensils, X, Wand2,
  AlertTriangle,
} from 'lucide-react'
import { DeleteAccountModal } from '../components/settings/DeleteAccountModal'
import { DeleteProfileModal } from '../components/settings/DeleteProfileModal'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { useUserProfile } from '../hooks/useUserProfile'
import { useQuickTiles } from '../hooks/useQuickTiles'
import type { QuickTileId } from '../hooks/useQuickTiles'
import { useCustomTrackers } from '../hooks/useCustomTrackers'
import { useTheme, THEMES } from '../hooks/useTheme'
import { TILE_DEFS, DEFAULT_TILES, getTileDef } from '../lib/tileConstants'
import type { TileId } from '../lib/tileConstants'
import { getTrackerIcon, trackerIconBg } from '../lib/trackerIcons'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { Spinner } from '../components/ui/Spinner'
import type { ProfileAccess, ProfileInvite } from '../types'
import { useMyRole } from '../hooks/useMyRole'
import { useSetupWizard } from '../hooks/useSetupWizard'
import { SetupWizard } from '../components/onboarding/SetupWizard'

// ─── Role badge ────────────────────────────────────────────────────────────────

const ROLE_META = {
  owner:  { label: 'Owner',  Icon: Crown,  color: 'bg-brand-100 text-brand-700' },
  editor: { label: 'Editor', Icon: Pencil, color: 'bg-blue-100 text-blue-700'  },
  viewer: { label: 'Viewer', Icon: Eye,    color: 'bg-gray-100 text-gray-600'  },
}
function RoleBadge({ role }: { role: 'owner' | 'editor' | 'viewer' }) {
  const { label, Icon, color } = ROLE_META[role]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}

// ─── Caregiver hook ─────────────────────────────────────────────────────────────

function useCaregivers(profileId: string | null) {
  const [access, setAccess]   = useState<ProfileAccess[]>([])
  const [invites, setInvites] = useState<ProfileInvite[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!profileId) return
    setLoading(true)
    const [{ data: a }, { data: i }] = await Promise.all([
      supabase.from('profile_access').select('*').eq('profile_id', profileId).order('invited_at'),
      supabase.from('profile_invites').select('*').eq('profile_id', profileId).order('invited_at'),
    ])
    setAccess((a ?? []) as ProfileAccess[])
    setInvites((i ?? []) as ProfileInvite[])
    setLoading(false)
  }

  useEffect(() => { load() }, [profileId]) // eslint-disable-line react-hooks/exhaustive-deps
  return { access, invites, loading, reload: load }
}

// ─── Account section ────────────────────────────────────────────────────────────

function AccountSection() {
  const { user, userProfile, reloadUserProfile } = useAuth()
  const { userProfile: liveProfile, save } = useUserProfile(user?.id ?? null)
  const profile = liveProfile ?? userProfile

  const [editing, setEditing]     = useState(false)
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName,  setLastName]  = useState(profile?.last_name  ?? '')
  const [username,  setUsername]  = useState(profile?.username   ?? '')
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  // Sync when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name)
      setLastName(profile.last_name)
      setUsername(profile.username)
    }
  }, [profile])

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'Required'
    if (!lastName.trim())  e.lastName  = 'Required'
    if (!username.trim())  e.username  = 'Required'
    else if (!/^[a-z0-9_.-]{2,30}$/.test(username.trim().toLowerCase())) {
      e.username = 'Letters, numbers, _ . - only (2–30 chars)'
    }
    return e
  }

  async function handleSave() {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return }
    setErrors({})
    setSaving(true)
    const { error } = await save({
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      username:   username.trim().toLowerCase(),
    })
    setSaving(false)
    if (error) {
      if (error.includes('unique') || error.includes('duplicate')) {
        setErrors({ username: 'Username already taken' })
      } else {
        toast.error('Failed to save — please try again')
      }
      return
    }
    await reloadUserProfile()
    toast.success('Account updated')
    setEditing(false)
  }

  const initials = profile
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
        <User className="w-3.5 h-3.5" /> Account
      </h2>
      <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
        {/* Avatar + name row */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-brand-200 flex items-center justify-center text-brand-800 font-bold text-lg flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {profile ? (
              <>
                <p className="font-semibold text-gray-900">{profile.first_name} {profile.last_name}</p>
                <p className="text-xs text-gray-400">@{profile.username} · {user?.email}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">{user?.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            className="text-xs text-brand-600 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
                    errors.firstName ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.firstName && <p className="mt-0.5 text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
                    errors.lastName ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.lastName && <p className="mt-0.5 text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
                    errors.username ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
              </div>
              {errors.username && <p className="mt-0.5 text-xs text-red-500">{errors.username}</p>}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Spinner className="w-4 h-4" /> : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Child profiles section ─────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  birth_date: z.string().optional(),
})
type ProfileFormValues = z.infer<typeof profileSchema>

function ChildProfilesSection() {
  const { user } = useAuth()
  const { profiles, activeProfile, setActiveProfile, refresh } = useProfile()
  const [showNewForm, setShowNewForm] = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  })

  async function onCreateProfile(values: ProfileFormValues) {
    if (!user) return
    setSubmitting(true)
    try {
      const profileId = crypto.randomUUID()
      const { error: pErr } = await supabase.from('child_profiles').insert({
        id: profileId, name: values.name,
        birth_date: values.birth_date || null, created_by: user.id,
      })
      if (pErr) throw pErr
      const { error: aErr } = await supabase.from('profile_access').insert({
        profile_id: profileId, user_id: user.id, email: user.email ?? null, role: 'owner',
      })
      if (aErr) throw aErr
      toast.success(`Profile created for ${values.name}!`)
      reset(); setShowNewForm(false); refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create profile'))
    } finally { setSubmitting(false) }
  }

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
        Child profiles
      </h2>
      <div className="space-y-2">
        {profiles.map(profile => (
          <button
            key={profile.id}
            onClick={() => setActiveProfile(profile)}
            className={`w-full flex items-center gap-3 rounded-xl p-4 border transition-all text-left ${
              activeProfile?.id === profile.id
                ? 'bg-brand-50 border-brand-200 shadow-sm'
                : 'bg-white border-warm-200 hover:border-brand-200 shadow-sm'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              activeProfile?.id === profile.id ? 'bg-brand-200' : 'bg-gray-100'
            }`}>
              <span className={`text-lg font-bold ${activeProfile?.id === profile.id ? 'text-brand-700' : 'text-gray-600'}`}>
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
              {profile.birth_date && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Born {format(parseISO(profile.birth_date), 'MMMM d, yyyy')}
                </p>
              )}
            </div>
            {activeProfile?.id === profile.id
              ? <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
          </button>
        ))}

        {!showNewForm ? (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-200 text-brand-600 font-medium text-sm hover:border-brand-400 hover:bg-brand-50 transition-all"
          >
            <Plus className="w-4 h-4" /> Add profile
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">New profile</h3>
            <form onSubmit={handleSubmit(onCreateProfile)} className="space-y-3">
              <div>
                <input autoFocus type="text" placeholder="Child's name"
                  {...register('name')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <input type="date" {...register('birth_date')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowNewForm(false); reset() }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <Spinner className="w-4 h-4" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Role selector (used inside CaregiversSection) ──────────────────────────────

const ROLE_OPTIONS: Array<{ value: 'owner' | 'editor' | 'viewer'; label: string; desc: string }> = [
  { value: 'owner',  label: 'Owner',  desc: 'Full access — can edit all entries and manage caregivers' },
  { value: 'editor', label: 'Editor', desc: 'Can create entries; edits only their own entries from today' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only — cannot create or edit any entries' },
]

function RoleSelector({
  currentRole, accessId, onChanged,
}: { currentRole: 'owner' | 'editor' | 'viewer'; accessId: string; onChanged: () => void }) {
  const [selected, setSelected] = useState(currentRole)
  const [saving, setSaving]     = useState(false)
  const changed = selected !== currentRole

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('profile_access')
      .update({ role: selected })
      .eq('id', accessId)
    setSaving(false)
    if (error) {
      toast.error('Failed to update role')
    } else {
      toast.success('Role updated')
      onChanged()
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-2">Change role</p>
      <div className="space-y-1.5">
        {ROLE_OPTIONS.map(opt => (
          <label key={opt.value}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
              selected === opt.value
                ? 'border-brand-300 bg-brand-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <input
              type="radio"
              name={`role-${accessId}`}
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="mt-0.5 accent-brand-500"
            />
            <div>
              <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>
      {changed && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-2 w-full py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Spinner className="w-3.5 h-3.5" /> : 'Save role change'}
        </button>
      )}
    </div>
  )
}

// ─── Caregivers section ─────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['editor', 'viewer']),
})
type InviteFormValues = z.infer<typeof inviteSchema>

function CaregiversSection() {
  const { user } = useAuth()
  const { activeProfile } = useProfile()
  const { access, invites, loading, reload } = useCaregivers(activeProfile?.id ?? null)
  const [showInvite, setShowInvite]     = useState(false)
  const [inviting, setInviting]         = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'editor' },
  })

  const isOwner = access.some(a => a.user_id === user?.id && a.role === 'owner')

  async function onInvite(values: InviteFormValues) {
    if (!activeProfile || !user) return
    setInviting(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { profile_id: activeProfile.id, email: values.email.toLowerCase().trim(), role: values.role },
      })
      if (error) {
        const { error: dbErr } = await supabase.from('profile_invites').upsert({
          profile_id: activeProfile.id, invited_by: user.id,
          email: values.email.toLowerCase().trim(), role: values.role,
        }, { onConflict: 'profile_id,email' })
        if (dbErr) throw dbErr
        toast.success('Invite saved — no email sent (deploy the Edge Function to enable emails)')
      } else if (data?.ok) {
        toast.success(`Invite email sent to ${values.email}`)
      } else if (data?.saved) {
        toast.success(`Invite saved — email delivery failed: ${data.error}`)
      }
      inviteForm.reset({ role: 'editor' })
      setShowInvite(false)
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send invite'))
    } finally { setInviting(false) }
  }

  async function revokeAccess(row: ProfileAccess) {
    if (row.user_id === user?.id) return
    try {
      const { error } = await supabase.from('profile_access').delete().eq('id', row.id)
      if (error) throw error
      toast.success('Access revoked'); reload()
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to revoke')) }
  }

  async function cancelInvite(invite: ProfileInvite) {
    try {
      const { error } = await supabase.from('profile_invites').delete().eq('id', invite.id)
      if (error) throw error
      toast.success('Invite cancelled'); reload()
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to cancel')) }
  }

  if (!activeProfile) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        <Users className="w-3.5 h-3.5 text-gray-400" />
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-1">
          {activeProfile.name}'s caregivers
        </h2>
        <Shield className="w-3 h-3 text-brand-400" />
        <span className="text-xs text-gray-400">RLS protected</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner className="w-6 h-6" /></div>
      ) : (
        <div className="space-y-2">
          {access.map(row => {
            const isSelf    = row.user_id === user?.id
            const canRevoke = isOwner && !isSelf
            // Owners can change anyone's role except: can't demote the last owner
            const ownerCount  = access.filter(a => a.role === 'owner').length
            const canChangeRole = isOwner && !isSelf && !(row.role === 'owner' && ownerCount <= 1)
            const displayEmail = row.email ?? (isSelf ? user?.email : null) ?? 'Unknown'
            return (
              <div key={row.id} className="bg-white rounded-xl border border-warm-200 shadow-sm px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-brand-700">{displayEmail.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{displayEmail}</p>
                      {isSelf && <span className="text-xs text-gray-400 italic">you</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={row.role} />
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canChangeRole && (
                      <button
                        onClick={() => setEditingRoleId(id => id === row.id ? null : row.id)}
                        className="text-xs text-brand-600 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition"
                      >
                        {editingRoleId === row.id ? 'Cancel' : 'Edit role'}
                      </button>
                    )}
                    {canRevoke && (
                      <button onClick={() => revokeAccess(row)}
                        title="Remove access"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Role selector — collapsible, owners only */}
                {canChangeRole && editingRoleId === row.id && (
                  <RoleSelector
                    currentRole={row.role}
                    accessId={row.id}
                    onChanged={() => { reload(); setEditingRoleId(null) }}
                  />
                )}
              </div>
            )
          })}

          {invites.map(invite => (
            <div key={invite.id} className="flex items-center gap-3 bg-amber-50 rounded-xl border border-amber-200 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{invite.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={invite.role} />
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                  <span className="text-xs text-gray-400">· sent {format(parseISO(invite.invited_at), 'MMM d')}</span>
                </div>
              </div>
              {isOwner && (
                <button onClick={() => cancelInvite(invite)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {access.length === 0 && invites.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No caregivers yet</p>
          )}
        </div>
      )}

      {isOwner && (
        <div className="mt-3">
          {!showInvite ? (
            <button onClick={() => setShowInvite(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}>
              <Mail className="w-4 h-4" /> Invite a caregiver
            </button>
          ) : (
            <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Send invite</h3>
              <form onSubmit={inviteForm.handleSubmit(onInvite)} className="space-y-3">
                <div>
                  <input autoFocus type="email" placeholder="caregiver@example.com"
                    {...inviteForm.register('email')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                  {inviteForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-500">{inviteForm.formState.errors.email.message}</p>
                  )}
                </div>
                <select {...inviteForm.register('role')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white">
                  <option value="editor">Editor — can write entries</option>
                  <option value="viewer">Viewer — read only</option>
                </select>
                <p className="text-xs text-gray-400">
                  They'll receive an email with a sign-in link. Once they log in,
                  they'll automatically have access to {activeProfile.name}'s diary.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowInvite(false); inviteForm.reset({ role: 'editor' }) }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={inviting}
                    className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                    {inviting ? <Spinner className="w-4 h-4" /> : 'Send invite'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Quick-tiles section ────────────────────────────────────────────────────────

function QuickTilesSection() {
  const { user } = useAuth()
  const { activeProfile } = useProfile()
  const { tiles, setTiles, addTile, removeTile, moveTile, canAdd, canRemove } = useQuickTiles(user?.id ?? null)
  const { trackers: customTrackers } = useCustomTrackers(activeProfile?.id ?? null)
  const [showAdd, setShowAdd] = useState(false)

  const selectedSet = new Set<string>(tiles)
  const availableStatic   = TILE_DEFS.filter(t => !selectedSet.has(t.id))
  const availableTrackers = customTrackers.filter(t => !selectedSet.has(`tracker:${t.id}`))

  /** Get display info for any tile ID (static or custom tracker). */
  function tileDisplay(id: string): { label: string; iconEl: React.ReactNode; bg: string } | null {
    if (id.startsWith('tracker:')) {
      const tracker = customTrackers.find(t => t.id === id.slice(8))
      if (!tracker) return null
      const TrIcon = getTrackerIcon(tracker.icon_name)
      return {
        label:  tracker.name,
        bg:     trackerIconBg(tracker.color),
        iconEl: <TrIcon className="w-4 h-4" style={{ color: tracker.color }} />,
      }
    }
    const def = getTileDef(id as TileId)
    if (!def) return null
    return {
      label:  def.label,
      bg:     def.iconBg,
      iconEl: <ModuleIcon name={def.icon} className="w-4 h-4" style={{ color: def.accent }} />,
    }
  }

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
        Dashboard quick-add tiles
      </h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-warm-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            Choose 2–6 entry types to show as quick-add tiles on the dashboard. Your selection is personal — it won't affect other caregivers.
          </p>
        </div>

        {/* Selected tiles list */}
        <ul className="divide-y divide-warm-100">
          {tiles.map((id, idx) => {
            const display = tileDisplay(id)
            if (!display) return null
            return (
              <li key={id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: display.bg }}
                >
                  {display.iconEl}
                </span>

                <span className="flex-1 text-sm font-medium text-gray-900">{display.label}</span>

                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveTile(id, 'up')}
                    disabled={idx === 0}
                    className="p-0.5 rounded text-gray-300 hover:text-gray-500 disabled:opacity-25 transition"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTile(id, 'down')}
                    disabled={idx === tiles.length - 1}
                    className="p-0.5 rounded text-gray-300 hover:text-gray-500 disabled:opacity-25 transition"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeTile(id)}
                  disabled={!canRemove}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-25 transition"
                  aria-label={`Remove ${display.label}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            )
          })}
        </ul>

        {/* Add tile */}
        {canAdd && (
          <div className="border-t border-warm-100">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-brand-50 transition"
                style={{ color: 'var(--color-accent)' }}
              >
                <Plus className="w-4 h-4" />
                Add tile ({tiles.length}/6 selected)
              </button>
            ) : (
              <div className="p-3 space-y-1">
                {availableStatic.length === 0 && availableTrackers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">All types already added</p>
                ) : (
                  <>
                    {availableStatic.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 pt-1">Built-in</p>
                        {availableStatic.map(def => (
                          <button
                            key={def.id}
                            type="button"
                            onClick={() => { addTile(def.id as QuickTileId); setShowAdd(false) }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-warm-50 text-left transition"
                          >
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: def.iconBg }}>
                              <ModuleIcon name={def.icon} className="w-3.5 h-3.5" style={{ color: def.accent }} />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{def.label}</p>
                              <p className="text-xs text-gray-400">{def.description}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {availableTrackers.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 pt-2">Custom trackers</p>
                        {availableTrackers.map(tracker => {
                          const TrIcon = getTrackerIcon(tracker.icon_name)
                          return (
                            <button
                              key={tracker.id}
                              type="button"
                              onClick={() => { addTile(`tracker:${tracker.id}` as QuickTileId); setShowAdd(false) }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-warm-50 text-left transition"
                            >
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: trackerIconBg(tracker.color) }}>
                                <TrIcon className="w-3.5 h-3.5" style={{ color: tracker.color }} />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{tracker.name}</p>
                                <p className="text-xs text-gray-400">{tracker.tracker_type.replace('_', ' ')}</p>
                              </div>
                            </button>
                          )
                        })}
                      </>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {tiles.length >= 6 && (
          <div className="px-4 py-2 border-t border-warm-100">
            <p className="text-xs text-gray-400">Maximum of 6 tiles reached.</p>
          </div>
        )}
      </div>

      {/* Reset to defaults */}
      {JSON.stringify(tiles) !== JSON.stringify(DEFAULT_TILES) && (
        <button
          type="button"
          onClick={() => { setTiles([...DEFAULT_TILES]); toast.success('Tiles reset to defaults') }}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition w-full text-center"
        >
          Reset to defaults
        </button>
      )}
    </section>
  )
}

// ─── Change password section ────────────────────────────────────────────────────

function ChangePasswordSection() {
  const { updatePassword } = useAuth()
  const [open, setOpen]               = useState(false)
  const [showPw, setShowPw]           = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')

  async function handleSave() {
    setErr('')
    if (newPassword.length < 8) { setErr('Password must be at least 8 characters'); return }
    if (newPassword !== confirm) { setErr('Passwords do not match'); return }
    setSaving(true)
    try {
      await updatePassword(newPassword)
      toast.success('Password updated')
      setOpen(false)
      setNewPassword('')
      setConfirm('')
    } catch (e) {
      setErr(getErrorMessage(e, 'Could not update password'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Password</p>
            <p className="text-xs text-gray-400">Change your sign-in password</p>
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="text-xs text-brand-600 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition"
          >
            {open ? 'Cancel' : 'Change'}
          </button>
        </div>

        {open && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
            <div className="pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">New password</label>
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
              />
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <button
              onClick={handleSave}
              disabled={saving || !newPassword || !confirm}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
              style={{ background: 'var(--color-accent)' }}
            >
              {saving ? <Spinner className="w-4 h-4" /> : 'Update password'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Theme section ─────────────────────────────────────────────────────────────

function ThemeSection() {
  const { theme, setTheme } = useTheme()

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
        Appearance
      </h2>
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-warm-100">
          <Palette className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-800">Color theme</p>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2.5">
          {THEMES.map(t => {
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-150 text-left"
                style={{
                  background: t.bg,
                  borderColor: active ? t.accent : 'transparent',
                  boxShadow: active ? `0 0 0 1px ${t.accent}22` : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {/* Color swatch stack */}
                <div className="relative w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden">
                  <div className="absolute inset-0" style={{ background: t.bg }} />
                  <div
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg"
                    style={{ background: t.accent }}
                  />
                  <div
                    className="absolute bottom-0 right-5 w-3 h-3 rounded-tr-sm"
                    style={{ background: t.secondary }}
                  />
                </div>

                <span
                  className="text-[13px] font-semibold leading-tight"
                  style={{ color: t.text }}
                >
                  {t.label}
                </span>

                {active && (
                  <span
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: t.accent }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="px-4 pb-3 text-[11px] text-gray-400">
          This is personal to your account — other caregivers keep their own theme.
        </p>
      </div>
    </section>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { signOut, user } = useAuth()
  const { activeProfile, refresh: refreshProfiles } = useProfile()
  const navigate = useNavigate()
  const myRole = useMyRole(activeProfile?.id ?? null)
  const isOwner = myRole === 'owner'
  const { isResumable, savedStep, markDone, dismiss } = useSetupWizard(activeProfile?.id ?? null)
  const [showWizard, setShowWizard]                   = useState(false)
  const [showDeleteModal, setShowDeleteModal]         = useState(false)
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false)

  async function handleSignOut() {
    try { await signOut() } catch { toast.error('Failed to sign out') }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Setup wizard (rendered as portal when opened from Settings) */}
      {showWizard && activeProfile && user && (
        <SetupWizard
          profileId={activeProfile.id}
          profileName={activeProfile.name}
          userId={user.id}
          initialStep={savedStep > 0 ? savedStep : 1}
          onClose={(step) => { dismiss(step); setShowWizard(false) }}
          onComplete={() => { markDone(); setShowWizard(false) }}
        />
      )}

      {/* Page header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-warm-200 px-4 py-3 flex items-center gap-2">
        <Settings className="w-4 h-4 text-gray-400" />
        <h1 className="font-bold text-gray-900">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
        {/* Complete setup banner — only for owners who abandoned the wizard */}
        {isOwner && isResumable && activeProfile && (
          <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Wand2 className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Complete {activeProfile.name}'s setup
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                You started setting up the diary but didn't finish. Resume where you left off to
                add foods, medications, smoothie recipes, and more.
              </p>
              <button
                onClick={() => setShowWizard(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-opacity"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Resume setup
              </button>
            </div>
          </div>
        )}

        <AccountSection />
        <ChangePasswordSection />
        <ThemeSection />
        <QuickTilesSection />
        <ChildProfilesSection />
        <CaregiversSection />

        {/* Diet settings link */}
        {activeProfile && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
              Diet &amp; Nutrition
            </h2>
            <button
              onClick={() => navigate('/diet-settings')}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-white border border-warm-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Utensils className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Diet &amp; Nutrition Settings</p>
                <p className="text-xs text-gray-400 mt-0.5">Foods, smoothie recipes, supplements, medications</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          </section>
        )}

        {/* Schedule settings link */}
        {activeProfile && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
              Daily Schedule
            </h2>
            <button
              onClick={() => navigate('/schedule-settings')}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-white border border-warm-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="w-4 h-4 text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Schedule Template</p>
                <p className="text-xs text-gray-400 mt-0.5">Build the typical daily routine checklist</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          </section>
        )}

        {/* Custom trackers link */}
        {activeProfile && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
              Custom Trackers
            </h2>
            <button
              onClick={() => navigate('/tracker-settings')}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-white border border-warm-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Custom Trackers</p>
                <p className="text-xs text-gray-400 mt-0.5">Create duration, counter, yes/no, and rating trackers</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          </section>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-500 text-sm font-medium hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>

        {/* Delete profile — owner only */}
        {isOwner && activeProfile && (
          <section className="pb-2">
            <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Delete this diary</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Permanently deletes {activeProfile.name}'s entire diary — all logs, goals,
                    appointments, and caregiver access. This cannot be undone.
                  </p>
                  <button
                    onClick={() => setShowDeleteProfileModal(true)}
                    className="mt-2.5 text-xs font-semibold text-red-600 hover:text-red-700 transition"
                  >
                    Delete {activeProfile.name}'s diary →
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Delete account */}
        <section className="pb-2">
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Delete account</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Permanently removes your credentials and profile. Log entries you created will
                  remain visible to other caregivers.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="mt-2.5 text-xs font-semibold text-red-600 hover:text-red-700 transition"
                >
                  Delete my account →
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}

      {showDeleteProfileModal && activeProfile && (
        <DeleteProfileModal
          profileId={activeProfile.id}
          profileName={activeProfile.name}
          onClose={() => setShowDeleteProfileModal(false)}
          onDeleted={() => {
            setShowDeleteProfileModal(false)
            refreshProfiles()
            navigate('/')
          }}
        />
      )}
    </div>
  )
}
