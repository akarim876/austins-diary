import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Save, Trash2, MapPin, Clock, CalendarClock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import {
  ANTECEDENTS, BEHAVIORS, LOCATIONS,
  SEVERITY_LABELS, HELPED_OPTIONS,
} from '../../lib/behaviorConstants'
import { useDailySchedule } from '../../hooks/useDailySchedule'
import type { BehaviorLog } from '../../types'
import { Spinner } from '../ui/Spinner'
import { VoiceInput } from '../ui/VoiceInput'

const schema = z.object({
  entry_date:       z.string().min(1),
  time_of_day:      z.string().min(1, 'Time is required'),
  location:         z.string(),
  antecedent:       z.string().min(1, 'Select what triggered this'),
  antecedent_note:  z.string().max(500),
  behavior:         z.string().min(1, 'Select the behavior observed'),
  severity:         z.number().min(1).max(5),
  duration_mins:    z.number().min(0).nullable(),
  consequence:      z.string().max(2000),
  helped:           z.enum(['yes', 'somewhat', 'no']),
  schedule_item_id: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface Props {
  profileId: string
  date: string
  existingLog?: BehaviorLog | null
  /** Pre-fill the consequence/response field — used when opening from the global voice button */
  initialConsequence?: string
  onSaved: () => void
  onCancel: () => void
}

// Single-select chip row
function ChipRow({
  options, value, onChange,
}: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${
            value === opt
              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function BehaviorLogForm({ profileId, date, existingLog, initialConsequence, onSaved, onCancel }: Props) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedScheduleItemId, setSelectedScheduleItemId] = useState<string | null>(
    existingLog?.schedule_item_id ?? null
  )

  // Fetch today's schedule items so we can link one when antecedent = 'schedule change'
  const { items: scheduleItems } = useDailySchedule(profileId, date)

  const { register, handleSubmit, control, reset, watch, setValue, getValues, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        entry_date:       date,
        time_of_day:      nowTime(),
        location:         '',
        antecedent:       existingLog?.antecedent      ?? '',
        antecedent_note:  existingLog?.antecedent_note ?? '',
        behavior:         existingLog?.behavior        ?? '',
        severity:         existingLog?.severity        ?? 3,
        duration_mins:    existingLog?.duration_mins   ?? null,
        consequence:      existingLog?.consequence     ?? initialConsequence ?? '',
        helped:           existingLog?.helped          ?? 'somewhat',
        schedule_item_id: existingLog?.schedule_item_id ?? null,
      },
    })

  useEffect(() => {
    reset({
      entry_date:       date,
      time_of_day:      existingLog?.time_of_day ?? nowTime(),
      location:         existingLog?.location    ?? '',
      antecedent:       existingLog?.antecedent      ?? '',
      antecedent_note:  existingLog?.antecedent_note ?? '',
      behavior:         existingLog?.behavior        ?? '',
      severity:         existingLog?.severity        ?? 3,
      duration_mins:    existingLog?.duration_mins   ?? null,
      consequence:      existingLog?.consequence     ?? '',
      helped:           existingLog?.helped          ?? 'somewhat',
      schedule_item_id: existingLog?.schedule_item_id ?? null,
    })
    setSelectedScheduleItemId(existingLog?.schedule_item_id ?? null)
  }, [date, existingLog, reset])

  const severity = watch('severity')
  const antecedent = watch('antecedent')
  const behavior = watch('behavior')
  const helped = watch('helped')

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSubmitting(true)
    try {
      // Only include schedule_item_id when it has a value — omitting it entirely
      // avoids a Supabase schema-cache error if migration 016 hasn't been applied yet.
      const scheduleLink =
        antecedent === 'schedule change' && selectedScheduleItemId
          ? { schedule_item_id: selectedScheduleItemId }
          : {}

      if (existingLog) {
        const { error } = await supabase
          .from('behavior_logs')
          .update({
            time_of_day:     values.time_of_day,
            location:        values.location,
            antecedent:      values.antecedent,
            antecedent_note: values.antecedent_note,
            behavior:        values.behavior,
            severity:        values.severity,
            duration_mins:   values.duration_mins,
            consequence:     values.consequence,
            helped:          values.helped,
            ...scheduleLink,
          })
          .eq('id', existingLog.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('behavior_logs').insert({
          profile_id:      profileId,
          author_id:       user.id,
          entry_date:      values.entry_date,
          time_of_day:     values.time_of_day,
          location:        values.location,
          antecedent:      values.antecedent,
          antecedent_note: values.antecedent_note,
          behavior:        values.behavior,
          severity:        values.severity,
          duration_mins:   values.duration_mins,
          consequence:     values.consequence,
          helped:          values.helped,
          ...scheduleLink,
        })
        if (error) throw error
      }
      toast.success('Behavior log saved')
      onSaved()
    } catch (err) {
      console.error(err)
      toast.error(getErrorMessage(err, 'Failed to save'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!existingLog) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('behavior_logs').delete().eq('id', existingLog.id)
      if (error) throw error
      toast.success('Log deleted')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally {
      setDeleting(false)
    }
  }

  const severityMeta = SEVERITY_LABELS[severity] ?? SEVERITY_LABELS[3]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 space-y-6 pb-8">

      {/* ── Section 1: When & Where ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          When &amp; Where
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
              <Clock className="w-3 h-3" /> Time
            </label>
            <input
              type="time"
              {...register('time_of_day')}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
            {errors.time_of_day && (
              <p className="mt-1 text-xs text-red-500">{errors.time_of_day.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
            <input
              type="date"
              {...register('entry_date')}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
            <MapPin className="w-3 h-3" /> Location
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {LOCATIONS.map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setValue('location', loc)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                  watch('location') === loc
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type a location…"
            {...register('location')}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
          />
        </div>
      </section>

      {/* ── Section 2: Antecedent (A) ── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            A — What triggered it?
          </h3>
          {errors.antecedent && (
            <p className="text-xs text-red-500 mt-0.5">{errors.antecedent.message}</p>
          )}
        </div>

        <Controller
          name="antecedent"
          control={control}
          render={({ field }) => (
            <ChipRow options={ANTECEDENTS} value={field.value} onChange={field.onChange} />
          )}
        />

        {/* Schedule item link — shown only when antecedent is "schedule change" */}
        {antecedent === 'schedule change' && scheduleItems.length > 0 && (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'rgba(91,123,122,0.06)', border: '1px solid rgba(91,123,122,0.15)' }}
          >
            <label className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#5B7B7A' }}>
              <CalendarClock className="w-3.5 h-3.5" />
              Which schedule item changed? (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {scheduleItems.map(item => (
                <button
                  key={item.templateItemId}
                  type="button"
                  onClick={() =>
                    setSelectedScheduleItemId(
                      selectedScheduleItemId === item.entryId ? null : (item.entryId ?? null)
                    )
                  }
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedScheduleItemId && selectedScheduleItemId === item.entryId
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {item.time_of_day ? `${item.time_of_day} · ` : ''}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          {...register('antecedent_note')}
          rows={2}
          placeholder="More context about what happened before… (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
        />
      </section>

      {/* ── Section 3: Behavior (B) ── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            B — What happened?
          </h3>
          {errors.behavior && (
            <p className="text-xs text-red-500 mt-0.5">{errors.behavior.message}</p>
          )}
        </div>

        <Controller
          name="behavior"
          control={control}
          render={({ field }) => (
            <ChipRow options={BEHAVIORS} value={field.value} onChange={field.onChange} />
          )}
        />

        {/* Severity slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Severity</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityMeta.bg} ${severityMeta.color}`}>
              {severity} — {severityMeta.label}
            </span>
          </div>
          <Controller
            name="severity"
            control={control}
            render={({ field }) => (
              <input
                type="range"
                min={1} max={5} step={1}
                value={field.value}
                onChange={e => field.onChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
                style={{
                  background: `linear-gradient(to right,
                    #10b981 0%,
                    #84cc16 25%,
                    #eab308 50%,
                    #f97316 75%,
                    #ef4444 100%)`
                }}
              />
            )}
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
            <span>1 Mild</span>
            <span>3 Moderate</span>
            <span>5 Severe</span>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Duration <span className="text-gray-400">(minutes, optional)</span>
          </label>
          <Controller
            name="duration_mins"
            control={control}
            render={({ field }) => (
              <input
                type="number"
                min={0}
                max={999}
                placeholder="e.g. 5"
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
              />
            )}
          />
        </div>
      </section>

      {/* ── Section 4: Consequence (C) ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          C — How did you respond?
        </h3>

        <textarea
          {...register('consequence')}
          rows={3}
          placeholder="What was your response or intervention? (e.g. offered sensory break, moved to quiet room…)"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
        />
        <div className="mt-2">
          <VoiceInput
            onTranscribed={(text) => {
              const current = getValues('consequence')
              setValue('consequence', current ? `${current}\n${text}` : text)
            }}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Did the response help?</p>
          <div className="flex gap-2">
            {HELPED_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('helped', opt.value)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  helped === opt.value
                    ? opt.color + ' border-current'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1">
        {existingLog && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-3 rounded-xl border border-red-100 text-red-500 text-sm hover:bg-red-50 transition flex items-center gap-1.5"
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
          type="submit"
          disabled={submitting || !antecedent || !behavior}
          className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:bg-amber-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Spinner className="w-4 h-4" /> : <><Save className="w-4 h-4" /> Save log</>}
        </button>
      </div>
    </form>
  )
}
