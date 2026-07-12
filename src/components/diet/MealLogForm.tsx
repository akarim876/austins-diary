import { useState } from 'react'
import { Clock, Plus, Save, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { MEAL_TYPES, ACCEPTANCE_OPTIONS } from '../../lib/dietConstants'
import type { DietLog, DietSettings, MealType, FoodAcceptance } from '../../types'
import { Spinner } from '../ui/Spinner'

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface Props {
  profileId: string
  date: string
  existingLog?: DietLog | null
  settings: DietSettings
  onSaved: (updatedSettings?: Partial<DietSettings>) => void
  onCancel: () => void
}

export function MealLogForm({ profileId, date, existingLog, settings, onSaved, onCancel }: Props) {
  const { user } = useAuth()

  const [time, setTime]           = useState(existingLog?.time_of_day?.slice(0, 5) ?? nowTime())
  const [mealType, setMealType]   = useState<MealType | null>(existingLog?.meal_type ?? null)
  const [selectedFoods, setSelectedFoods] = useState<string[]>(existingLog?.foods_eaten ?? [])
  const [newFoodMode, setNewFoodMode]     = useState(false)
  const [newFoodInput, setNewFoodInput]   = useState('')
  const [newFoodIntroduced, setNewFoodIntroduced] = useState(existingLog?.new_food_introduced ?? false)
  const [newFoodName, setNewFoodName]     = useState(existingLog?.new_food_name ?? '')
  const [acceptance, setAcceptance]       = useState<FoodAcceptance | null>(existingLog?.new_food_acceptance ?? null)
  const [newFoodNotes, setNewFoodNotes]   = useState(existingLog?.new_food_notes ?? '')
  const [notes, setNotes]                 = useState(existingLog?.notes ?? '')
  const [submitting, setSubmitting]       = useState(false)
  const [deleting, setDeleting]           = useState(false)

  // Local copy of accepted_foods so newly added foods appear immediately
  const [localFoods, setLocalFoods] = useState<string[]>(settings.accepted_foods)

  function toggleFood(food: string) {
    setSelectedFoods(prev =>
      prev.includes(food) ? prev.filter(f => f !== food) : [...prev, food]
    )
  }

  async function addNewFood() {
    const name = newFoodInput.trim()
    if (!name || localFoods.includes(name)) { setNewFoodMode(false); setNewFoodInput(''); return }
    const updated = [...localFoods, name]
    setLocalFoods(updated)
    setSelectedFoods(prev => [...prev, name])
    setNewFoodMode(false)
    setNewFoodInput('')
    // Persist to settings
    await supabase.from('diet_settings').upsert(
      { profile_id: profileId, accepted_foods: updated },
      { onConflict: 'profile_id' }
    )
    onSaved({ accepted_foods: updated })
    return
  }

  async function handleSubmit() {
    if (!user || !mealType) return
    setSubmitting(true)
    try {
      const payload = {
        profile_id: profileId,
        author_id: user.id,
        entry_date: date,
        time_of_day: time,
        log_type: 'meal' as const,
        meal_type: mealType,
        foods_eaten: selectedFoods,
        new_food_introduced: newFoodIntroduced,
        new_food_name: newFoodIntroduced ? newFoodName : '',
        new_food_acceptance: newFoodIntroduced ? acceptance : null,
        new_food_notes: newFoodIntroduced ? newFoodNotes : '',
        notes,
      }
      if (existingLog) {
        const { error } = await supabase.from('diet_logs').update(payload).eq('id', existingLog.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('diet_logs').insert(payload)
        if (error) throw error
      }
      toast.success('Meal logged')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!existingLog) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('diet_logs').delete().eq('id', existingLog.id)
      if (error) throw error
      toast.success('Log deleted')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="px-4 py-5 space-y-6 pb-8">

      {/* ── Time ── */}
      <section className="space-y-2">
        <label className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <Clock className="w-3 h-3" /> Time
        </label>
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="w-36 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
        />
      </section>

      {/* ── Meal type ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Meal type</h3>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPES.map(mt => (
            <button
              key={mt.value}
              type="button"
              onClick={() => setMealType(mt.value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                mealType === mt.value
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
              }`}
            >
              <span className="text-lg">{mt.emoji}</span> {mt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Foods eaten ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Foods eaten <span className="text-gray-300 normal-case font-normal">(tap to select)</span>
        </h3>

        {localFoods.length === 0 && !newFoodMode && (
          <p className="text-sm text-gray-400 italic">No foods added yet — tap "Add food" to start.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {localFoods.map(food => (
            <button
              key={food}
              type="button"
              onClick={() => toggleFood(food)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedFoods.includes(food)
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
              }`}
            >
              {food}
            </button>
          ))}

          {/* Add food chip */}
          {newFoodMode ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={newFoodInput}
                onChange={e => setNewFoodInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewFood() } if (e.key === 'Escape') { setNewFoodMode(false); setNewFoodInput('') } }}
                placeholder="Food name…"
                className="px-3 py-1.5 rounded-full border-2 border-emerald-400 text-sm focus:outline-none w-32"
              />
              <button type="button" onClick={addNewFood} className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => { setNewFoodMode(false); setNewFoodInput('') }} className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewFoodMode(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-dashed border-emerald-300 text-sm text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add food
            </button>
          )}
        </div>
      </section>

      {/* ── New food introduced ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">New food introduced?</h3>
          <button
            type="button"
            onClick={() => setNewFoodIntroduced(v => !v)}
            className={`w-11 h-6 rounded-full transition-all ${newFoodIntroduced ? 'bg-emerald-500' : 'bg-gray-200'}`}
          >
            <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${newFoodIntroduced ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {newFoodIntroduced && (
          <div className="space-y-3 pl-1">
            <input
              type="text"
              value={newFoodName}
              onChange={e => setNewFoodName(e.target.value)}
              placeholder="Name of new food…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Acceptance</p>
              <div className="flex gap-2">
                {ACCEPTANCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAcceptance(opt.value)}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                      acceptance === opt.value
                        ? opt.color + ' border-current'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={newFoodNotes}
              onChange={e => setNewFoodNotes(e.target.value)}
              rows={2}
              placeholder="Notes about the trial… (optional)"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>
        )}
      </section>

      {/* ── Notes ── */}
      <section>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Notes <span className="text-gray-300 normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any observations about this meal…"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
        />
      </section>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1">
        {existingLog && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-3 rounded-xl border border-red-100 text-red-500 text-sm hover:bg-red-50 transition flex items-center"
          >
            {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !mealType}
          className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 active:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Spinner className="w-4 h-4" /> : <><Save className="w-4 h-4" /> Save meal</>}
        </button>
      </div>
    </div>
  )
}
