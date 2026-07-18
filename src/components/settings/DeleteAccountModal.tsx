import { createPortal } from 'react-dom'
import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'


interface Props {
  onClose: () => void
}

const CONFIRM_WORD = 'DELETE'

export function DeleteAccountModal({ onClose }: Props) {
  const { signOut } = useAuth()
  const [input, setInput]       = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmed = input.trim() === CONFIRM_WORD

  async function handleDelete() {
    if (!confirmed) return
    setDeleting(true)
    try {
      // supabase.functions.invoke automatically attaches the session token
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) throw error

      toast.success('Your account has been deleted.')
      await signOut()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete account — please try again.'))
      setDeleting(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Delete your account</h2>
            <p className="text-xs text-gray-500 mt-0.5">This cannot be undone</p>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <p>Deleting your account will:</p>
            <ul className="space-y-1 pl-4 list-disc text-sm">
              <li>Permanently remove your sign-in credentials</li>
              <li>Delete your personal profile and preferences</li>
              <li>Remove your access to all child profiles</li>
            </ul>
            <p className="text-xs text-gray-400 pt-1">
              Log entries and child profiles you created may remain accessible to other caregivers
              who still have access.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Type <span className="font-bold text-red-600">{CONFIRM_WORD}</span> to confirm
            </label>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={CONFIRM_WORD}
              disabled={deleting}
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 transition tabular-nums"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!confirmed || deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {deleting ? <Spinner className="w-4 h-4" /> : 'Delete account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
