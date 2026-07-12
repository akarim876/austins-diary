import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useProfile } from '../contexts/ProfileContext'
import { useScheduleTemplate } from '../hooks/useScheduleTemplate'
import { useMyRole, canCreate } from '../hooks/useMyRole'
import { Spinner } from '../components/ui/Spinner'
import type { ScheduleTemplateItem } from '../types'
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

// ─── Single sortable row ───────────────────────────────────────────────────────

interface SortableItemProps {
  item: ScheduleTemplateItem
  isLast: boolean
  draft: EditState | undefined
  canEdit: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onChangeDraft: (patch: Partial<EditState>) => void
  onDelete: () => void
  /** True while this specific item is being dragged (used in DragOverlay clone) */
  isOverlay?: boolean
}

function SortableRow({
  item, isLast, draft, canEdit,
  onStartEdit, onCancelEdit, onSaveEdit, onChangeDraft, onDelete,
  isOverlay = false,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // While being dragged (the placeholder), fade it out so only the overlay is visible
    opacity: isDragging && !isOverlay ? 0.35 : 1,
    borderBottom: isLast ? undefined : '1px solid rgba(51,50,46,0.06)',
    background: '#fff',
    position: 'relative',
    zIndex: isOverlay ? 50 : undefined,
    // Subtle lift for the overlay clone
    boxShadow: isOverlay ? '0 8px 24px rgba(51,50,46,0.18)' : undefined,
    borderRadius: isOverlay ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="px-3 py-3">
      {draft ? (
        /* ── Edit mode ── */
        <div className="flex items-center gap-2">
          <TimeInput
            value={draft.time}
            onChange={v => onChangeDraft({ time: v })}
          />
          <input
            type="text"
            value={draft.label}
            onChange={e => onChangeDraft({ label: e.target.value })}
            className="flex-1 text-sm px-2.5 py-1.5 rounded-lg outline-none"
            style={{ border: '1px solid rgba(91,123,122,0.4)', color: '#33322E', background: '#fff' }}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
          <button
            onClick={onSaveEdit}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#5B7B7A' }}
          >
            <Check className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={onCancelEdit}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      ) : (
        /* ── Display mode ── */
        <div className="flex items-center gap-2">
          {/* Drag handle — only the handle starts a drag; tapping the row itself edits */}
          {canEdit && (
            <button
              type="button"
              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg cursor-grab active:cursor-grabbing touch-none"
              style={{ color: '#C8C3BC' }}
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          {/* Time */}
          <span
            className="w-12 text-[11px] font-data flex-shrink-0 text-right"
            style={{ color: '#9A9187' }}
          >
            {item.time_of_day ?? ''}
          </span>

          {/* Label */}
          <span className="flex-1 text-sm font-medium truncate" style={{ color: '#33322E' }}>
            {item.label}
          </span>

          {/* Edit / delete */}
          {canEdit && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onStartEdit}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-warm-100 transition-colors"
                style={{ color: '#9A9187' }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ScheduleSettingsPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const myRole = useMyRole(activeProfile?.id ?? null)
  const { items, loading, addItem, updateItem, deleteItem, reorderItems } =
    useScheduleTemplate(activeProfile?.id ?? null)

  const canEdit = canCreate(myRole)

  const [editing, setEditing] = useState<Record<string, EditState>>({})
  const [addLabel, setAddLabel] = useState('')
  const [addTime, setAddTime]   = useState('')
  const [adding, setAdding]     = useState(false)

  // Track which item id is currently being dragged (to render the overlay)
  const [activeId, setActiveId] = useState<string | null>(null)

  // ── Sensors ──────────────────────────────────────────────────────────────
  // MouseSensor: drag starts after 5 px of movement → normal clicks pass through
  // TouchSensor: drag starts after 200 ms hold with max 5 px movement tolerance
  //   → quick taps for edit/delete are never hijacked
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  )

  // ── Edit helpers ──────────────────────────────────────────────────────────
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

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const newOrder = arrayMove(items, oldIndex, newIndex).map(i => i.id)
    await reorderItems(newOrder)
  }

  if (!activeProfile) return null

  const activeItem = activeId ? items.find(i => i.id === activeId) : null

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
          {canEdit && (
            <span className="block mt-1" style={{ color: '#9A9187' }}>
              Drag the <GripVertical className="inline w-3.5 h-3.5 mb-0.5" /> handle to reorder items.
            </span>
          )}
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(51,50,46,0.08)', boxShadow: '0 2px 8px rgba(51,50,46,0.06)' }}
              >
                {items.map((item, idx) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    isLast={idx === items.length - 1}
                    draft={editing[item.id]}
                    canEdit={canEdit}
                    onStartEdit={() => startEdit(item.id, item.label, item.time_of_day)}
                    onCancelEdit={() => cancelEdit(item.id)}
                    onSaveEdit={() => saveEdit(item.id)}
                    onChangeDraft={patch =>
                      setEditing(e => ({ ...e, [item.id]: { ...e[item.id], ...patch } }))
                    }
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Floating drag ghost — shown above everything while dragging */}
            <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }}>
              {activeItem && (
                <SortableRow
                  item={activeItem}
                  isLast={false}
                  draft={undefined}
                  canEdit={canEdit}
                  onStartEdit={() => {}}
                  onCancelEdit={() => {}}
                  onSaveEdit={() => {}}
                  onChangeDraft={() => {}}
                  onDelete={() => {}}
                  isOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
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
