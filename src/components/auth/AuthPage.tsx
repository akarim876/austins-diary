import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { AppLogo } from '../ui/AppLogo'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const authSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

type AuthValues   = z.infer<typeof authSchema>
type ForgotValues = z.infer<typeof forgotSchema>

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition'

// ─── Forgot password form ─────────────────────────────────────────────────────

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { resetPasswordForEmail } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
  })

  async function onSubmit(values: ForgotValues) {
    setSubmitting(true)
    try {
      await resetPasswordForEmail(values.email)
      setSent(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send reset email'))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <span className="text-green-600 text-xl">✓</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Check your email</p>
          <p className="text-sm text-gray-500 mt-1">
            We sent a password-reset link. It may take a minute to arrive — check your spam folder
            if you don't see it.
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </button>
        <p className="text-sm font-semibold text-gray-900">Reset your password</p>
        <p className="text-xs text-gray-500 mt-1">
          Enter your email and we'll send you a link to set a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            className={inputClass}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <Spinner className="w-4 h-4" /> : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────

export function AuthPage({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]             = useState<'login' | 'register'>(initialMode)
  const [showForgot, setShowForgot] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
  })

  async function onSubmit(values: AuthValues) {
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(values.email, values.password)
        toast.success('Welcome back!')
      } else {
        const { needsConfirmation } = await signUp(values.email, values.password)
        if (needsConfirmation) {
          toast.success('Account created — check your email to confirm, then sign in.')
        } else {
          toast.success('Account created — welcome!')
        }
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Something went wrong')
      if (mode === 'register' && msg.toLowerCase().includes('already exists')) {
        setMode('login')
        toast.error('This email already has an account — switched to sign in.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-warm-100 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <AppLogo className="h-16" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Austin's Diary</h1>
          <p className="text-sm text-gray-500 mt-1">A private caregiving journal</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-warm-200 p-6">
        {showForgot ? (
          <ForgotPasswordForm onBack={() => setShowForgot(false)} />
        ) : (
          <>
            {/* Tab switch */}
            <div className="flex rounded-xl bg-warm-100 p-1 mb-6">
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    mode === m
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={inputClass}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <Spinner className="w-4 h-4" />
                ) : mode === 'login' ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            {mode === 'register' && (
              <p className="mt-4 text-center text-xs text-gray-400">
                If you were invited, use the link in your invite email or sign in above.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
