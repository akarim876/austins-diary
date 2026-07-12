import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarClock, Check, X, RefreshCw, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { useDailySchedule } from '../../hooks/useDailySchedule'
import { canCreate } from '../../hooks/useMyRole'
import { Spinner } from '../ui/Spinner'
import type { DeviationReason, ScheduleDisplayItem, ScheduleItemStatus, ProfileRole } from '../../types'

const DEVIATION_REASONS: { value: DeviationReason; label: string }[] = [
  { value: 'ran_late',         label: 'Ran late'          },
  { value: 'skipped',          label: 'Skipped'           },
  { value: 'changed_activity', label: 'Changed activity'  },
  { value: 'other',            label: 'Other'             },
]

const STATUS_CONFIG: Record<ScheduleItemStatus, {
  label: string; icon: React.ReactNode; pill: string; dot: string
}> = {
  not_yet: {
    label: 'Not yet',
    icon:  <Circle className="w-3.5 h-3.5" />,
    pill:  'bg-gray-100 text-gray-500 border-gray-200',
    dot:   'bg-gray-300',
  },
  done: {
    label: 'Done',
    icon:  <Check className="w-3.5 h-3.5" />,
    pill:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot:   'bg-emerald-400',
  },
  skipped: {
    label: 'Skipped',
    icon:  <X className="w-3.5 h-3.5" />,
    pill:  'bg-orange-50 text-orange-700 border-orange-200',
    dot:   'bg-orange-300',
  },
  changed: {
    label: 'Changed',
    icon:  <RefreshCw className="w-3.5 h-3.5" />,
    pill:  'bg-amber-50 text-amber-700 border-amber-200',
    dot:   'bg-amber-400',
  },
}

const STATUS_ORDER: ScheduleItemStatus[] = ['not_yet', 'done', 'skipped', 'changed']

interface ItemRowProps {
  item: ScheduleDisplayItem
  canEdit: boolean
  onUpdate: (status: ScheduleItemStatus, reason: DeviationReason | null, note: string | null) => void
  onLogBehavior?: () => void
}

function ItemRow({ item, canEdit, onUpdate, onLogBehavior }: ItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [reason, setReason]     = useState<DeviationReason | null>(item.deviation_reason)
  const [note, setNote]         = useState(item.deviation_note ?? '')
  const [showBehaviorPrompt, setShowBehaviorPrompt] = useState(false)

  const cfg = STATUS_CONFIG[item.status]

  function handleStatusClick(next: ScheduleItemStatus) {
    if (!canEdit) return
    const needsDetail = next === 'skipped' || next === 'changed'
    onUpdate(next, needsDetail ? reason : null, needsDetail ? (note || null) : null)
    setExpanded(needsDetail)
    if (next === 'changed') setShowBehaviorPrompt(true)
    else setShowBehaviorPrompt(false)
  }

  function handleSaveDetail() {
    onUpdate(item.status, reason, note || null)
    setExpanded(false)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        {/* Time badge */}
        <span
          className="flex-shrink-0 w-12 text-[10px] font-data text-right leading-none"
          style={{ color: '#9A9187' }}
        >
          {item.time_of_day
            ? format(parseISO(`2000-01-01T${item.time_of_day}`), 'h:mma').toLowerCase()
            : ''}
        </span>

        {/* Label */}
        <span className="flex-1 text-sm font-medium truncate" style={{ color: '#33322E' }}>
          {item.label}
        </span>

        {/* Status chips (tap to cycle) */}
        {canEdit ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            {STATUS_ORDER.map(s => {
              const c = STATUS_CONFIG[s]
              const active = item.status === s
              return (
                <button
                  key={s}
                  onClick={() => handleStatusClick(s)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                    active
                      ? c.pill + ' shadow-sm'
                      : 'bg-white border-gray-200 text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {c.icon}
                </button>
              )
            })}
            {(item.status === 'skipped' || item.status === 'changed') && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-5 h-5 flex items-center justify-center text-gray-400"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        ) : (
          // Read-only badge
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.pill}`}>
            {cfg.icon} {cfg.label}
          </span>
        )}
      </div>

      {/* Detail panel for skipped/changed */}
      {expanded && (item.status === 'skipped' || item.status === 'changed') && (
        <div
          className="ml-14 p-2.5 rounded-xl space-y-2"
          style={{ background: 'rgba(51,50,46,0.04)', border: '1px solid rgba(51,50,46,0.07)' }}
        >
          <div className="flex flex-wrap gap-1.5">
            {DEVIATION_REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  reason === r.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional note…"
            className="w-full text-xs bg-white rounded-lg px-2.5 py-1.5 outline-none"
            style={{ border: '1px solid rgba(51,50,46,0.12)', color: '#33322E' }}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700"
            >Cancel</button>
            <button
              onClick={handleSaveDetail}
              className="px-3 py-1 rounded-full text-[11px] font-semibold text-white"
              style={{ background: '#5B7B7A' }}
            >Save</button>
          </div>
        </div>
      )}

      {/* Behavior prompt when marking "changed" */}
      {showBehaviorPrompt && onLogBehavior && !expanded && (
        <div
          className="ml-14 px-3 py-2 rounded-xl flex items-center justify-between gap-2"
          style={{ background: 'rgba(217,154,108,0.10)', border: '1px solid rgba(217,154,108,0.25)' }}
        >
          <p className="text-[11px] font-medium" style={{ color: '#a06030' }}>
            Did this change trigger a behavior incident?
          </p>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowBehaviorPrompt(false)}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >No</button>
            <button
              onClick={() => { onLogBehavior(); setShowBehaviorPrompt(false) }}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white"
              style={{ background: '#D99A6C' }}
            >Log incident</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Public widget ────────────────────────────────────────────────────────────

interface Props {
  profileId: string
  date: string
  myRole: ProfileRole | null
  /** Called when the user taps "Log incident" from the behavior suggestion */
  onLogBehavior?: () => void
  compact?: boolean   // calendar view: smaller header, no section title styling
}

export function DailySchedule({ profileId, date, myRole, onLogBehavior, compact }: Props) {
  const { items, loading, updateItem } = useDailySchedule(profileId, date)
  const canEdit = canCreate(myRole)

  if (loading) return (
    <div className="flex justify-center py-3">
      <Spinner className="w-5 h-5" />
    </div>
  )

  if (items.length === 0) {
    if (compact) return null  // in calendar, just hide if no template
    return (
      <div className="flex flex-col items-center py-4 gap-1 text-center">
        <CalendarClock className="w-6 h-6 text-gray-200" />
        <p className="text-xs text-gray-400">No schedule template yet.</p>
        <a href="/schedule-settings" className="text-xs font-semibold" style={{ color: '#5B7B7A' }}>
          Set up schedule →
        </a>
      </div>
    )
  }

  const doneCount    = items.filter(i => i.status === 'done').length
  const skippedCount = items.filter(i => i.status === 'skipped' || i.status === 'changed').length

  return (
    <div className="space-y-0.5">
      {/* Progress summary */}
      {!compact && (
        <div className="flex items-center gap-2 pb-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(51,50,46,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(doneCount / items.length) * 100}%`, background: '#5B7B7A' }}
            />
          </div>
          <span className="text-[11px] font-data flex-shrink-0" style={{ color: '#9A9187' }}>
            {doneCount}/{items.length}
            {skippedCount > 0 ? ` · ${skippedCount} varied` : ''}
          </span>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-2">
        {items.map(item => (
          <ItemRow
            key={item.templateItemId}
            item={item}
            canEdit={canEdit}
            onUpdate={(status, reason, note) =>
              updateItem(item.templateItemId, status, reason, note)
            }
            onLogBehavior={onLogBehavior}
          />
        ))}
      </div>
    </div>
  )
}
