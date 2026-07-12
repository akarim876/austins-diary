/**
 * Shown on first login when the user has no user_profile yet.
 * Collecting first name, last name, and a unique username is mandatory
 * before the user can access the rest of the app.
 */
import { useState } from 'react'
import { UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../hooks/useUserProfile'
import { Spinner } from '../components/ui/Spinner'

export function CompleteProfilePage({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth()
  const { save } = useUserProfile(user?.id ?? null)

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [username,  setUsername]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required'
    if (!lastName.trim())  e.lastName  = 'Last name is required'
    if (!username.trim())  e.username  = 'Username is required'
    else if (!/^[a-z0-9_.-]{2,30}$/.test(username.trim().toLowerCase())) {
      e.username = 'Username may only contain letters, numbers, _ . - (2–30 characters)'
    }
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
        setErrors({ username: 'That username is already taken — try another' })
      } else {
        toast.error('Failed to save profile. Please try again.')
      }
      return
    }
    toast.success('Profile saved!')
    onComplete()
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-warm-100 px-5">
      <div className="w-full max-w-sm">
        {/* Logo / icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg">
            <UserCircle className="w-9 h-9 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Complete your profile</h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Tell us your name before you get started.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* First name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Jane"
              autoFocus
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
                errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
          </div>

          {/* Last name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Doe"
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
                errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="jane_doe"
                className={`w-full pl-8 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
                  errors.username ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
            </div>
            {errors.username
              ? <p className="mt-1 text-xs text-red-500">{errors.username}</p>
              : <p className="mt-1 text-xs text-gray-400">Letters, numbers, _ . - only</p>
            }
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {saving ? <Spinner className="w-5 h-5" /> : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
