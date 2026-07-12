import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { useProfile } from '../contexts/ProfileContext'
import { useScheduleTemplate } from '../hooks/useScheduleTemplate'
import { useMyRole, canCreate } from '../hooks/useMyRole'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

interface EditState { label: string; time: string }

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs px-2 py-1.5 rounded-lg outline-none w-24"
      style={{ border: '1px solid rgba(51,50,46,0.15)', color: '#33322E', background: '#fff' }}
    />
  )
}

export function ScheduleSettingsPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const myRole = useMyRole(activeProfile?.id ?? null)
  const { items, loading, addItem, updateItem, deleteItem, moveItem } = useScheduleTemplate(activeProfile?.id ?? null)

  const canEdit = canCreate(myRole)

  // Inline edit state: itemId → draft
  const [editing, setEditing] = useState<Record<string, EditState>>({})
  // New item form
  const [addLabel, setAddLabel] = useState('')
  const [addTime, setAddTime]   = useState('')
  const [adding, setAdding]     = useState(false)

  function startEdit(id: string, label: string, time: string | null) {
    setEditing(e => ({ ...e, [id]: { label, time: time ?? '' } }))
  }
  function cancelEdit(id: string) {
    setEditing(e => { const n = { ...e }; delete n[id]; return n })
  }
  async function saveEdit(id: string) {
    const draft = editing[id]
    if (!draft?.label.trim()) return
    await updateItem(id, { label: draft.label.trim(), time_of_day: draft.time || null })
    cancelEdit(id)
    toast.success('Item updated')
  }

  async function handleAdd() {
    if (!addLabel.trim()) return
    setAdding(true)
    await addItem(addLabel.trim(), addTime || null)
    setAddLabel('')
    setAddTime('')
    setAdding(false)
    toast.success('Item added')
  }

  async function handleDelete(id: string) {
    await deleteItem(id)
    toast.success('Item removed')
  }

  if (!activeProfile) return null

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur"
        style={{ background: 'rgba(247,245,241,0.95)', borderBottom: '1px solid rgba(237,233,227,0.8)' }}
      >
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-warm-200 transition-colors"
            style={{ color: '#5B7B7A' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display text-lg font-semibold" style={{ color: '#33322E' }}>
            Daily Schedule Template
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {/* Explainer */}
        <p className="text-sm leading-relaxed" style={{ color: '#6B6860' }}>
          Build the typical routine for {activeProfile.name}. Each day on the dashboard,
          this template auto-populates as a checklist caregivers can mark Done, Skipped, or Changed.
        </p>

        {/* Item list */}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner className="w-6 h-6" /></div>
        ) : items.length === 0 ? (
          <div
            className="rounded-xl px-4 py-6 text-center"
            style={{ background: '#fff', border: '1px solid rgba(51,50,46,0.08)', boxShadow: '0 2px 8px rgba(51,50,46,0.06)' }}
          >
            <p className="text-sm text-gray-400">No items yet — add the first step below.</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid rgba(51,50,46,0.08)', boxShadow: '0 2px 8px rgba(51,50,46,0.06)' }}
          >
            {items.map((item, idx) => {
              const draft = editing[item.id]
              return (
                <div
                  key={item.id}
                  className="px-4 py-3"
                  style={{ borderBottom: idx < items.length - 1 ? '1px solid rgba(51,50,46,0.06)' : undefined }}
                >
                  {draft ? (
                    /* ── Edit mode ── */
                    <div className="flex items-center gap-2">
                      <TimeInput
                        value={draft.time}
                        onChange={v => setEditing(e => ({ ...e, [item.id]: { ...e[item.id], time: v } }))}
                      />
                      <input
                        type="text"
                        value={draft.label}
                        onChange={e => setEditing(prev => ({ ...prev, [item.id]: { ...prev[item.id], label: e.target.value } }))}
                        className="flex-1 text-sm px-2.5 py-1.5 rounded-lg outline-none"
                        style={{ border: '1px solid rgba(91,123,122,0.4)', color: '#33322E', background: '#fff' }}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit(item.id) }}
                      />
                      <button onClick={() => saveEdit(item.id)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#5B7B7A' }}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button onClick={() => cancelEdit(item.id)} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100">
                        <X className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    /* ── Display mode ── */
                    <div className="flex items-center gap-2">
                      {/* Reorder */}
                      {canEdit && (
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveItem(item.id, 'up')}
                            disabled={idx === 0}
                            className="w-5 h-4 flex items-center justify-center text-gray-300 disabled:opacity-20 hover:text-gray-500 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveItem(item.id, 'down')}
                            disabled={idx === items.length - 1}
                            className="w-5 h-4 flex items-center justify-center text-gray-300 disabled:opacity-20 hover:text-gray-500 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Time */}
                      <span className="w-12 text-[11px] font-data flex-shrink-0 text-right" style={{ color: '#9A9187' }}>
                        {item.time_of_day ?? ''}
                      </span>

                      {/* Label */}
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: '#33322E' }}>
                        {item.label}
                      </span>

                      {/* Actions */}
                      {canEdit && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(item.id, item.label, item.time_of_day)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-warm-100 transition-colors"
                            style={{ color: '#9A9187' }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                            style={{ color: '#C77B6A' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add item form */}
        {canEdit && (
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: '#fff', border: '1px solid rgba(51,50,46,0.08)', boxShadow: '0 2px 8px rgba(51,50,46,0.06)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9187' }}>Add item</p>
            <div className="flex items-center gap-2">
              <TimeInput value={addTime} onChange={setAddTime} />
              <input
                type="text"
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                placeholder="e.g. Breakfast, OT session…"
                className="flex-1 text-sm px-2.5 py-1.5 rounded-lg outline-none"
                style={{ border: '1px solid rgba(51,50,46,0.15)', color: '#33322E', background: '#fff' }}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              />
              <button
                onClick={handleAdd}
                disabled={!addLabel.trim() || adding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition disabled:opacity-50"
                style={{ background: '#5B7B7A' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
