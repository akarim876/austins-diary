import { format, parseISO } from 'date-fns'
import { FlaskConical, Pill, User } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import type { DietLog } from '../../types'
import { MEAL_TYPES, HYDRATION_OPTIONS, ACCEPTANCE_COLOR, ACCEPTANCE_LABEL } from '../../lib/dietConstants'

interface Props {
  log: DietLog
  authorName?: string
  onClick?: () => void
  compact?: boolean
}

function typeIcon(logType: DietLog['log_type'], className = 'w-4 h-4') {
  if (logType === 'meal')        return <ModuleIcon name="meal"     className={`${className} text-emerald-600`} />
  if (logType === 'smoothie')    return <ModuleIcon name="smoothie" className={`${className} text-teal-600`} />
  if (logType === 'supplements') return <FlaskConical               className={`${className} text-teal-700`} />
  return                                <Pill                       className={`${className} text-purple-600`} />
}

function typeLabel(log: DietLog): string {
  if (log.log_type === 'meal') {
    const m = MEAL_TYPES.find(m => m.value === log.meal_type)
    return m ? `${m.emoji} ${m.label}` : 'Meal'
  }
  if (log.log_type === 'smoothie') return `☕ ${log.smoothie_type} smoothie`
  if (log.log_type === 'supplements') return 'Supplements'
  return 'Medications'
}

function cardColors(logType: DietLog['log_type']) {
  if (logType === 'medications') {
    return {
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      headerBg: 'bg-purple-50 border-purple-100',
      headerText: 'text-purple-700',
      tagBg: 'bg-purple-50 border-purple-200 text-purple-700',
    }
  }
  if (logType === 'supplements') {
    return {
      border: 'border-teal-200',
      bg: 'bg-teal-50',
      headerBg: 'bg-teal-50 border-teal-100',
      headerText: 'text-teal-700',
      tagBg: 'bg-teal-50 border-teal-200 text-teal-700',
    }
  }
  return {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    headerBg: 'bg-emerald-50 border-emerald-100',
    headerText: 'text-emerald-700',
    tagBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
}

function ChecklistDisplay({ checked, omitted, tagBg }: { checked: string[]; omitted: string[]; tagBg: string }) {
  if (checked.length === 0 && omitted.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {checked.map(i => (
        <span key={i} className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${tagBg}`}>
          ✓ {i}
        </span>
      ))}
      {omitted.map(i => (
        <span key={i} className="px-2.5 py-1 rounded-xl bg-gray-50 text-xs text-gray-400 line-through">
          {i}
        </span>
      ))}
    </div>
  )
}

export function DietLogCard({ log, authorName, onClick, compact = false }: Props) {
  const timeStr = log.time_of_day.slice(0, 5)
  const colors = cardColors(log.log_type)
  const label = typeLabel(log)
  const mealMeta = MEAL_TYPES.find(m => m.value === log.meal_type)

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left flex items-start gap-3 ${colors.bg} rounded-xl border ${colors.border} p-3 hover:shadow-sm transition-all`}
      >
        <div className={`w-8 h-8 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          {typeIcon(log.log_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold ${colors.headerText}`}>{label}</span>
            <span className="text-xs text-gray-400">{timeStr}</span>
          </div>
          {log.log_type === 'meal' && log.foods_eaten.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{log.foods_eaten.join(', ')}</p>
          )}
          {log.log_type === 'meal' && log.new_food_introduced && log.new_food_name && (
            <p className={`text-xs mt-0.5 px-1.5 py-0.5 rounded font-medium inline-block
              ${log.new_food_acceptance ? ACCEPTANCE_COLOR[log.new_food_acceptance] : 'text-gray-500'}`}>
              New: {log.new_food_name}
            </p>
          )}
          {log.log_type === 'smoothie' && log.ingredients_omitted.length > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              {log.ingredients_omitted.length} ingredient{log.ingredients_omitted.length > 1 ? 's' : ''} omitted
            </p>
          )}
          {log.log_type === 'supplements' && (
            <p className="text-xs text-teal-600 mt-0.5">
              {log.supplements_checked.length} taken
            </p>
          )}
          {log.log_type === 'medications' && (
            <p className="text-xs text-purple-600 mt-0.5">
              {log.medications_checked.length} taken
            </p>
          )}
          {authorName && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" /> {authorName}
            </p>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border ${colors.border} shadow-sm hover:shadow-md transition-all overflow-hidden`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${colors.headerBg} border-b`}>
        {typeIcon(log.log_type)}
        <span className={`text-xs font-semibold uppercase tracking-wide ${colors.headerText}`}>
          {log.log_type === 'meal' ? 'Meal / Snack'
            : log.log_type === 'smoothie' ? 'Smoothie'
            : log.log_type === 'supplements' ? 'Supplements'
            : 'Medications'}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {format(parseISO(log.entry_date), 'EEE, MMM d')} · {timeStr}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Meal */}
        {log.log_type === 'meal' && (
          <>
            {mealMeta && (
              <p className="text-sm font-semibold text-gray-900">{mealMeta.emoji} {mealMeta.label}</p>
            )}
            {log.foods_eaten.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {log.foods_eaten.map(f => (
                  <span key={f} className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${colors.tagBg}`}>{f}</span>
                ))}
              </div>
            )}
            {log.new_food_introduced && log.new_food_name && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium
                ${log.new_food_acceptance ? ACCEPTANCE_COLOR[log.new_food_acceptance] : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                <span>🆕 New food: {log.new_food_name}</span>
                {log.new_food_acceptance && (
                  <span className="ml-auto opacity-80">— {ACCEPTANCE_LABEL[log.new_food_acceptance]}</span>
                )}
              </div>
            )}
          </>
        )}

        {/* Smoothie */}
        {log.log_type === 'smoothie' && (
          <>
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <ChecklistDisplay
              checked={log.ingredients_checked}
              omitted={log.ingredients_omitted}
              tagBg={colors.tagBg}
            />
            {log.hydration && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Hydration:</span>
                <span>{HYDRATION_OPTIONS.find(h => h.value === log.hydration)?.emoji}</span>
                <span>{HYDRATION_OPTIONS.find(h => h.value === log.hydration)?.label}</span>
              </div>
            )}
            {log.substitution_notes && (
              <p className="text-xs text-gray-600 italic">{log.substitution_notes}</p>
            )}
          </>
        )}

        {/* Supplements */}
        {log.log_type === 'supplements' && (
          <>
            <ChecklistDisplay
              checked={log.supplements_checked}
              omitted={log.supplements_omitted}
              tagBg={colors.tagBg}
            />
            {log.supplements_checked.length === 0 && log.supplements_omitted.length === 0 && (
              <p className="text-xs text-gray-400 italic">No items recorded</p>
            )}
          </>
        )}

        {/* Medications */}
        {log.log_type === 'medications' && (
          <>
            <ChecklistDisplay
              checked={log.medications_checked}
              omitted={log.medications_omitted}
              tagBg={colors.tagBg}
            />
            {log.medications_checked.length === 0 && log.medications_omitted.length === 0 && (
              <p className="text-xs text-gray-400 italic">No items recorded</p>
            )}
          </>
        )}

        {/* Shared notes */}
        {log.notes && (
          <p className="text-xs text-gray-600 line-clamp-2">{log.notes}</p>
        )}

        {/* Author */}
        {authorName && (
          <div className="flex items-center gap-1 text-xs text-gray-400 pt-1 border-t border-gray-100">
            <User className="w-3 h-3" /> Logged by {authorName}
          </div>
        )}
      </div>
    </button>
  )
}
