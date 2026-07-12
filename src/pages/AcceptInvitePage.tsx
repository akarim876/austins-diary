import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { BookHeart, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { Spinner } from '../components/ui/Spinner'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine(v => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ['confirm'],
  })
type FormValues = z.infer<typeof schema>

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw error
      toast.success('Password set! Welcome to the diary.')
      navigate('/diary', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to set password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-warm-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
          <BookHeart className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">You've been invited!</h1>
          <p className="text-sm text-gray-500 mt-1">Set a password to complete your account</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-warm-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Create a password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('confirm')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            />
            {errors.confirm && (
              <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? <Spinner className="w-4 h-4" /> : 'Set password & enter'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          You'll use this password to sign in going forward.
        </p>
      </div>
    </div>
  )
}
