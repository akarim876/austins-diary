/**
 * Log form for a custom tracker — adapts its UI to the tracker type:
 *   duration → manual minutes input + optional live timer
 *   counter  → increment / decrement tally
 *   yes_no   → Yes / No toggle
 *   rating   → 1–5 picker
 *
 * All types share a date field and optional notes.
 */

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Minus, Plus, Save, Trash2, Timer, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { getTrackerIcon, trackerIconBg, formatTrackerValue } from '../../lib/trackerIcons'
import { Spinner } from '../ui/Spinner'
import type { CustomTracker, CustomTrackerLog } from '../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDate() { return format(new Date(), 'yyyy-MM-dd') }

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tracker:     CustomTracker
  profileId:   string
  date?:       string
  existingLog?: CustomTrackerLog | null
  onSaved:     () => void
  onCancel:    () => void
}

export function CustomTrackerLogForm({
  tracker, profileId, date: dateProp, existingLog, onSaved, onCancel,
}: Props) {
  const { user } = useAuth()
  const Icon = getTrackerIcon(tracker.icon_name)

  // Shared state
  const [entryDate, setEntryDate] = useState(dateProp ?? existingLog?.entry_date ?? todayDate())
  const [notes,     setNotes]     = useState(existingLog?.notes ?? '')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  // ── Duration ──
  const [durationMins, setDurationMins] = useState<string>(
    existingLog?.duration_minutes != null ? String(existingLog.duration_minutes) : '',
  )
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart,   setTimerStart]   = useState<number | null>(null)
  const [elapsed,      setElapsed]      = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startTimer() {
    const now = Date.now()
    setTimerStart(now)
    setTimerRunning(true)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(Date.now() - now), 500)
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(false)
    if (timerStart) {
      const mins = Math.round((Date.now() - timerStart) / 60_000)
      setDurationMins(String(Math.max(1, mins)))
    }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── Counter ──
  const [counterValue, setCounterValue] = useState(existingLog?.counter_value ?? 0)

  // ── Yes/No ──
  const [yesNoValue, setYesNoValue] = useState<boolean | null>(
    existingLog?.yes_no_value ?? null,
  )

  // ── Rating ──
  const [ratingValue, setRatingValue] = useState<number | null>(
    existingLog?.rating_value ?? null,
  )

  // ─── Validation ─────────────────────────────────────────────────────────────

  function isValid(): boolean {
    switch (tracker.tracker_type) {
      case 'duration': return durationMins !== '' && Number(durationMins) > 0
      case 'counter':  return true
      case 'yes_no':   return yesNoValue !== null
      case 'rating':   return ratingValue !== null
    }
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user || !isValid()) return
    setSaving(true)
    try {
      const payload = {
        tracker_id:       tracker.id,
        profile_id:       profileId,
        author_id:        user.id,
        entry_date:       entryDate,
        notes:            notes || null,
        duration_minutes: tracker.tracker_type === 'duration' ? Number(durationMins) : null,
        counter_value:    tracker.tracker_type === 'counter'  ? counterValue         : null,
        yes_no_value:     tracker.tracker_type === 'yes_no'   ? yesNoValue           : null,
        rating_value:     tracker.tracker_type === 'rating'   ? ratingValue          : null,
        updated_at:       new Date().toISOString(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = supabase.from('custom_tracker_logs') as any
      if (existingLog) {
        const { error } = await tbl.update(payload).eq('id', existingLog.id)
        if (error) throw error
      } else {
        const { error } = await tbl.insert(payload)
        if (error) throw error
      }

      toast.success(existingLog ? 'Log updated' : 'Logged!')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existingLog) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('custom_tracker_logs')
        .delete()
        .eq('id', existingLog.id)
      if (error) throw error
      toast.success('Log deleted')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const accentBg = trackerIconBg(tracker.color)

  return (
    <div className="px-4 py-5 space-y-6 pb-8">

      {/* Tracker header */}
      <div className="flex items-center gap-3">
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg }}
        >
          <Icon className="w-5 h-5" style={{ color: tracker.color }} />
        </span>
        <div>
          <p className="font-bold text-gray-900 text-base">{tracker.name}</p>
          <p className="text-xs text-gray-400 capitalize">{tracker.tracker_type.replace('_', ' ')} tracker</p>
        </div>
      </div>

      {/* ── Type-specific input ── */}
      {tracker.tracker_type === 'duration' && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Time</h3>

          {/* Manual minutes */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="Minutes"
              value={durationMins}
              onChange={e => setDurationMins(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition"
              style={{ '--tw-ring-color': tracker.color } as React.CSSProperties}
              disabled={timerRunning}
            />
            <span className="text-sm text-gray-500">min</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            {!timerRunning ? (
              <button
                type="button"
                onClick={startTimer}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition"
                style={{ background: accentBg, color: tracker.color }}
              >
                <Timer className="w-4 h-4" />
                Start timer
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stopTimer}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-500 transition"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
                <span className="text-sm font-mono text-gray-700 tabular-nums">
                  {formatElapsed(elapsed)}
                </span>
              </>
            )}
          </div>

          {durationMins && !timerRunning && (
            <p className="text-sm font-medium" style={{ color: tracker.color }}>
              {formatTrackerValue('duration', { duration_minutes: Number(durationMins) })}
            </p>
          )}
        </section>
      )}

      {tracker.tracker_type === 'counter' && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Count</h3>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCounterValue(v => Math.max(0, v - 1))}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span
              className="text-4xl font-bold tabular-nums min-w-[2ch] text-center"
              style={{ color: tracker.color }}
            >
              {counterValue}
            </span>
            <button
              type="button"
              onClick={() => setCounterValue(v => v + 1)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white active:scale-95 transition"
              style={{ background: tracker.color }}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}

      {tracker.tracker_type === 'yes_no' && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Answer</h3>
          <div className="flex gap-3">
            {([true, false] as const).map(val => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setYesNoValue(val)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition"
                style={
                  yesNoValue === val
                    ? { background: tracker.color, borderColor: tracker.color, color: '#fff' }
                    : { background: 'transparent', borderColor: '#e5e7eb', color: '#6b7280' }
                }
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </section>
      )}

      {tracker.tracker_type === 'rating' && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Rating</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRatingValue(n)}
                className="flex-1 aspect-square rounded-2xl text-lg font-bold border-2 transition active:scale-95"
                style={
                  ratingValue === n
                    ? { background: tracker.color, borderColor: tracker.color, color: '#fff' }
                    : ratingValue != null && n <= ratingValue
                      ? { background: accentBg, borderColor: tracker.color, color: tracker.color }
                      : { background: 'transparent', borderColor: '#e5e7eb', color: '#9ca3af' }
                }
              >
                {n}
              </button>
            ))}
          </div>
          {ratingValue && (
            <p className="text-sm font-medium" style={{ color: tracker.color }}>
              {ratingValue}/5
            </p>
          )}
        </section>
      )}

      {/* ── Date ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Date</h3>
        <input
          type="date"
          value={entryDate}
          onChange={e => setEntryDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition"
        />
      </section>

      {/* ── Notes ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Notes <span className="normal-case text-gray-300 font-normal">(optional)</span></h3>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional context…"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition resize-none"
        />
      </section>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        {existingLog && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-100 text-red-500 text-sm font-medium hover:bg-red-50 transition"
          >
            {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        )}
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
          disabled={saving || !isValid()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
          style={{ background: tracker.color }}
        >
          {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {existingLog ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  )
}
