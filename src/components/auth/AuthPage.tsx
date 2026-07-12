import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { BookHeart, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormValues = z.infer<typeof schema>

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(values.email, values.password)
        toast.success('Welcome back!')
      } else {
        await signUp(values.email, values.password)
        toast.success('Account created! Check your email to confirm.')
      }
    } catch (err: unknown) {
      console.error('Auth error:', err)
      const msg = getErrorMessage(err, 'Something went wrong')
      // Auto-switch to sign-in tab when the email already has an account
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
      {/* Logo / Header */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
          <BookHeart className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Austin's Diary</h1>
          <p className="text-sm text-gray-500 mt-1">A private caregiving journal</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-warm-200 p-6">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                {...register('password')}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
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
      </div>
    </div>
  )
}
