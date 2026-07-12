import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import toast from 'react-hot-toast'
import {
  Plus, ChevronRight, Check, Mail,
  Shield, LogOut, Users, Crown, Pencil, Eye,
  Clock, X, Trash2, Utensils,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ProfileAccess, ProfileInvite } from '../types'

// ─── Forms ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  birth_date: z.string().optional(),
})
type ProfileFormValues = z.infer<typeof profileSchema>

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['editor', 'viewer']),
})
type InviteFormValues = z.infer<typeof inviteSchema>

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_META = {
  owner:  { label: 'Owner',  Icon: Crown, color: 'bg-brand-100 text-brand-700' },
  editor: { label: 'Editor', Icon: Pencil, color: 'bg-blue-100 text-blue-700'  },
  viewer: { label: 'Viewer', Icon: Eye,   color: 'bg-gray-100 text-gray-600'   },
}

function RoleBadge({ role }: { role: 'owner' | 'editor' | 'viewer' }) {
  const { label, Icon, color } = ROLE_META[role]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}

// ─── Caregiver list hook ──────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { profiles, activeProfile, setActiveProfile, refresh, loading: profilesLoading } = useProfile()
  const { access, invites, loading: caregiversLoading, reload: reloadCaregivers } = useCaregivers(activeProfile?.id ?? null)

  const [showNewForm, setShowNewForm] = useState(false)
  const [showInvite, setShowInvite]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [inviting, setInviting]       = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  })
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'editor' },
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
        profile_id: profileId, user_id: user.id,
        email: user.email ?? null, role: 'owner',
      })
      if (aErr) throw aErr

      toast.success(`Profile created for ${values.name}!`)
      reset(); setShowNewForm(false); refresh()
    } catch (err) {
      console.error(err)
      toast.error(getErrorMessage(err, 'Failed to create profile'))
    } finally { setSubmitting(false) }
  }

  async function onInvite(values: InviteFormValues) {
    if (!activeProfile || !user) return
    setInviting(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          profile_id: activeProfile.id,
          email: values.email.toLowerCase().trim(),
          role: values.role,
        },
      })

      if (error) {
        // Edge Function not deployed yet — fall back to direct DB insert
        console.warn('Edge Function unavailable, falling back to direct insert:', error.message)
        const { error: dbErr } = await supabase.from('profile_invites').upsert({
          profile_id: activeProfile.id,
          invited_by: user.id,
          email: values.email.toLowerCase().trim(),
          role: values.role,
        }, { onConflict: 'profile_id,email' })
        if (dbErr) throw dbErr
        toast.success(`Invite saved — no email sent (deploy the Edge Function to enable emails)`)
      } else if (data?.ok) {
        toast.success(`Invite email sent to ${values.email}`)
      } else if (data?.saved) {
        toast.success(`Invite saved — email delivery failed: ${data.error}`)
        console.warn('Invite email error:', data.error)
      }

      inviteForm.reset({ role: 'editor' })
      setShowInvite(false)
      reloadCaregivers()
    } catch (err) {
      console.error(err)
      toast.error(getErrorMessage(err, 'Failed to send invite'))
    } finally { setInviting(false) }
  }

  async function revokeAccess(row: ProfileAccess) {
    if (row.user_id === user?.id) return // can't revoke yourself
    try {
      const { error } = await supabase.from('profile_access').delete().eq('id', row.id)
      if (error) throw error
      toast.success('Access revoked')
      reloadCaregivers()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to revoke'))
    }
  }

  async function cancelInvite(invite: ProfileInvite) {
    try {
      const { error } = await supabase.from('profile_invites').delete().eq('id', invite.id)
      if (error) throw error
      toast.success('Invite cancelled')
      reloadCaregivers()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to cancel'))
    }
  }

  async function handleSignOut() {
    try { await signOut() } catch { toast.error('Failed to sign out') }
  }

  const loading = profilesLoading || caregiversLoading
  const isOwner = access.some(a => a.user_id === user?.id && a.role === 'owner')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-5">

        {/* Current user card */}
        <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-brand-200 flex items-center justify-center text-brand-800 font-bold flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{user?.email}</p>
            <p className="text-xs text-gray-400">Caregiver account</p>
          </div>
        </div>

        {/* ── Child profiles ── */}
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
                  <span className={`text-lg font-bold ${
                    activeProfile?.id === profile.id ? 'text-brand-700' : 'text-gray-600'
                  }`}>{profile.name.charAt(0).toUpperCase()}</span>
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
          </div>

          {/* Add profile form */}
          {!showNewForm ? (
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-200 text-brand-600 font-medium text-sm hover:border-brand-400 hover:bg-brand-50 transition-all"
            >
              <Plus className="w-4 h-4" /> Add profile
            </button>
          ) : (
            <div className="mt-2 bg-white rounded-xl border border-warm-200 shadow-sm p-4">
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
        </section>

        {/* ── Caregivers for active profile ── */}
        {activeProfile && (
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-1">
                {activeProfile.name}'s caregivers
              </h2>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-brand-400" />
                <span className="text-xs text-gray-400">RLS protected</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Active caregivers */}
                {access.map(row => {
                  const isSelf  = row.user_id === user?.id
                  const canRevoke = isOwner && !isSelf && row.role !== 'owner'
                  const displayEmail = row.email ?? (isSelf ? user?.email : null) ?? 'Unknown'

                  return (
                    <div key={row.id}
                      className="flex items-center gap-3 bg-white rounded-xl border border-warm-200 shadow-sm px-4 py-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-brand-700">
                          {displayEmail.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                            {displayEmail}
                          </p>
                          {isSelf && (
                            <span className="text-xs text-gray-400 italic">you</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <RoleBadge role={row.role} />
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Active
                          </span>
                        </div>
                      </div>
                      {canRevoke && (
                        <button
                          onClick={() => revokeAccess(row)}
                          title="Revoke access"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Pending invites */}
                {invites.map(invite => (
                  <div key={invite.id}
                    className="flex items-center gap-3 bg-amber-50 rounded-xl border border-amber-200 px-4 py-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <RoleBadge role={invite.role} />
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                        <span className="text-xs text-gray-400">
                          · sent {format(parseISO(invite.invited_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => cancelInvite(invite)}
                        title="Cancel invite"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      >
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

            {/* Invite form */}
            {isOwner && (
              <div className="mt-3">
                {!showInvite ? (
                  <button
                    onClick={() => setShowInvite(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 transition"
                  >
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white"
                      >
                        <option value="editor">Editor — can write entries</option>
                        <option value="viewer">Viewer — read only</option>
                      </select>
                      <p className="text-xs text-gray-400">
                        They'll receive an email with a sign-in link. Once they log in,
                        they'll automatically have access to {activeProfile.name}'s diary.
                      </p>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => { setShowInvite(false); inviteForm.reset({ role: 'editor' }) }}
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
        )}

        {/* Diet settings */}
        {activeProfile && (
          <button
            onClick={() => navigate('/diet-settings')}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-white border border-warm-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Utensils className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Diet &amp; Nutrition Settings</p>
              <p className="text-xs text-gray-400 mt-0.5">Foods, smoothie ingredients, supplements</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-500 text-sm font-medium hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>

      </div>
    </div>
  )
}
