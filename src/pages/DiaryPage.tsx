import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { PenLine } from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { useDiaryEntry } from '../hooks/useDiaryEntries'
import { useBehaviorLogsForDate } from '../hooks/useBehaviorLogs'
import { useSensoryLogsForDate } from '../hooks/useSensoryLogs'
import { useDietLogsForDate } from '../hooks/useDietLogs'
import { useDietSettings } from '../hooks/useDietSettings'
import { useSleepLogForDate } from '../hooks/useSleepLogs'
import { useProfileMembers } from '../hooks/useProfileMembers'
import { useMyRole, canCreate, canEditEntry, canEditSleepEntry } from '../hooks/useMyRole'
import { DiaryEntryForm } from '../components/diary/DiaryEntryForm'
import { BehaviorLogForm } from '../components/behavior/BehaviorLogForm'
import { BehaviorLogCard } from '../components/behavior/BehaviorLogCard'
import { SensoryLogForm } from '../components/sensory/SensoryLogForm'
import { SensoryLogCard } from '../components/sensory/SensoryLogCard'
import { DietLogCard } from '../components/diet/DietLogCard'
import { DietSheet } from '../components/diet/DietSheet'
import { SleepLogForm } from '../components/sleep/SleepLogForm'
import { SleepLogCard } from '../components/sleep/SleepLogCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import { useNavigate } from 'react-router-dom'
import type { BehaviorLog, DietLog, DietSettings, SensoryLog } from '../types'

/** The date a sleep entry "belongs to" from DiaryPage perspective:
 *  before noon → last night (yesterday); otherwise → tonight (today). */
function sleepDateForDiary(): string {
  const now = new Date()
  return format(now.getHours() < 12 ? subDays(now, 1) : now, 'yyyy-MM-dd')
}

export function DiaryPage() {
  const { activeProfile } = useProfile()
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const sleepDate = sleepDateForDiary()
  const navigate = useNavigate()
  const myRole = useMyRole(activeProfile?.id ?? null)

  const { entry, loading: entryLoading, refetch: refetchEntry } = useDiaryEntry(
    activeProfile?.id ?? null, today
  )
  const { logs: behaviorLogs, loading: behaviorLoading, refetch: refetchBehavior } =
    useBehaviorLogsForDate(activeProfile?.id ?? null, today)
  const { logs: sensoryLogs, loading: sensoryLoading, refetch: refetchSensory } =
    useSensoryLogsForDate(activeProfile?.id ?? null, today)
  const { logs: dietLogs, loading: dietLoading, refetch: refetchDiet } =
    useDietLogsForDate(activeProfile?.id ?? null, today)
  const { settings: dietSettings, refetch: refetchDietSettings } =
    useDietSettings(activeProfile?.id ?? null)
  const { log: sleepLog, refetch: refetchSleep } =
    useSleepLogForDate(activeProfile?.id ?? null, sleepDate)
  const memberMap = useProfileMembers(activeProfile?.id ?? null)

  const [behaviorSheetOpen, setBehaviorSheetOpen] = useState(false)
  const [editingBehavior, setEditingBehavior] = useState<BehaviorLog | null>(null)

  const [sensorySheetOpen, setSensorySheetOpen] = useState(false)
  const [editingSensory, setEditingSensory] = useState<SensoryLog | null>(null)

  const [dietSheetOpen, setDietSheetOpen] = useState(false)
  const [editingDiet, setEditingDiet] = useState<DietLog | null>(null)

  const [sleepSheetOpen, setSleepSheetOpen] = useState(false)

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-8 text-center">
        <div className="w-16 h-16 rounded-xl bg-brand-100 flex items-center justify-center">
          <PenLine className="w-8 h-8 text-brand-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">No profile selected</h2>
          <p className="text-sm text-gray-500 mt-1">Set up a child profile first.</p>
        </div>
        <button
          onClick={() => navigate('/settings?section=account')}
          className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition"
        >
          Set up profile
        </button>
      </div>
    )
  }

  const loading = entryLoading || behaviorLoading || sensoryLoading || dietLoading

  // Build a map from behavior_log_id → SensoryLog for linked display
  const sensoryByBehaviorId = new Map(
    sensoryLogs.filter(s => s.behavior_log_id).map(s => [s.behavior_log_id!, s])
  )
  // Build a map from sensory_log.id → BehaviorLog
  const behaviorById = new Map(behaviorLogs.map(b => [b.id, b]))

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : (
            <>
              {/* Diary entry — viewers see a read-only note, editors/owners see the form */}
              {canCreate(myRole) ? (
                <DiaryEntryForm
                  profileId={activeProfile.id}
                  date={today}
                  existingEntry={entry}
                  onSaved={refetchEntry}
                />
              ) : entry ? (
                <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2">Today's note</p>
                  {entry.note && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.note}</p>}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-4 text-center">
                  <p className="text-sm text-gray-400">No diary entry for today</p>
                </div>
              )}

              {/* Today's behavior logs */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Behavior incidents
                    {behaviorLogs.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                        {behaviorLogs.length}
                      </span>
                    )}
                  </h2>
                  {canCreate(myRole) && (
                    <button
                      onClick={() => { setEditingBehavior(null); setBehaviorSheetOpen(true) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition"
                    >
                      <ModuleIcon name="behavior" className="w-3.5 h-3.5" />
                      Log incident
                    </button>
                  )}
                </div>

                {behaviorLogs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-amber-100 text-center">
                    <ModuleIcon name="behavior" className="w-6 h-6 text-amber-300" />
                    <p className="text-sm text-gray-400">No incidents logged today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {behaviorLogs.map(log => (
                      <BehaviorLogCard
                        key={log.id}
                        log={log}
                        linkedSensoryLog={sensoryByBehaviorId.get(log.id)}
                        authorName={memberMap.get(log.author_id)}
                        compact
                        onClick={canEditEntry(myRole, log.author_id, format(new Date(log.entry_date + 'T12:00:00'), 'yyyy-MM-dd'), user?.id, today)
                          ? () => { setEditingBehavior(log); setBehaviorSheetOpen(true) }
                          : undefined}
                        onLinkedSensoryClick={() => {
                          const linked = sensoryByBehaviorId.get(log.id)
                          if (linked) { setEditingSensory(linked); setSensorySheetOpen(true) }
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Today's sensory logs */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Sensory &amp; regulation
                    {sensoryLogs.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                        {sensoryLogs.length}
                      </span>
                    )}
                  </h2>
                  {canCreate(myRole) && (
                    <button
                      onClick={() => { setEditingSensory(null); setSensorySheetOpen(true) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500 text-white text-xs font-semibold hover:bg-violet-600 transition"
                    >
                      <ModuleIcon name="sensory" className="w-3.5 h-3.5" />
                      Log sensory
                    </button>
                  )}
                </div>

                {sensoryLogs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-violet-100 text-center">
                    <ModuleIcon name="sensory" className="w-6 h-6 text-violet-300" />
                    <p className="text-sm text-gray-400">No sensory events logged today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sensoryLogs.map(log => (
                      <SensoryLogCard
                        key={log.id}
                        log={log}
                        linkedBehaviorLog={log.behavior_log_id ? behaviorById.get(log.behavior_log_id) : null}
                        authorName={memberMap.get(log.author_id)}
                        compact
                        onClick={canEditEntry(myRole, log.author_id, format(new Date(log.entry_date + 'T12:00:00'), 'yyyy-MM-dd'), user?.id, today)
                          ? () => { setEditingSensory(log); setSensorySheetOpen(true) }
                          : undefined}
                        onLinkedBehaviorClick={() => {
                          const linked = log.behavior_log_id ? behaviorById.get(log.behavior_log_id) : null
                          if (linked) { setEditingBehavior(linked); setBehaviorSheetOpen(true) }
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Today's diet logs */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Diet &amp; nutrition
                    {dietLogs.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        {dietLogs.length}
                      </span>
                    )}
                  </h2>
                  {canCreate(myRole) && (
                    <button
                      onClick={() => { setEditingDiet(null); setDietSheetOpen(true) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition"
                    >
                      <ModuleIcon name="meal" className="w-3.5 h-3.5" />
                      Log diet
                    </button>
                  )}
                </div>

                {dietLogs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-emerald-100 text-center">
                    <ModuleIcon name="meal" className="w-6 h-6 text-emerald-300" />
                    <p className="text-sm text-gray-400">No diet entries today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dietLogs.map(log => (
                      <DietLogCard
                        key={log.id}
                        log={log}
                        authorName={memberMap.get(log.author_id)}
                        compact
                        onClick={canEditEntry(myRole, log.author_id, format(new Date(log.entry_date + 'T12:00:00'), 'yyyy-MM-dd'), user?.id, today)
                          ? () => { setEditingDiet(log); setDietSheetOpen(true) }
                          : undefined}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Sleep log — shows last night's entry (or tonight's draft) */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Sleep
                    {sleepLog && !sleepLog.bedtime && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                        Draft
                      </span>
                    )}
                  </h2>
                  {canCreate(myRole) && (
                    <button
                      onClick={() => setSleepSheetOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition"
                    >
                      <ModuleIcon name="sleep" className="w-3.5 h-3.5" />
                      {sleepLog ? 'Edit sleep' : 'Log sleep'}
                    </button>
                  )}
                </div>

                {sleepLog ? (
                  <SleepLogCard
                    log={sleepLog}
                    authorName={memberMap.get(sleepLog.author_id)}
                    compact
                    onClick={canEditSleepEntry(myRole, sleepLog.author_id, sleepLog.log_date, user?.id, today, yesterday)
                      ? () => setSleepSheetOpen(true)
                      : undefined}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-indigo-100 text-center">
                    <ModuleIcon name="sleep" className="w-6 h-6 text-indigo-300" />
                    <p className="text-sm text-gray-400">No sleep entry for last night</p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Behavior log sheet */}
      <BottomSheet
        open={behaviorSheetOpen}
        onClose={() => { setBehaviorSheetOpen(false); setEditingBehavior(null) }}
        title={editingBehavior ? 'Edit behavior log' : 'Log an incident'}
      >
        <BehaviorLogForm
          profileId={activeProfile.id}
          date={today}
          existingLog={editingBehavior}
          onSaved={() => {
            setBehaviorSheetOpen(false)
            setEditingBehavior(null)
            refetchBehavior()
            refetchSensory()
          }}
          onCancel={() => { setBehaviorSheetOpen(false); setEditingBehavior(null) }}
        />
      </BottomSheet>

      {/* Sensory log sheet */}
      <BottomSheet
        open={sensorySheetOpen}
        onClose={() => { setSensorySheetOpen(false); setEditingSensory(null) }}
        title={editingSensory ? 'Edit sensory log' : 'Log a sensory event'}
      >
        <SensoryLogForm
          profileId={activeProfile.id}
          date={today}
          existingLog={editingSensory}
          availableBehaviorLogs={behaviorLogs}
          onSaved={() => {
            setSensorySheetOpen(false)
            setEditingSensory(null)
            refetchSensory()
            refetchBehavior()
          }}
          onCancel={() => { setSensorySheetOpen(false); setEditingSensory(null) }}
        />
      </BottomSheet>

      {/* Diet sheet */}
      <BottomSheet
        open={dietSheetOpen}
        onClose={() => { setDietSheetOpen(false); setEditingDiet(null) }}
        title={editingDiet ? `Edit ${editingDiet.log_type} entry` : 'Log diet entry'}
      >
        <DietSheet
          profileId={activeProfile.id}
          date={today}
          existingLog={editingDiet}
          settings={dietSettings}
          onSaved={(updatedSettings?: Partial<DietSettings>) => {
            setDietSheetOpen(false)
            setEditingDiet(null)
            refetchDiet()
            if (updatedSettings) refetchDietSettings()
          }}
          onCancel={() => { setDietSheetOpen(false); setEditingDiet(null) }}
        />
      </BottomSheet>

      {/* Sleep sheet */}
      <BottomSheet
        open={sleepSheetOpen}
        onClose={() => setSleepSheetOpen(false)}
        title={sleepLog ? 'Edit sleep entry' : 'Log sleep'}
      >
        <SleepLogForm
          profileId={activeProfile.id}
          existingLog={sleepLog}
          onSaved={() => { setSleepSheetOpen(false); refetchSleep() }}
          onCancel={() => setSleepSheetOpen(false)}
        />
      </BottomSheet>
    </>
  )
}
