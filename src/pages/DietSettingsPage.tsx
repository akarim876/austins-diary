import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useProfile } from '../contexts/ProfileContext'
import { useDietSettings } from '../hooks/useDietSettings'
import { Spinner } from '../components/ui/Spinner'
import type { DietSettings } from '../types'

// ─── EditableList ────────────────────────────────────────────────────────────

interface EditableListProps {
  title: string
  description: string
  items: string[]
  onSave: (updated: string[]) => Promise<void>
  accentColor?: 'emerald' | 'teal' | 'purple'
}

function EditableList({ title, description, items, onSave, accentColor = 'emerald' }: EditableListProps) {
  const [open, setOpen]       = useState(false)
  const [list, setList]       = useState<string[]>(items)
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving]   = useState(false)
  const [dirty, setDirty]     = useState(false)

  const accent = accentColor === 'teal'
    ? { ring: 'focus:ring-teal-400', btn: 'bg-teal-500 hover:bg-teal-600', border: 'border-teal-200' }
    : accentColor === 'purple'
    ? { ring: 'focus:ring-purple-400', btn: 'bg-purple-500 hover:bg-purple-600', border: 'border-purple-200' }
    : { ring: 'focus:ring-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-600', border: 'border-emerald-200' }

  function addItem() {
    const name = newItem.trim()
    if (!name || list.includes(name)) { setNewItem(''); return }
    setList(prev => [...prev, name])
    setNewItem('')
    setDirty(true)
  }

  function removeItem(item: string) {
    setList(prev => prev.filter(i => i !== item))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    await onSave(list)
    setDirty(false)
    setSaving(false)
    toast.success(`${title} saved`)
  }

  return (
    <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors ${open ? `border-b ${accent.border}` : ''}`}
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            {!open && list.length > 0 && (
              <span className="text-xs text-gray-400">{list.length} item{list.length !== 1 ? 's' : ''}</span>
            )}
            {dirty && <span className="text-xs text-amber-500 font-medium">• unsaved</span>}
          </div>
          {!open && <p className="text-xs text-gray-400 truncate mt-0.5">{description}</p>}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="p-4 space-y-3">
          {list.length === 0 && <p className="text-sm text-gray-400 italic">Nothing added yet.</p>}
          <div className="space-y-2">
            {list.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="flex-1 text-sm text-gray-800">{item}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
              placeholder="Add item…"
              className={`flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 ${accent.ring} transition`}
            />
            <button
              type="button"
              onClick={addItem}
              disabled={!newItem.trim()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 ${accent.btn}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition flex items-center justify-center gap-2 ${accent.btn}`}
            >
              {saving ? <Spinner className="w-4 h-4" /> : 'Save changes'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SmoothieRecipesEditor ───────────────────────────────────────────────────

interface SmoothieRecipesEditorProps {
  smoothies: Record<string, string[]>
  onSave: (updated: Record<string, string[]>) => Promise<void>
}

function SmoothieRecipesEditor({ smoothies, onSave }: SmoothieRecipesEditorProps) {
  const [recipes, setRecipes] = useState<Record<string, string[]>>(smoothies)
  const [expanded, setExpanded] = useState<string | null>(
    Object.keys(smoothies)[0] ?? null
  )
  const [newRecipeName, setNewRecipeName] = useState('')
  const [newIngredient, setNewIngredient] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const recipeNames = Object.keys(recipes)

  function addRecipe() {
    const name = newRecipeName.trim()
    if (!name || name in recipes) { setNewRecipeName(''); return }
    const updated = { ...recipes, [name]: [] }
    setRecipes(updated)
    setExpanded(name)
    setNewRecipeName('')
    setDirty(true)
  }

  function deleteRecipe(name: string) {
    const updated = { ...recipes }
    delete updated[name]
    setRecipes(updated)
    if (expanded === name) setExpanded(Object.keys(updated)[0] ?? null)
    setDirty(true)
  }

  function addIngredient(recipeName: string) {
    const ingredient = (newIngredient[recipeName] ?? '').trim()
    if (!ingredient || recipes[recipeName]?.includes(ingredient)) {
      setNewIngredient(prev => ({ ...prev, [recipeName]: '' }))
      return
    }
    setRecipes(prev => ({
      ...prev,
      [recipeName]: [...(prev[recipeName] ?? []), ingredient],
    }))
    setNewIngredient(prev => ({ ...prev, [recipeName]: '' }))
    setDirty(true)
  }

  function removeIngredient(recipeName: string, ingredient: string) {
    setRecipes(prev => ({
      ...prev,
      [recipeName]: prev[recipeName].filter(i => i !== ingredient),
    }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    await onSave(recipes)
    setDirty(false)
    setSaving(false)
    toast.success('Smoothie recipes saved')
  }

  const [sectionOpen, setSectionOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setSectionOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors ${sectionOpen ? 'border-b border-emerald-200' : ''}`}
      >
        {sectionOpen
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">Smoothie Recipes</h3>
            {!sectionOpen && recipeNames.length > 0 && (
              <span className="text-xs text-gray-400">{recipeNames.length} recipe{recipeNames.length !== 1 ? 's' : ''}</span>
            )}
            {dirty && <span className="text-xs text-amber-500 font-medium">• unsaved</span>}
          </div>
          {!sectionOpen && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
              Add named recipes, each with its own ingredient checklist
            </p>
          )}
        </div>
      </button>

      {sectionOpen && <div className="p-4 space-y-3">
        {/* Recipe list */}
        {recipeNames.length === 0 && (
          <p className="text-sm text-gray-400 italic">No smoothie recipes yet. Add one below.</p>
        )}

        {recipeNames.map(name => {
          const isOpen = expanded === name
          const ingredients = recipes[name] ?? []
          return (
            <div key={name} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Recipe row */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : name)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                  <span className="text-sm font-semibold text-gray-800">🥤 {name}</span>
                  <span className="text-xs text-gray-400 ml-1">
                    {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteRecipe(name)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Ingredients (expanded) */}
              {isOpen && (
                <div className="px-4 pt-3 pb-4 space-y-2 border-t border-gray-100">
                  {ingredients.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No ingredients yet.</p>
                  )}
                  {ingredients.map((ingredient, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-gray-700">✓ {ingredient}</span>
                      <button
                        type="button"
                        onClick={() => removeIngredient(name, ingredient)}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Add ingredient */}
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newIngredient[name] ?? ''}
                      onChange={e => setNewIngredient(prev => ({ ...prev, [name]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIngredient(name))}
                      placeholder="Add ingredient…"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => addIngredient(name)}
                      disabled={!(newIngredient[name] ?? '').trim()}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-600 transition disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Add new recipe */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newRecipeName}
            onChange={e => setNewRecipeName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRecipe())}
            placeholder="New smoothie name (e.g. Morning Green)…"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />
          <button
            type="button"
            onClick={addRecipe}
            disabled={!newRecipeName.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-600 transition disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Save */}
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 transition flex items-center justify-center gap-2"
          >
            {saving ? <Spinner className="w-4 h-4" /> : 'Save recipes'}
          </button>
        )}
      </div>}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function DietSettingsPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const { settings, loading, save } = useDietSettings(activeProfile?.id ?? null)

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-gray-400 text-sm">No profile selected.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center flex-1"><Spinner className="w-8 h-8" /></div>
  }

  async function saveField(patch: Partial<Omit<DietSettings, 'id' | 'profile_id' | 'created_at' | 'updated_at'>>) {
    await save(patch)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-warm-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl hover:bg-warm-100 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900">Diet Settings</h1>
        <p className="ml-auto text-xs text-gray-400">{activeProfile.name}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-5">
        <p className="text-xs text-gray-500 px-1">
          All lists here drive quick-tap selection when logging. Changes apply to future logs immediately.
        </p>

        <EditableList
          title="Known Accepted Foods"
          description="Tap to select when logging a meal or snack."
          items={settings.accepted_foods}
          onSave={updated => saveField({ accepted_foods: updated })}
        />

        <SmoothieRecipesEditor
          smoothies={settings.smoothies}
          onSave={updated => saveField({ smoothies: updated })}
        />

        <EditableList
          title="Supplement Plan"
          description="Items start unchecked — mark what was taken when logging supplements."
          items={settings.supplements}
          onSave={updated => saveField({ supplements: updated })}
          accentColor="teal"
        />

        <EditableList
          title="Medications"
          description="Items start unchecked — mark what was taken when logging medications."
          items={settings.medications}
          onSave={updated => saveField({ medications: updated })}
          accentColor="purple"
        />
      </div>
    </div>
  )
}
