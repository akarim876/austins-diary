import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'
import { GOAL_SOURCES, GOAL_STATUSES } from '../../lib/goalConstants'
import type { Goal, GoalSource, GoalStatus } from '../../types'

interface Props {
  profileId: string
  existingGoal?: Goal | null
  onSaved: () => void
  onCancel: () => void
}

export function GoalForm({ profileId, existingGoal, onSaved, onCancel }: Props) {
  const { user } = useAuth()

  const [title,      setTitle]      = useState(existingGoal?.title       ?? '')
  const [source,     setSource]     = useState<GoalSource>(existingGoal?.source as GoalSource ?? 'IEP')
  const [description, setDescription] = useState(existingGoal?.description ?? '')
  const [status,     setStatus]     = useState<GoalStatus>(existingGoal?.status as GoalStatus ?? 'active')
  const [startDate,  setStartDate]  = useState(existingGoal?.start_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [targetDate, setTargetDate] = useState(existingGoal?.target_date ?? '')
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Goal title is required'
    return e
  }

  async function handleSave() {
    const ve = validate()
    if (Object.keys(ve).length) { setErrors(ve); return }
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        profile_id:  profileId,
        author_id:   user.id,
        title:       title.trim(),
        source,
        description: description.trim(),
        status,
        start_date:  startDate,
        target_date: targetDate || null,
      }
      if (existingGoal) {
        const { error } = await supabase.from('goals').update(payload).eq('id', existingGoal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('goals').insert({ ...payload, id: crypto.randomUUID() })
        if (error) throw error
      }
      toast.success(existingGoal ? 'Goal updated' : 'Goal created')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save goal'))
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!existingGoal) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('goals').delete().eq('id', existingGoal.id)
      if (error) throw error
      toast.success('Goal deleted')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally { setDeleting(false) }
  }

  return (
    <div className="px-4 pt-2 pb-6 space-y-5">

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Goal title *
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Increase verbal requests to 10/day"
          autoFocus
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition ${
            errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Source */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Source
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_SOURCES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                source === s
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Description &amp; success criteria
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this goal? What does success look like?"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition resize-none"
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_STATUSES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                status === s.value
                  ? s.color + ' ring-2 ring-offset-1 ring-teal-400'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Target date <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition bg-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {existingGoal && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition disabled:opacity-50"
          >
            {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Spinner className="w-4 h-4" /> : existingGoal ? 'Save changes' : 'Create goal'}
        </button>
      </div>
    </div>
  )
}
