import { useState } from 'react'
import { FlaskConical, Pill } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'

// Thin wrappers so ModuleIcon fits the Icon: React.ComponentType<{className?}> slot
const MealIcon = ({ className }: { className?: string }) => (
  <ModuleIcon name="meal" className={className} />
)
const SmoothieIcon = ({ className }: { className?: string }) => (
  <ModuleIcon name="smoothie" className={className} />
)
import type { DietLog, DietSettings } from '../../types'
import { MealLogForm } from './MealLogForm'
import { SmoothieLogForm } from './SmoothieLogForm'
import ChecklistLogForm from './ChecklistLogForm'

type EntryType = 'meal' | 'smoothie' | 'supplements' | 'medications'

interface Props {
  profileId: string
  date: string
  initialType?: EntryType | null
  existingLog?: DietLog | null
  settings: DietSettings
  onSaved: (updatedSettings?: Partial<DietSettings>) => void
  onCancel: () => void
}

interface TypeOption {
  type: EntryType
  label: string
  sublabel: string
  Icon: React.ComponentType<{ className?: string }>
  iconBg: string
  cardBorder: string
  cardBg: string
  cardText: string
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'meal',
    label: 'Meal / Snack',
    sublabel: 'Breakfast, lunch, dinner, snack',
    Icon: MealIcon,
    iconBg: 'bg-emerald-500',
    cardBorder: 'border-emerald-200',
    cardBg: 'bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400',
    cardText: 'text-emerald-700',
  },
  {
    type: 'smoothie',
    label: 'Smoothie',
    sublabel: 'Morning or evening routine',
    Icon: SmoothieIcon,
    iconBg: 'bg-teal-500',
    cardBorder: 'border-teal-200',
    cardBg: 'bg-teal-50 hover:bg-teal-100 hover:border-teal-400',
    cardText: 'text-teal-700',
  },
  {
    type: 'supplements',
    label: 'Supplements',
    sublabel: 'Log today\'s supplements',
    Icon: FlaskConical,
    iconBg: 'bg-teal-600',
    cardBorder: 'border-teal-200',
    cardBg: 'bg-teal-50 hover:bg-teal-100 hover:border-teal-400',
    cardText: 'text-teal-700',
  },
  {
    type: 'medications',
    label: 'Medications',
    sublabel: 'Log medications taken',
    Icon: Pill,
    iconBg: 'bg-purple-500',
    cardBorder: 'border-purple-200',
    cardBg: 'bg-purple-50 hover:bg-purple-100 hover:border-purple-400',
    cardText: 'text-purple-700',
  },
]

export function DietSheet({ profileId, date, initialType, existingLog, settings, onSaved, onCancel }: Props) {
  const [entryType, setEntryType] = useState<EntryType | null>(
    (existingLog?.log_type as EntryType) ?? initialType ?? null
  )

  const activeType = entryType ?? (existingLog?.log_type as EntryType | null)

  if (activeType) {
    if (activeType === 'meal') {
      return (
        <MealLogForm
          profileId={profileId}
          date={date}
          existingLog={existingLog?.log_type === 'meal' ? existingLog : null}
          settings={settings}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      )
    }
    if (activeType === 'smoothie') {
      return (
        <SmoothieLogForm
          profileId={profileId}
          date={date}
          existingLog={existingLog?.log_type === 'smoothie' ? existingLog : null}
          settings={settings}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      )
    }
    if (activeType === 'supplements' || activeType === 'medications') {
      return (
        <div className="px-4 py-5 pb-8">
          <ChecklistLogForm
            logType={activeType}
            items={activeType === 'supplements' ? settings.supplements : settings.medications}
            existingLog={existingLog?.log_type === activeType ? existingLog : null}
            onSaved={() => onSaved()}
            onCancel={onCancel}
          />
        </div>
      )
    }
  }

  // Type picker
  return (
    <div className="px-4 py-6 space-y-4 pb-8">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">
        What are you logging?
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {TYPE_OPTIONS.map(({ type, label, sublabel, Icon, iconBg, cardBorder, cardBg, cardText }) => (
          <button
            key={type}
            type="button"
            onClick={() => setEntryType(type)}
            className={`flex flex-col items-center gap-3 py-6 rounded-xl border-2 ${cardBorder} ${cardBg} ${cardText} transition-all`}
          >
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shadow-md`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-center px-2">
              <p className="text-sm font-bold">{label}</p>
              <p className={`text-xs mt-0.5 opacity-75`}>{sublabel}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
      >
        Cancel
      </button>
    </div>
  )
}
