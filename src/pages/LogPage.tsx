import { useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpen, Pill } from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { BottomSheet } from '../components/ui/BottomSheet'
import { BehaviorLogForm } from '../components/behavior/BehaviorLogForm'
import { SensoryLogForm } from '../components/sensory/SensoryLogForm'
import { DietSheet } from '../components/diet/DietSheet'
import { SleepLogForm } from '../components/sleep/SleepLogForm'
import { DiaryEntryForm } from '../components/diary/DiaryEntryForm'
import { AppointmentForm } from '../components/appointments/AppointmentForm'
import { ProgressNoteForm } from '../components/goals/ProgressNoteForm'
import { useProfile } from '../contexts/ProfileContext'
import { useProviders } from '../hooks/useProviders'
import { useGoals } from '../hooks/useGoals'
import { useDietSettings } from '../hooks/useDietSettings'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

// ─── Tile grid item ───────────────────────────────────────────────────────────

function LogTile({
  icon,
  label,
  description,
  iconBg,
  onClick,
}: {
  icon: ReactNode
  label: string
  description: string
  iconBg: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-3 p-4 rounded-xl text-left active:scale-[0.97] transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{
        background: '#fff',
        boxShadow: '0 2px 10px rgba(51,50,46,0.07)',
        minHeight: 120,
      }}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </span>
      <div>
        <p className="font-semibold text-sm" style={{ color: '#33322E' }}>{label}</p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: '#9A9187' }}>{description}</p>
      </div>
    </button>
  )
}

// ─── Tile groups ──────────────────────────────────────────────────────────────

function TileGroup({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2 px-0.5"
        style={{ color: '#9A9187' }}
      >
        {heading}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type DietSubtype = 'meal' | 'smoothie' | 'supplements' | 'medications'
type Sheet =
  | 'behavior' | 'sensory' | 'diet'
  | 'sleep' | 'diary' | 'appointment' | 'progress'
  | null

export function LogPage() {
  const { activeProfile } = useProfile()
  const navigate = useNavigate()
  const [sheet, setSheet]         = useState<Sheet>(null)
  const [dietSubtype, setDietSubtype] = useState<DietSubtype | null>(null)

  const { providers } = useProviders(activeProfile?.id ?? null)
  const { goals }     = useGoals(activeProfile?.id ?? null)
  const activeGoals   = goals.filter(g => g.status === 'active')
  const { settings: dietSettings } = useDietSettings(activeProfile?.id ?? null)

  if (!activeProfile) return null

  const today = format(new Date(), 'yyyy-MM-dd')

  function close() { setSheet(null); setDietSubtype(null) }

  function openDiet(subtype: DietSubtype) {
    setDietSubtype(subtype)
    setSheet('diet')
  }

  return (
    <div className="pb-28 max-w-lg mx-auto px-4 pt-5 space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="font-display text-2xl font-semibold" style={{ color: '#33322E' }}>
          Log an entry
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9A9187' }}>
          What do you want to record?
        </p>
      </div>

      {/* Behaviour & Regulation */}
      <TileGroup heading="Behaviour & Regulation">
        <LogTile
          icon={<ModuleIcon name="behavior" className="w-5 h-5" style={{ color: '#C6A84B' }} />}
          label="Behavior"
          description="Incident, severity, antecedent"

          iconBg="rgba(198,168,75,0.13)"
          onClick={() => setSheet('behavior')}
        />
        <LogTile
          icon={<ModuleIcon name="sensory" className="w-5 h-5" style={{ color: '#9B8EC4' }} />}
          label="Sensory / Regulation"
          description="Zone, triggers, strategies"

          iconBg="rgba(155,142,196,0.13)"
          onClick={() => setSheet('sensory')}
        />
      </TileGroup>

      {/* Diet */}
      <TileGroup heading="Diet & Nutrition">
        <LogTile
          icon={<ModuleIcon name="meal" className="w-5 h-5" style={{ color: '#7CB48F' }} />}
          label="Meal or Snack"
          description="Breakfast, lunch, dinner, snack"

          iconBg="rgba(124,180,143,0.13)"
          onClick={() => openDiet('meal')}
        />
        <LogTile
          icon={<ModuleIcon name="smoothie" className="w-5 h-5" style={{ color: '#4A9068' }} />}
          label="Smoothie"
          description="Recipe, omissions, hydration"

          iconBg="rgba(74,144,104,0.13)"
          onClick={() => openDiet('smoothie')}
        />
        <LogTile
          icon={<Pill className="w-5 h-5" style={{ color: '#3DB3B0' }} />}
          label="Supplements"
          description="Daily supplement checklist"

          iconBg="rgba(61,179,176,0.13)"
          onClick={() => openDiet('supplements')}
        />
        <LogTile
          icon={<Pill className="w-5 h-5" style={{ color: '#8B6FC9' }} />}
          label="Medications"
          description="Medication checklist"

          iconBg="rgba(139,111,201,0.13)"
          onClick={() => openDiet('medications')}
        />
      </TileGroup>

      {/* Sleep & Journal */}
      <TileGroup heading="Sleep & Journal">
        <LogTile
          icon={<ModuleIcon name="sleep" className="w-5 h-5" style={{ color: '#6875C8' }} />}
          label="Sleep"
          description="Bedtime, wake, quality, wakings"

          iconBg="rgba(104,117,200,0.13)"
          onClick={() => setSheet('sleep')}
        />
        <LogTile
          icon={<BookOpen className="w-5 h-5" style={{ color: '#4A7B5E' }} />}
          label="Diary Note"
          description="Free-text, photos, tags"

          iconBg="rgba(74,123,94,0.13)"
          onClick={() => setSheet('diary')}
        />
      </TileGroup>

      {/* Goals & Appointments */}
      <TileGroup heading="Goals & Appointments">
        <LogTile
          icon={<ModuleIcon name="goals" className="w-5 h-5" style={{ color: '#5B7B7A' }} />}
          label="Progress Note"
          description="Update an active goal"

          iconBg="rgba(91,123,122,0.13)"
          onClick={() => setSheet('progress')}
        />
        <LogTile
          icon={<ModuleIcon name="appointments" className="w-5 h-5" style={{ color: '#D4735F' }} />}
          label="Appointment"
          description="Visit, session, meeting"

          iconBg="rgba(212,115,95,0.13)"
          onClick={() => setSheet('appointment')}
        />
      </TileGroup>

      {/* ── Sheets ────────────────────────────────────────────────────────── */}

      <BottomSheet open={sheet === 'behavior'} onClose={close} title="Log behavior">
        <BehaviorLogForm
          profileId={activeProfile.id}
          date={today}
          onSaved={close}
          onCancel={close}
        />
      </BottomSheet>

      <BottomSheet open={sheet === 'sensory'} onClose={close} title="Log sensory / regulation">
        <SensoryLogForm profileId={activeProfile.id} date={today} onSaved={close} onCancel={close} />
      </BottomSheet>

      <BottomSheet open={sheet === 'diet'} onClose={close} title="Log diet">
        <DietSheet
          profileId={activeProfile.id}
          date={today}
          initialType={dietSubtype}
          settings={dietSettings}
          onSaved={close}
          onCancel={close}
        />
      </BottomSheet>

      <BottomSheet open={sheet === 'sleep'} onClose={close} title="Log sleep">
        <SleepLogForm profileId={activeProfile.id} onSaved={close} onCancel={close} />
      </BottomSheet>

      <BottomSheet open={sheet === 'diary'} onClose={close} title="Diary note">
        <DiaryEntryForm
          profileId={activeProfile.id}
          date={today}
          existingEntry={null}
          onSaved={close}
        />
      </BottomSheet>

      <BottomSheet open={sheet === 'progress'} onClose={close} title="Log progress">
        {activeGoals.length === 0 ? (
          <div className="px-4 pt-6 pb-8 text-center">
            <p className="text-sm text-gray-500">No active goals yet.</p>
            <button
              type="button"
              onClick={() => { close(); navigate('/goals') }}
              className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Go to Goals
            </button>
          </div>
        ) : (
          <ProgressNoteForm
            profileId={activeProfile.id}
            availableGoals={activeGoals}
            onSaved={close}
            onCancel={close}
          />
        )}
      </BottomSheet>

      <BottomSheet open={sheet === 'appointment'} onClose={close} title="Log appointment">
        <AppointmentForm
          profileId={activeProfile.id}
          providers={providers}
          onSaved={close}
          onCancel={close}
        />
      </BottomSheet>

    </div>
  )
}
