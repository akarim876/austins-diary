/**
 * TimeChipPicker — replaces the plain <input type="time"> on log forms.
 *
 * Chips: Now / 5 min ago / 15 min ago / 30 min ago / 1 hr ago / Custom
 * Selecting a relative chip immediately computes the real HH:MM and calls
 * onChange so the parent form always stores an actual timestamp, not a label.
 * The resolved time is shown next to the active chip (e.g. "15 min ago · 2:47 PM").
 * "Custom" reveals a native <input type="time"> for exact entry.
 */

import { useEffect, useRef, useState } from 'react'

interface ChipDef {
  id:          string
  label:       string
  offsetMins:  number | null   // null = custom
}

const CHIPS: ChipDef[] = [
  { id: 'now',    label: 'Now',        offsetMins: 0    },
  { id: '5',      label: '5 min ago',  offsetMins: 5    },
  { id: '15',     label: '15 min ago', offsetMins: 15   },
  { id: '30',     label: '30 min ago', offsetMins: 30   },
  { id: '60',     label: '1 hr ago',   offsetMins: 60   },
  { id: 'custom', label: 'Custom',     offsetMins: null },
]

function computeOffset(mins: number): string {
  const d = new Date(Date.now() - mins * 60_000)
  return (
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0')
  )
}

function formatDisplay(hhmm: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

interface Props {
  /** Controlled value from the parent form — HH:MM format. */
  value:       string
  onChange:    (time: string) => void
  /** Hex / CSS color for the selected chip background. */
  accentColor?: string
  /** Pass true when editing an existing entry so we start in Custom mode. */
  isEditing?:  boolean
}

export function TimeChipPicker({
  value,
  onChange,
  accentColor = '#5B7B7A',
  isEditing   = false,
}: Props) {
  const [selectedId, setSelectedId]   = useState(isEditing ? 'custom' : 'now')
  const [resolvedTime, setResolvedTime] = useState(value)

  // Ref so we don't override the parent's value on first render
  const initialised = useRef(false)

  // If the parent form resets (e.g. date change or edit mode), sync our display
  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true
      // First mount: for new logs immediately resolve "Now"
      if (!isEditing) {
        const t = computeOffset(0)
        setResolvedTime(t)
        onChange(t)
      } else {
        setResolvedTime(value)
      }
      return
    }
    // Subsequent parent resets
    setResolvedTime(value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function selectChip(chip: ChipDef) {
    setSelectedId(chip.id)

    if (chip.id === 'custom') return   // user will type in the time input

    const t = computeOffset(chip.offsetMins as number)
    setResolvedTime(t)
    onChange(t)
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResolvedTime(e.target.value)
    onChange(e.target.value)
  }

  const activeChip = CHIPS.find(c => c.id === selectedId)

  return (
    <div className="space-y-2">
      {/* Chip row */}
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map(chip => {
          const isActive = chip.id === selectedId
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => selectChip(chip)}
              className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
              style={{
                background:  isActive ? accentColor : 'transparent',
                borderColor: isActive ? accentColor : '#e5e7eb',
                color:       isActive ? '#fff'       : '#6b7280',
              }}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Custom time input */}
      {selectedId === 'custom' && (
        <input
          type="time"
          value={resolvedTime}
          onChange={handleCustomChange}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition"
          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
        />
      )}

      {/* Resolved-time display for relative chips */}
      {selectedId !== 'custom' && resolvedTime && (
        <p className="text-xs font-medium" style={{ color: accentColor }}>
          {activeChip && activeChip.offsetMins !== 0
            ? `${activeChip.label} · ${formatDisplay(resolvedTime)}`
            : formatDisplay(resolvedTime)
          }
        </p>
      )}
    </div>
  )
}
