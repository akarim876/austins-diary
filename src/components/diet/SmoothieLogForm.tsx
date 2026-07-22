import { useEffect, useState } from 'react'
import { Clock, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { HYDRATION_OPTIONS } from '../../lib/dietConstants'
import type { DietLog, DietSettings, HydrationLevel } from '../../types'
import { Spinner } from '../ui/Spinner'

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Pick a default recipe name based on time-of-day keywords, or first recipe. */
function defaultRecipeName(smoothies: Record<string, string[]>, existing?: string | null): string | null {
  if (existing) return existing
  const names = Object.keys(smoothies)
  if (names.length === 0) return null
  const hour = new Date().getHours()
  // Prefer names containing 'morning' / 'am' before noon, 'evening' / 'pm' / 'night' after
  const keyword = hour < 13 ? ['morning', 'am'] : ['evening', 'night', 'pm', 'afternoon']
  const match = names.find(n => keyword.some(k => n.toLowerCase().includes(k)))
  return match ?? names[0]
}

interface Props {
  profileId: string
  date: string
  existingLog?: DietLog | null
  settings: DietSettings
  onSaved: () => void
  onCancel: () => void
}

interface ChecklistProps {
  items: string[]
  checked: Set<string>
  onToggle: (item: string) => void
}

function Checklist({ items, checked, onToggle }: ChecklistProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">No items configured — add them in Diet Settings.</p>
  }
  return (
    <div className="space-y-2">
      {items.map(item => {
        const isChecked = checked.has(item)
        return (
          <label
            key={item}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
              isChecked
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
              isChecked ? 'bg-emerald-500 border-transparent' : 'border-gray-300'
            }`}>
              {isChecked && <span className="text-white text-xs font-bold leading-none">✓</span>}
            </span>
            <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => onToggle(item)} />
            <span className={`text-sm font-medium ${isChecked ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
              {item}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export function SmoothieLogForm({ profileId, date, existingLog, settings, onSaved, onCancel }: Props) {
  const { user } = useAuth()

  const recipeNames = Object.keys(settings.smoothies)

  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(
    defaultRecipeName(settings.smoothies, existingLog?.smoothie_type)
  )
  const [time, setTime] = useState(existingLog?.time_of_day?.slice(0, 5) ?? nowTime())
  const [hydration, setHydration] = useState<HydrationLevel | null>(existingLog?.hydration ?? 'full_cup')
  const [substitutionNotes, setSubstitutionNotes] = useState(existingLog?.substitution_notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Active ingredient list for the selected recipe
  const ingredientList = selectedRecipe ? (settings.smoothies[selectedRecipe] ?? []) : []

  function initIngredients(): Set<string> {
    if (existingLog?.smoothie_type === selectedRecipe) {
      const { ingredients_checked: c = [], ingredients_omitted: o = [] } = existingLog
      if (c.length > 0 || o.length > 0) return new Set(c)
    }
    return new Set(ingredientList)
  }

  const [ingredientsChecked, setIngredientsChecked] = useState<Set<string>>(initIngredients)

  // When recipe changes reset checklist to all-checked (unless editing that recipe)
  useEffect(() => {
    if (existingLog?.smoothie_type === selectedRecipe) {
      const { ingredients_checked: c = [], ingredients_omitted: o = [] } = existingLog
      if (c.length > 0 || o.length > 0) {
        setIngredientsChecked(new Set(c))
        return
      }
    }
    setIngredientsChecked(new Set(ingredientList))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecipe])

  function toggleIngredient(item: string) {
    setIngredientsChecked(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  const omittedIngredients = ingredientList.filter(i => !ingredientsChecked.has(i))
  const hasOmissions = omittedIngredients.length > 0
  const isAllChecked = ingredientList.length > 0 && !hasOmissions

  async function handleSave() {
    if (!user || !selectedRecipe) return
    setSubmitting(true)
    try {
      const payload = {
        profile_id: profileId,
        author_id: user.id,
        entry_date: date,
        time_of_day: time,
        log_type: 'smoothie' as const,
        smoothie_type: selectedRecipe,
        ingredients_checked: Array.from(ingredientsChecked),
        ingredients_omitted: omittedIngredients,
        hydration,
        substitution_notes: hasOmissions ? substitutionNotes : '',
      }
      if (existingLog) {
        const { error } = await supabase.from('diet_logs').update(payload).eq('id', existingLog.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('diet_logs').insert(payload)
        if (error) throw error
      }
      toast.success(`${selectedRecipe} smoothie logged`)
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

  const noRecipes = recipeNames.length === 0

  return (
    <div className="px-4 py-5 space-y-5 pb-8">

      {/* ── No recipes configured ── */}
      {noRecipes && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-700">
          No smoothie recipes configured yet. Add one in <strong>Settings → Diet</strong> first.
        </div>
      )}

      {/* ── Recipe picker ── */}
      {!noRecipes && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Smoothie</h3>
          <div className="flex flex-wrap gap-2">
            {recipeNames.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedRecipe(name)}
                className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  selectedRecipe === name
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                }`}
              >
                🥤 {name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick-save banner ── */}
      {selectedRecipe && isAllChecked && !existingLog && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-emerald-700 font-medium">
            All items checked — tap save to log instantly.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50 flex-shrink-0"
          >
            {submitting ? <Spinner className="w-4 h-4" /> : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </div>
      )}

      {/* ── Time ── */}
      <section>
        <label htmlFor="smoothie-time" className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
          <Clock className="w-3 h-3" /> Time
        </label>
        <input
          id="smoothie-time"
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="w-36 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
        />
      </section>

      {/* ── Ingredient checklist ── */}
      {selectedRecipe && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Ingredients
            {omittedIngredients.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold normal-case">
                {omittedIngredients.length} omitted
              </span>
            )}
          </h3>
          <Checklist
            items={ingredientList}
            checked={ingredientsChecked}
            onToggle={toggleIngredient}
          />
        </section>
      )}

      {/* ── Hydration ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Hydration</h3>
        <div className="grid grid-cols-2 gap-2">
          {HYDRATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHydration(opt.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                hydration === opt.value
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200'
              }`}
            >
              <span className="text-base">{opt.emoji}</span> {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Substitution notes ── */}
      {hasOmissions && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-widest">
            Substitution notes
          </h3>
          <p className="text-xs text-gray-400">Omitted: {omittedIngredients.join(', ')}</p>
          <textarea
            value={substitutionNotes}
            onChange={e => setSubstitutionNotes(e.target.value)}
            rows={2}
            placeholder="Why was it omitted? Any substitutions made?"
            className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
          />
        </section>
      )}

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
          onClick={handleSave}
          disabled={submitting || !selectedRecipe}
          className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 active:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Spinner className="w-4 h-4" /> : <><Save className="w-4 h-4" /> Save smoothie</>}
        </button>
      </div>
    </div>
  )
}
