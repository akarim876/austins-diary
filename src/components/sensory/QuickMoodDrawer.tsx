/**
 * QuickMoodDrawer — one-tap regulation zone logging.
 *
 * Shows the 5 regulation zone buttons (each with a custom face icon +
 * zone label) and a TimeChipPicker defaulted to "Now".
 * Tapping a zone saves immediately as a standard sensory_logs row —
 * indistinguishable in the database from a full Sensory & Regulation entry.
 *
 * All other sensory fields (triggers, strategies, notes, etc.) default to
 * empty/null. The user can edit the entry afterwards to fill in more detail.
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { REGULATION_ZONES, REGULATION_HEX } from '../../lib/sensoryConstants'
import { RegulationFaceIcon } from '../ui/RegulationFaceIcon'
import { TimeChipPicker } from '../ui/TimeChipPicker'
import type { RegulationLevel } from '../../types'

interface Props {
  profileId:  string
  date:       string   // yyyy-MM-dd
  onSaved:    () => void
  onCancel:   () => void
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function QuickMoodDrawer({ profileId, date, onSaved, onCancel }: Props) {
  const { user }          = useAuth()
  const [timeOfDay, setTimeOfDay]     = useState(nowHHMM)
  const [saving, setSaving]           = useState(false)
  const [savedZone, setSavedZone]     = useState<RegulationLevel | null>(null)

  async function handleZoneTap(zone: RegulationLevel) {
    if (saving || !user) return
    setSaving(true)

    const { error } = await supabase.from('sensory_logs').insert({
      profile_id:               profileId,
      author_id:                user.id,
      entry_date:               date,
      time_of_day:              timeOfDay,
      regulation_level:         zone,
      location:                 '',
      sensory_triggers:         [],
      sensory_triggers_other:   '',
      calming_strategies:       [],
      calming_strategies_other: '',
      helped:                   'somewhat',
      duration_mins:            null,
      notes:                    '',
      behavior_log_id:          null,
    })

    if (error) {
      toast.error('Could not save — please try again.')
      setSaving(false)
      return
    }

    // Brief confirmation state before closing
    setSavedZone(zone)
    const label = REGULATION_ZONES.find(z => z.value === zone)?.label ?? zone
    toast.success(`Mood logged: ${label}`)
    setTimeout(onSaved, 600)
  }

  const displayDate = date === format(new Date(), 'yyyy-MM-dd')
    ? 'today'
    : format(new Date(date + 'T12:00:00'), 'MMM d')

  return (
    <div className="flex flex-col gap-5 px-1 pb-2">

      {/* Time picker */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#9A9187' }}>
          When?
        </p>
        <TimeChipPicker
          value={timeOfDay}
          onChange={setTimeOfDay}
          accentColor="#8FB89C"
        />
      </div>

      {/* Zone buttons */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9A9187' }}>
          How is {displayDate === 'today' ? 'it' : null} going {displayDate}?
        </p>

        <div className="flex flex-col gap-2.5">
          {REGULATION_ZONES.map(zone => {
            const hex      = REGULATION_HEX[zone.value]
            const isSaved  = savedZone === zone.value
            return (
              <button
                key={zone.value}
                type="button"
                onClick={() => handleZoneTap(zone.value)}
                disabled={saving}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60"
                style={{
                  background:  isSaved ? hex + 'cc' : hex + '1a',
                  border:      `1.5px solid ${hex}${isSaved ? 'ff' : '55'}`,
                  color:       zone.textHex,
                  boxShadow:   isSaved ? `0 0 0 3px ${hex}40` : undefined,
                }}
                aria-label={`Log mood as ${zone.label}`}
              >
                {/* Face icon */}
                <span
                  className="flex-shrink-0 rounded-xl flex items-center justify-center"
                  style={{
                    width: 44, height: 44,
                    background: hex + '30',
                  }}
                >
                  <RegulationFaceIcon
                    zone={zone.value}
                    size={28}
                    style={{ color: hex }}
                  />
                </span>

                {/* Label */}
                <div className="flex-1">
                  <p className="font-semibold text-[15px] leading-tight">
                    {zone.label}
                  </p>
                </div>

                {/* Saved checkmark */}
                {isSaved && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="18"
                    height="18"
                    style={{ color: zone.textHex, flexShrink: 0 }}
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cancel */}
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
        style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
      >
        Cancel
      </button>
    </div>
  )
}
