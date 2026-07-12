import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { ChevronDown, ChevronUp, Moon, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { Spinner } from '../ui/Spinner'
import {
  SLEEP_QUALITY_OPTIONS, WAKING_CAUSES,
  calcSleepMinutes, formatDuration, calcNapMinutes,
} from '../../lib/sleepConstants'
import type { NightWaking, Nap, SleepLog } from '../../types'

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the "relevant" sleep date: yesterday if before noon, today otherwise. */
function defaultSleepDate(): string {
  const now = new Date()
  return format(now.getHours() < 12 ? subDays(now, 1) : now, 'yyyy-MM-dd')
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props {
  profileId: string
  existingLog?: SleepLog | null
  onSaved: () => void
  onCancel: () => void
}

export function SleepLogForm({ profileId, existingLog, onSaved, onCancel }: Props) {
  const { user } = useAuth()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [logDate,     setLogDate]     = useState(existingLog?.log_date ?? defaultSleepDate())
  const [bedtime,     setBedtime]     = useState(existingLog?.bedtime  ?? '')
  const [wakeTime,    setWakeTime]    = useState(existingLog?.wake_time ?? '')
  const [quality,     setQuality]     = useState<number | null>(existingLog?.sleep_quality ?? null)
  const [wakingsCount, setWakingsCount] = useState(existingLog?.night_wakings_count ?? 0)
  const [wakings,     setWakings]     = useState<NightWaking[]>(existingLog?.night_wakings_detail ?? [])
  const [wakingsOpen, setWakingsOpen] = useState(false)
  const [napEnabled,  setNapEnabled]  = useState(existingLog?.nap_enabled ?? false)
  const [naps,        setNaps]        = useState<Nap[]>(existingLog?.naps?.length ? existingLog.naps : [{ start_time: '', end_time: '' }])
  const [notes,       setNotes]       = useState(existingLog?.notes ?? '')
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isDraft = !bedtime || !wakeTime
  const totalMins = !isDraft ? calcSleepMinutes(bedtime, wakeTime) : null
  const totalNapMins = naps.reduce((acc, n) => {
    if (n.start_time && n.end_time) acc += calcNapMinutes(n.start_time, n.end_time)
    return acc
  }, 0)

  // ── Waking helpers ───────────────────────────────────────────────────────────
  function syncWakings(count: number) {
    setWakingsCount(count)
    setWakings(prev => {
      if (count > prev.length) {
        const toAdd = count - prev.length
        return [...prev, ...Array.from({ length: toAdd }, () => ({ duration_minutes: null, cause: 'Unknown', cause_other: '' }))]
      }
      return prev.slice(0, count)
    })
    if (count > 0) setWakingsOpen(true)
  }

  function updateWaking(idx: number, patch: Partial<NightWaking>) {
    setWakings(prev => prev.map((w, i) => i === idx ? { ...w, ...patch } : w))
  }

  // ── Nap helpers ──────────────────────────────────────────────────────────────
  function updateNap(idx: number, patch: Partial<Nap>) {
    setNaps(prev => prev.map((n, i) => i === idx ? { ...n, ...patch } : n))
  }

  function addNap() {
    setNaps(prev => [...prev, { start_time: '', end_time: '' }])
  }

  function removeNap(idx: number) {
    setNaps(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        profile_id:            profileId,
        author_id:             user.id,
        log_date:              logDate,
        bedtime:               bedtime || null,
        wake_time:             wakeTime || null,
        total_sleep_minutes:   totalMins ?? null,
        night_wakings_count:   wakingsCount,
        night_wakings_detail:  wakings,
        sleep_quality:         quality,
        nap_enabled:           napEnabled,
        naps:                  napEnabled ? naps.filter(n => n.start_time || n.end_time) : [],
        notes:                 notes.trim() || null,
      }

      if (existingLog) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('sleep_logs').update(payload as any).eq('id', existingLog.id)
        if (error) throw error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('sleep_logs')
          .upsert({ ...payload, id: crypto.randomUUID() } as any, { onConflict: 'profile_id,log_date' })
        if (error) throw error
      }

      toast.success(isDraft ? 'Draft saved' : 'Sleep log saved')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save sleep log'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existingLog) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('sleep_logs').delete().eq('id', existingLog.id)
      if (error) throw error
      toast.success('Sleep log deleted')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-2 pb-6 space-y-5">

      {/* Draft notice */}
      {existingLog && isDraft && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200">
          <Moon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <p className="text-xs text-indigo-700">Draft — fill in the missing time to complete this entry.</p>
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Night of
        </label>
        <input
          type="date"
          value={logDate}
          onChange={e => setLogDate(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
        />
      </div>

      {/* Bedtime + Wake time */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Sleep window
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bedtime</label>
            <input
              type="time"
              value={bedtime}
              onChange={e => setBedtime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wake time</label>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
            />
          </div>
        </div>
        {totalMins !== null && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
            <p className="text-xs font-semibold text-indigo-700">
              Total sleep: {formatDuration(totalMins)}
            </p>
          </div>
        )}
      </div>

      {/* Sleep quality */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Sleep quality
        </label>
        <div className="flex gap-2 flex-wrap">
          {SLEEP_QUALITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setQuality(q => q === opt.value ? null : opt.value)}
              className={`flex-1 min-w-[60px] py-2 rounded-xl border text-xs font-semibold transition-all ${
                quality === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-indigo-400'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Night wakings */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Night wakings
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => syncWakings(Math.max(0, wakingsCount - 1))}
              className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 text-lg font-bold hover:bg-gray-50 transition flex items-center justify-center"
            >−</button>
            <span className="w-8 text-center font-semibold text-gray-900">{wakingsCount}</span>
            <button
              type="button"
              onClick={() => syncWakings(wakingsCount + 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 text-lg font-bold hover:bg-gray-50 transition flex items-center justify-center"
            >+</button>
          </div>
          {wakingsCount > 0 && (
            <button
              type="button"
              onClick={() => setWakingsOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition"
            >
              {wakingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {wakingsOpen ? 'Hide details' : 'Add details'}
            </button>
          )}
        </div>

        {/* Waking detail rows */}
        {wakingsOpen && wakings.map((w, idx) => (
          <div key={idx} className="mt-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
            <p className="text-xs font-semibold text-indigo-700">Waking {idx + 1}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="—"
                  value={w.duration_minutes ?? ''}
                  onChange={e => updateWaking(idx, { duration_minutes: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Cause</label>
                <select
                  value={w.cause}
                  onChange={e => updateWaking(idx, { cause: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white"
                >
                  {WAKING_CAUSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {w.cause === 'Other' && (
              <input
                type="text"
                placeholder="Describe…"
                value={w.cause_other ?? ''}
                onChange={e => updateWaking(idx, { cause_other: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
            )}
          </div>
        ))}
      </div>

      {/* Nap(s) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Nap(s)
          </label>
          <button
            type="button"
            onClick={() => setNapEnabled(n => !n)}
            className={`relative w-10 h-5 rounded-full transition-colors ${napEnabled ? 'bg-indigo-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${napEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {napEnabled && (
          <div className="space-y-2">
            {naps.map((nap, idx) => {
              const napMins = nap.start_time && nap.end_time ? calcNapMinutes(nap.start_time, nap.end_time) : null
              return (
                <div key={idx} className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-indigo-700">
                      Nap {idx + 1}
                      {napMins !== null && napMins > 0 && (
                        <span className="ml-2 text-indigo-500 font-normal">({formatDuration(napMins)})</span>
                      )}
                    </p>
                    {naps.length > 1 && (
                      <button type="button" onClick={() => removeNap(idx)} className="text-gray-400 hover:text-red-500 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Start</label>
                      <input type="time" value={nap.start_time ?? ''}
                        onChange={e => updateNap(idx, { start_time: e.target.value || null })}
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">End</label>
                      <input type="time" value={nap.end_time ?? ''}
                        onChange={e => updateNap(idx, { end_time: e.target.value || null })}
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {totalNapMins > 0 && (
              <p className="text-xs text-indigo-600 font-medium px-1">
                Total nap time: {formatDuration(totalNapMins)}
              </p>
            )}
            <button type="button" onClick={addNap}
              className="w-full py-2 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 text-xs font-semibold hover:border-indigo-400 hover:bg-indigo-50 transition">
              + Add another nap
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Notes (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Anything else notable about this night…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {existingLog && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Spinner className="w-4 h-4" /> : isDraft ? 'Save draft' : 'Save'}
        </button>
      </div>
    </div>
  )
}
