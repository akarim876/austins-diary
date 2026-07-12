/**
 * Shared form for "Supplements" and "Medications" log types.
 * Items start unchecked for new entries; existing entries are pre-populated
 * and support editing or deletion.
 */
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../contexts/ProfileContext'
import { useAuth } from '../../contexts/AuthContext'
import type { DietLog } from '../../types'
import { Spinner } from '../ui/Spinner'

interface ChecklistLogFormProps {
  logType: 'supplements' | 'medications'
  items: string[]
  existingLog?: DietLog | null
  date?: Date
  onSaved?: (log?: DietLog) => void
  onCancel?: () => void
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ChecklistLogForm({
  logType,
  items,
  existingLog,
  date = new Date(),
  onSaved,
  onCancel,
}: ChecklistLogFormProps) {
  const { activeProfile: profile } = useProfile()
  const { user } = useAuth()

  const isEditing = !!existingLog

  // Pre-populate from existing log, otherwise all unchecked
  function initChecked(): Set<string> {
    if (!existingLog) return new Set()
    const checked =
      logType === 'supplements'
        ? existingLog.supplements_checked
        : existingLog.medications_checked
    return new Set(checked ?? [])
  }

  const [timeStr, setTimeStr] = useState(
    existingLog?.time_of_day?.slice(0, 5) ?? nowTime()
  )
  const [checked, setChecked] = useState<Set<string>>(initChecked)
  const [notes, setNotes] = useState(existingLog?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const label = logType === 'supplements' ? 'Supplements' : 'Medications'
  const accentBg = logType === 'supplements' ? 'bg-teal-100' : 'bg-purple-100'
  const accentText = logType === 'supplements' ? 'text-teal-700' : 'text-purple-700'
  const accentBorder = logType === 'supplements' ? 'border-teal-300' : 'border-purple-300'
  const accentFill = logType === 'supplements' ? 'bg-teal-500' : 'bg-purple-500'
  const saveBg = logType === 'supplements' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-purple-600 hover:bg-purple-700'

  // Merge the configured list with any items that were in the existing log
  // (so previously logged items still appear even if the settings list changed)
  const allItems = isEditing
    ? Array.from(new Set([...items, ...(initChecked())]))
    : items

  function toggle(item: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  async function handleSave() {
    if (!profile || !user) return
    setSaving(true)

    const omitted = allItems.filter(i => !checked.has(i))

    const payload: Record<string, unknown> = {
      profile_id: profile.id,
      author_id: user.id,
      entry_date: format(date, 'yyyy-MM-dd'),
      time_of_day: timeStr,
      log_type: logType,
      notes,
    }

    if (logType === 'supplements') {
      payload.supplements_checked = [...checked]
      payload.supplements_omitted = omitted
    } else {
      payload.medications_checked = [...checked]
      payload.medications_omitted = omitted
    }

    let data: DietLog | undefined
    let error: unknown

    if (isEditing) {
      const result = await supabase
        .from('diet_logs')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(payload as any)
        .eq('id', existingLog!.id)
        .select()
        .single()
      data = result.data as DietLog
      error = result.error
    } else {
      const result = await supabase
        .from('diet_logs')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any)
        .select()
        .single()
      data = result.data as DietLog
      error = result.error
    }

    setSaving(false)
    if (error) {
      toast.error(`Failed to save ${label.toLowerCase()} log`)
      return
    }
    toast.success(isEditing ? `${label} updated` : `${label} logged`)
    onSaved?.(data)
  }

  async function handleDelete() {
    if (!existingLog) return
    setDeleting(true)
    const { error } = await supabase
      .from('diet_logs')
      .delete()
      .eq('id', existingLog.id)
    setDeleting(false)
    if (error) {
      toast.error(`Failed to delete ${label.toLowerCase()} log`)
      return
    }
    toast.success(`${label} log deleted`)
    onSaved?.()
  }

  const noneConfigured = allItems.length === 0

  return (
    <div className="px-4 pt-2 pb-6 space-y-5">
      {/* Header */}
      <div className={`rounded-xl p-3 ${accentBg} flex items-center gap-2`}>
        <span className={`font-semibold ${accentText}`}>
          {isEditing ? `Edit ${label}` : label}
        </span>
        {!isEditing && (
          <span className={`text-xs ${accentText} opacity-75`}>
            — tap each item taken
          </span>
        )}
      </div>

      {/* Time */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Time</label>
        <input
          type="time"
          value={timeStr}
          onChange={e => setTimeStr(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-full"
        />
      </div>

      {/* Checklist */}
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">
          {noneConfigured
            ? `No ${label.toLowerCase()} configured yet`
            : `Mark what was taken (${checked.size} / ${allItems.length})`}
        </p>
        {noneConfigured ? (
          <p className="text-xs text-stone-400">
            Add items in Settings → Diet first.
          </p>
        ) : (
          <div className={`border ${accentBorder} rounded-xl overflow-hidden divide-y divide-stone-100`}>
            {allItems.map(item => {
              const on = checked.has(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${on ? accentBg : 'bg-white hover:bg-stone-50'}`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${on ? `${accentFill} border-transparent` : 'border-stone-300'}`}
                  >
                    {on && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm ${on ? accentText + ' font-medium' : 'text-stone-700'}`}>
                    {item}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any observations or reactions…"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition flex items-center justify-center"
          >
            {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-600 text-sm font-medium"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!isEditing && noneConfigured)}
          className={`flex-1 py-3 rounded-xl text-white text-sm font-semibold ${saveBg} disabled:opacity-50 transition`}
        >
          {saving ? 'Saving…' : isEditing ? `Update ${label}` : `Save ${label}`}
        </button>
      </div>
    </div>
  )
}
