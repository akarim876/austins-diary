import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Baby, Plus, ChevronRight, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'
import { Spinner } from '../ui/Spinner'
import { format, parseISO } from 'date-fns'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  birth_date: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ProfileSetupPage() {
  const { user, signOut } = useAuth()
  const { profiles, setActiveProfile, refresh, loading } = useProfile()

  async function handleSignOut() {
    try { await signOut() } catch { toast.error('Failed to sign out') }
  }
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSubmitting(true)
    try {
      // Pre-generate the ID so we can insert profile_access without needing
      // to SELECT back the profile (which would be blocked by RLS before
      // the access row exists).
      const profileId = crypto.randomUUID()

      const { error: profileError } = await supabase
        .from('child_profiles')
        .insert({
          id: profileId,
          name: values.name,
          birth_date: values.birth_date || null,
          created_by: user.id,
        })

      if (profileError) {
        console.error('child_profiles insert error:', profileError)
        throw profileError
      }

      const { error: accessError } = await supabase.from('profile_access').insert({
        profile_id: profileId,
        user_id: user.id,
        email: user.email ?? null,
        role: 'owner',
      })

      if (accessError) {
        console.error('profile_access insert error:', accessError)
        throw accessError
      }

      toast.success(`Profile created for ${values.name}!`)
      reset()
      setShowForm(false)
      refresh()
    } catch (err: unknown) {
      console.error('Profile creation failed:', err)
      toast.error(getErrorMessage(err, 'Failed to create profile'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-warm-100 flex flex-col px-4 py-12">
      {/* Top bar with signed-in identity + sign-out */}
      <div className="fixed top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-warm-100/80 backdrop-blur-sm z-10">
        <span className="text-xs text-gray-400 truncate max-w-[220px]">{user?.email}</span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>

      <div className="max-w-sm mx-auto w-full pt-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
            <Baby className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Child Profiles</h1>
            <p className="text-sm text-gray-500 mt-1">Select a profile to open their diary</p>
          </div>
        </div>

        {/* Existing profiles */}
        {profiles.length > 0 && (
          <div className="space-y-2 mb-4">
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => setActiveProfile(profile)}
                className="w-full flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-warm-200 hover:border-brand-300 hover:shadow-md transition-all group text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-brand-600">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
                  {profile.birth_date && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Born {format(parseISO(profile.birth_date), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Add profile button / form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-brand-200 text-brand-600 font-medium text-sm hover:border-brand-400 hover:bg-brand-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add child profile
          </button>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">New profile</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Child's name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Austin"
                  {...register('name')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date of birth <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="date"
                  {...register('birth_date')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); reset() }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <Spinner className="w-4 h-4" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

