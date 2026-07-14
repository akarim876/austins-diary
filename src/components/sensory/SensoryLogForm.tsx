import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Save, Trash2, MapPin, Clock, Link2, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import {
  REGULATION_ZONES,
  SENSORY_TRIGGERS,
  CALMING_STRATEGIES,
  HELPED_OPTIONS,
} from '../../lib/sensoryConstants'
import { LOCATIONS } from '../../lib/behaviorConstants'
import type { SensoryLog, BehaviorLog, RegulationLevel } from '../../types'
import { Spinner } from '../ui/Spinner'
import { TimeChipPicker } from '../ui/TimeChipPicker'

const schema = z.object({
  entry_date:               z.string().min(1),
  time_of_day:              z.string().min(1, 'Time is required'),
  location:                 z.string(),
  regulation_level:         z.enum(['calm', 'alert', 'anxious', 'dysregulated', 'shutdown']),
  sensory_triggers:         z.array(z.string()),
  sensory_triggers_other:   z.string().max(200),
  calming_strategies:       z.array(z.string()),
  calming_strategies_other: z.string().max(200),
  helped:                   z.enum(['yes', 'somewhat', 'no']),
  duration_mins:            z.number().min(0).nullable(),
  notes:                    z.string().max(2000),
  behavior_log_id:          z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface Props {
  profileId: string
  date: string
  existingLog?: SensoryLog | null
  availableBehaviorLogs?: BehaviorLog[]
  onSaved: () => void
  onCancel: () => void
}

function MultiChipRow({
  options, value, onChange, accentColor = 'violet',
}: {
  options: readonly string[]
  value: string[]
  onChange: (v: string[]) => void
  accentColor?: 'violet' | 'teal'
}) {
  const activeClass = accentColor === 'violet'
    ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
    : 'bg-teal-500 border-teal-500 text-white shadow-sm'
  const hoverClass = accentColor === 'violet'
    ? 'hover:border-violet-300 hover:text-violet-700'
    : 'hover:border-teal-300 hover:text-teal-700'

  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            value.includes(opt)
              ? activeClass
              : `bg-white border-gray-200 text-gray-600 ${hoverClass}`
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function SensoryLogForm({
  profileId, date, existingLog, availableBehaviorLogs = [], onSaved, onCancel,
}: Props) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showLinkSection, setShowLinkSection] = useState(false)

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        entry_date:               date,
        time_of_day:              nowTime(),
        location:                 '',
        regulation_level:         'calm',
        sensory_triggers:         [],
        sensory_triggers_other:   '',
        calming_strategies:       [],
        calming_strategies_other: '',
        helped:                   'somewhat',
        duration_mins:            null,
        notes:                    '',
        behavior_log_id:          null,
      },
    })

  useEffect(() => {
    const hasLink = Boolean(existingLog?.behavior_log_id)
    reset({
      entry_date:               date,
      time_of_day:              existingLog?.time_of_day              ?? nowTime(),
      location:                 existingLog?.location                 ?? '',
      regulation_level:         (existingLog?.regulation_level        ?? 'calm') as RegulationLevel,
      sensory_triggers:         existingLog?.sensory_triggers         ?? [],
      sensory_triggers_other:   existingLog?.sensory_triggers_other   ?? '',
      calming_strategies:       existingLog?.calming_strategies       ?? [],
      calming_strategies_other: existingLog?.calming_strategies_other ?? '',
      helped:                   existingLog?.helped                   ?? 'somewhat',
      duration_mins:            existingLog?.duration_mins            ?? null,
      notes:                    existingLog?.notes                    ?? '',
      behavior_log_id:          existingLog?.behavior_log_id          ?? null,
    })
    if (hasLink) setShowLinkSection(true)
  }, [date, existingLog, reset])

  const regulationLevel  = watch('regulation_level')
  const sensoryTriggers  = watch('sensory_triggers')
  const calmingStrategies = watch('calming_strategies')
  const helped           = watch('helped')
  const behaviorLogId    = watch('behavior_log_id')
  const showOtherTrigger = sensoryTriggers.includes('Other')
  const showOtherStrategy = calmingStrategies.includes('Other')

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSubmitting(true)
    try {
      if (existingLog) {
        const { error } = await supabase.from('sensory_logs').update({
          time_of_day:              values.time_of_day,
          location:                 values.location,
          regulation_level:         values.regulation_level,
          sensory_triggers:         values.sensory_triggers,
          sensory_triggers_other:   values.sensory_triggers_other,
          calming_strategies:       values.calming_strategies,
          calming_strategies_other: values.calming_strategies_other,
          helped:                   values.helped,
          duration_mins:            values.duration_mins,
          notes:                    values.notes,
          behavior_log_id:          values.behavior_log_id,
        }).eq('id', existingLog.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('sensory_logs').insert({
          profile_id:               profileId,
          author_id:                user.id,
          entry_date:               values.entry_date,
          time_of_day:              values.time_of_day,
          location:                 values.location,
          regulation_level:         values.regulation_level,
          sensory_triggers:         values.sensory_triggers,
          sensory_triggers_other:   values.sensory_triggers_other,
          calming_strategies:       values.calming_strategies,
          calming_strategies_other: values.calming_strategies_other,
          helped:                   values.helped,
          duration_mins:            values.duration_mins,
          notes:                    values.notes,
          behavior_log_id:          values.behavior_log_id,
        })
        if (error) throw error
      }
      toast.success('Sensory log saved')
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
      const { error } = await supabase.from('sensory_logs').delete().eq('id', existingLog.id)
      if (error) throw error
      toast.success('Log deleted')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally {
      setDeleting(false)
    }
  }

  const selectedZone = REGULATION_ZONES.find(z => z.value === regulationLevel) ?? REGULATION_ZONES[0]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 space-y-6 pb-8">

      {/* ── Section 1: Regulation Zone (most important — top of form) ── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            How are they right now?
          </h3>
          {errors.regulation_level && (
            <p className="text-xs text-red-500 mt-0.5">{errors.regulation_level.message}</p>
          )}
        </div>

        <Controller
          name="regulation_level"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-5 gap-1.5">
              {REGULATION_ZONES.map(zone => {
                const isSelected = field.value === zone.value
                return (
                  <button
                    key={zone.value}
                    type="button"
                    onClick={() => field.onChange(zone.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? `${zone.selectedBg} border-transparent text-white shadow-md scale-105`
                        : `${zone.bg} ${zone.border} ${zone.color} hover:scale-102`
                    }`}
                  >
                    <span className="text-lg leading-none">{zone.emoji}</span>
                    <span className="text-[11px] font-semibold leading-tight">{zone.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        />

        {/* Zone context hint */}
        <p className={`text-xs px-3 py-1.5 rounded-xl font-medium ${selectedZone.bg} ${selectedZone.color}`}>
          {regulationLevel === 'calm'         && 'Engaged, cooperative, ready to learn'}
          {regulationLevel === 'alert'        && 'Excited or slightly elevated, but manageable'}
          {regulationLevel === 'anxious'      && 'Heightened, may need support soon'}
          {regulationLevel === 'dysregulated' && 'Overwhelmed — active intervention needed'}
          {regulationLevel === 'shutdown'     && 'Withdrawn, unresponsive, emotionally flooded'}
        </p>
      </section>

      {/* ── Section 2: When & Where ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          When &amp; Where
        </h3>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
            <Clock className="w-3 h-3" /> Time
          </label>
          <TimeChipPicker
            value={watch('time_of_day')}
            onChange={(t) => setValue('time_of_day', t, { shouldValidate: true })}
            accentColor="#8B5CF6"
            isEditing={!!existingLog}
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
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
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
                    ? 'bg-violet-500 border-violet-500 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300'
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
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
        </div>
      </section>

      {/* ── Section 3: Sensory Triggers ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Sensory triggers <span className="text-gray-300 normal-case font-normal">(select all that apply)</span>
        </h3>
        <Controller
          name="sensory_triggers"
          control={control}
          render={({ field }) => (
            <MultiChipRow options={SENSORY_TRIGGERS} value={field.value} onChange={field.onChange} />
          )}
        />
        {showOtherTrigger && (
          <input
            type="text"
            placeholder="Describe other trigger…"
            {...register('sensory_triggers_other')}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
        )}
      </section>

      {/* ── Section 4: Calming Strategies ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Calming strategy used <span className="text-gray-300 normal-case font-normal">(select all that apply)</span>
        </h3>
        <Controller
          name="calming_strategies"
          control={control}
          render={({ field }) => (
            <MultiChipRow
              options={CALMING_STRATEGIES}
              value={field.value}
              onChange={field.onChange}
              accentColor="teal"
            />
          )}
        />
        {showOtherStrategy && (
          <input
            type="text"
            placeholder="Describe other strategy…"
            {...register('calming_strategies_other')}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
        )}
      </section>

      {/* ── Section 5: Did it help? ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Did the strategy help?
        </h3>
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
      </section>

      {/* ── Section 6: Optional fields ── */}
      <section className="space-y-4">
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
                placeholder="e.g. 10"
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Notes <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Anything else to note about this moment…"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
        </div>
      </section>

      {/* ── Section 7: Link to behavior log (collapsed by default) ── */}
      {availableBehaviorLogs.length > 0 && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowLinkSection(s => !s)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest hover:text-violet-600 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Link to a behavior log
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLinkSection ? 'rotate-180' : ''}`} />
          </button>

          {showLinkSection && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                Did this sensory event lead to a logged behavior? Tap to link them.
              </p>
              <button
                type="button"
                onClick={() => setValue('behavior_log_id', null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  behaviorLogId === null
                    ? 'border-gray-300 bg-gray-50 text-gray-500'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                No link
              </button>
              {availableBehaviorLogs.map(log => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setValue('behavior_log_id', log.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    behaviorLogId === log.id
                      ? 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-amber-300'
                  }`}
                >
                  <span className="capitalize font-medium">{log.behavior}</span>
                  <span className="text-gray-400 ml-2 text-xs">
                    {log.time_of_day.slice(0, 5)} · Severity {log.severity}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

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
          disabled={submitting}
          className="flex-1 py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Spinner className="w-4 h-4" /> : <><Save className="w-4 h-4" /> Save log</>}
        </button>
      </div>
    </form>
  )
}
