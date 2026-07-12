import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'
import { PROGRESS_RATINGS } from '../../lib/goalConstants'
import type { Goal, ProgressNote, ProgressRating } from '../../types'

interface Props {
  profileId: string
  /** If provided, the goal is pre-selected and cannot be changed. */
  preselectedGoal?: Goal
  /** All active goals to choose from (used when preselectedGoal is absent). */
  availableGoals?: Goal[]
  existingNote?: ProgressNote | null
  defaultDate?: string
  onSaved: () => void
  onCancel: () => void
}

export function ProgressNoteForm({
  profileId, preselectedGoal, availableGoals = [], existingNote,
  defaultDate, onSaved, onCancel,
}: Props) {
  const { user } = useAuth()

  const today = format(new Date(), 'yyyy-MM-dd')
  const activeGoals = availableGoals.filter(g => g.status === 'active')

  const [goalId,   setGoalId]   = useState<string>(
    existingNote?.goal_id ?? preselectedGoal?.id ?? (activeGoals[0]?.id ?? '')
  )
  const [rating,   setRating]   = useState<ProgressRating | null>(
    existingNote?.rating as ProgressRating ?? null
  )
  const [noteText, setNoteText] = useState(existingNote?.notes ?? '')
  const [noteDate, setNoteDate] = useState(existingNote?.note_date ?? defaultDate ?? today)
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedGoal = preselectedGoal
    ?? availableGoals.find(g => g.id === goalId)
    ?? null

  const filteredGoals = useMemo(() =>
    activeGoals.filter(g =>
      g.title.toLowerCase().includes(search.toLowerCase())
    ),
    [activeGoals, search]
  )

  async function handleSave() {
    if (!rating) { toast.error('Please select a progress rating'); return }
    if (!goalId) { toast.error('Please select a goal'); return }
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        profile_id: profileId,
        goal_id:    goalId,
        author_id:  user.id,
        note_date:  noteDate,
        rating,
        notes:      noteText.trim() || null,
      }
      if (existingNote) {
        const { error } = await supabase.from('progress_notes').update(payload).eq('id', existingNote.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('progress_notes').insert({ ...payload, id: crypto.randomUUID() })
        if (error) throw error
      }
      toast.success('Progress note saved')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save'))
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!existingNote) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('progress_notes').delete().eq('id', existingNote.id)
      if (error) throw error
      toast.success('Note deleted')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally { setDeleting(false) }
  }

  return (
    <div className="px-4 pt-2 pb-6 space-y-5">

      {/* Goal selector */}
      {preselectedGoal ? (
        <div className="px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-sm font-semibold text-teal-800">
          {preselectedGoal.title}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Goal
          </label>
          {activeGoals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No active goals yet</p>
          ) : (
            <>
              {activeGoals.length > 4 && (
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search goals…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                  />
                </div>
              )}
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredGoals.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoalId(g.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${
                      goalId === g.id
                        ? 'bg-teal-50 border-teal-300 font-semibold text-teal-800'
                        : 'border-gray-100 hover:border-gray-200 text-gray-700'
                    }`}
                  >
                    {g.title}
                    <span className="ml-2 text-xs text-gray-400 font-normal">{g.source}</span>
                  </button>
                ))}
                {filteredGoals.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">No results</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Progress rating
        </label>
        <div className="space-y-1.5">
          {PROGRESS_RATINGS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRating(r => r === opt.value ? null : opt.value)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                rating === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-teal-400'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dotColor}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Date
        </label>
        <input
          type="date"
          value={noteDate}
          onChange={e => setNoteDate(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition bg-white"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Anything to note about today's session or observation…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {existingNote && (
          <button type="button" onClick={handleDelete} disabled={deleting || saving}
            className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition disabled:opacity-50">
            {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving || !rating || !goalId}
          className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Spinner className="w-4 h-4" /> : 'Save note'}
        </button>
      </div>

      {selectedGoal && !preselectedGoal && (
        <p className="text-xs text-center text-gray-400 -mt-2">
          Logging progress for: <span className="font-semibold text-gray-600">{selectedGoal.title}</span>
        </p>
      )}
    </div>
  )
}
