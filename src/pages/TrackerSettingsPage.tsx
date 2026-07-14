/**
 * Settings page for managing custom trackers.
 * Allows creating, editing, and archiving custom trackers for the active child profile.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, Edit2, Plus, RotateCcw, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { useAllCustomTrackers } from '../hooks/useCustomTrackers'
import { getErrorMessage } from '../lib/errors'
import {
  TRACKER_ICON_MAP,
  TRACKER_ICON_NAMES,
  TRACKER_COLORS,
  TRACKER_TYPE_OPTIONS,
  trackerTypeLabel,
  getTrackerIcon,
  trackerIconBg,
} from '../lib/trackerIcons'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import type { CustomTracker, TrackerType } from '../types'

// ─── Tracker form (create / edit) ────────────────────────────────────────────

interface TrackerFormProps {
  profileId:  string
  existing?:  CustomTracker | null
  onSaved:    () => void
  onCancel:   () => void
}

function TrackerForm({ profileId, existing, onSaved, onCancel }: TrackerFormProps) {
  const { user } = useAuth()
  const [name,     setName]     = useState(existing?.name         ?? '')
  const [iconName, setIconName] = useState(existing?.icon_name    ?? 'star')
  const [color,    setColor]    = useState(existing?.color        ?? '#5B7B7A')
  const [type,     setType]     = useState<TrackerType>(existing?.tracker_type ?? 'counter')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    if (!name.trim() || !user) return
    setSaving(true)
    try {
      const payload = {
        profile_id:   profileId,
        name:         name.trim(),
        icon_name:    iconName,
        color,
        tracker_type: type,
        updated_at:   new Date().toISOString(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = supabase.from('custom_trackers') as any
      if (existing) {
        const { error } = await tbl.update(payload).eq('id', existing.id)
        if (error) throw error
        toast.success('Tracker updated')
      } else {
        const { error } = await tbl.insert({ ...payload, sort_order: 0 })
        if (error) throw error
        toast.success('Tracker created')
      }
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const PreviewIcon = getTrackerIcon(iconName)

  return (
    <div className="px-4 py-5 space-y-6 pb-8">

      {/* Name */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Tracker name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='e.g. "Screen Time" or "Meltdowns"'
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
          autoFocus
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Type
        </label>
        <div className="space-y-2">
          {TRACKER_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition"
              style={
                type === opt.id
                  ? { borderColor: color, background: trackerIconBg(color) }
                  : { borderColor: '#e5e7eb', background: 'transparent' }
              }
            >
              <div className="flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: type === opt.id ? color : '#33322E' }}
                >
                  {opt.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
              </div>
              {type === opt.id && (
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {TRACKER_ICON_NAMES.map(key => {
            const Ic = TRACKER_ICON_MAP[key]
            const active = key === iconName
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIconName(key)}
                className="w-10 h-10 rounded-xl flex items-center justify-center border-2 transition"
                style={
                  active
                    ? { borderColor: color, background: trackerIconBg(color), color }
                    : { borderColor: '#e5e7eb', background: '#f9fafb', color: '#6b7280' }
                }
                aria-label={key}
              >
                <Ic className="w-5 h-5" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {TRACKER_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full border-2 transition"
              style={{
                background: c,
                borderColor: color === c ? '#33322E' : 'transparent',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-warm-200">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: trackerIconBg(color) }}
        >
          <PreviewIcon className="w-5 h-5" style={{ color }} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name || 'Tracker name'}</p>
          <p className="text-xs text-gray-400">{trackerTypeLabel(type)} tracker</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
          style={{ background: color }}
        >
          {saving ? <Spinner className="w-4 h-4" /> : null}
          {existing ? 'Save changes' : 'Create tracker'}
        </button>
      </div>
    </div>
  )
}

// ─── Tracker row ─────────────────────────────────────────────────────────────

interface TrackerRowProps {
  tracker:    CustomTracker
  onEdit:     () => void
  onArchive:  () => void
  onRestore:  () => void
}

function TrackerRow({ tracker, onEdit, onArchive, onRestore }: TrackerRowProps) {
  const Icon = getTrackerIcon(tracker.icon_name)
  const bg   = trackerIconBg(tracker.color)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${tracker.archived ? 'opacity-50' : ''}`}>
      <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon className="w-4 h-4" style={{ color: tracker.color }} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{tracker.name}</p>
        <p className="text-xs text-gray-400">{trackerTypeLabel(tracker.tracker_type)}</p>
      </div>
      {tracker.archived ? (
        <button
          type="button"
          onClick={onRestore}
          className="p-2 rounded-lg text-brand-500 hover:bg-brand-50 transition"
          aria-label="Restore tracker"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
            aria-label="Edit tracker"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="p-2 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition"
            aria-label="Archive tracker"
          >
            <Archive className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TrackerSettingsPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const { trackers, loading, refetch } = useAllCustomTrackers(activeProfile?.id ?? null)

  const [sheetOpen, setSheetOpen]   = useState(false)
  const [editing,   setEditing]     = useState<CustomTracker | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  if (!activeProfile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">No child profile selected</p>
      </div>
    )
  }

  const active   = trackers.filter(t => !t.archived)
  const archived = trackers.filter(t => t.archived)

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(t: CustomTracker) {
    setEditing(t)
    setSheetOpen(true)
  }

  async function archiveTracker(t: CustomTracker) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('custom_trackers') as any)
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', t.id)
    if (error) toast.error(getErrorMessage(error))
    else { toast.success(`"${t.name}" archived`); refetch() }
  }

  async function restoreTracker(t: CustomTracker) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('custom_trackers') as any)
      .update({ archived: false, updated_at: new Date().toISOString() })
      .eq('id', t.id)
    if (error) toast.error(getErrorMessage(error))
    else { toast.success(`"${t.name}" restored`); refetch() }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-2 border-b border-warm-200"
        style={{ background: 'var(--color-background-blur)', backdropFilter: 'blur(12px)' }}
      >
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-lg text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Settings className="w-4 h-4 text-gray-400" />
        <h1 className="font-bold text-gray-900 flex-1">Custom Trackers</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">

        {/* Info */}
        <p className="text-sm text-gray-500 leading-relaxed">
          Custom trackers let you log anything that matters for {activeProfile.name} —
          duration, counts, yes/no answers, or ratings. All caregivers share the same
          trackers and can log against them.
        </p>

        {/* Active trackers */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Active trackers
          </h2>
          <div
            className="bg-white rounded-xl shadow-sm overflow-hidden"
            style={{ border: '1px solid var(--color-accent-200)' }}
          >
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-gray-300" />
              </div>
            ) : active.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No trackers yet.</p>
                <button
                  onClick={openCreate}
                  className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--color-accent)' }}
                >
                  <Plus className="w-4 h-4" />
                  Create your first tracker
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-warm-100">
                {active.map(t => (
                  <li key={t.id}>
                    <TrackerRow
                      tracker={t}
                      onEdit={() => openEdit(t)}
                      onArchive={() => archiveTracker(t)}
                      onRestore={() => restoreTracker(t)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* Add another */}
            {!loading && (
              <button
                onClick={openCreate}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition border-t border-warm-100"
                style={{ color: 'var(--color-accent)' }}
              >
                <Plus className="w-4 h-4" />
                Add tracker
              </button>
            )}
          </div>
        </section>

        {/* Archived trackers */}
        {archived.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setShowArchived(v => !v)}
              className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1 w-full text-left flex items-center justify-between"
            >
              <span>Archived ({archived.length})</span>
              <span className="text-gray-300">{showArchived ? '▲' : '▼'}</span>
            </button>
            {showArchived && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-warm-200">
                <ul className="divide-y divide-warm-100">
                  {archived.map(t => (
                    <li key={t.id}>
                      <TrackerRow
                        tracker={t}
                        onEdit={() => openEdit(t)}
                        onArchive={() => archiveTracker(t)}
                        onRestore={() => restoreTracker(t)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Create / edit sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? `Edit: ${editing.name}` : 'New tracker'}
      >
        <TrackerForm
          profileId={activeProfile.id}
          existing={editing}
          onSaved={() => { setSheetOpen(false); refetch() }}
          onCancel={() => setSheetOpen(false)}
        />
      </BottomSheet>
    </div>
  )
}
