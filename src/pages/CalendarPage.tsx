import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, compareDesc, subDays } from 'date-fns'
import { CalendarDays, ChevronDown, PenLine, X } from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { useDiaryEntries, useDiaryEntry } from '../hooks/useDiaryEntries'
import { useBehaviorLogs, useBehaviorLogsForDate } from '../hooks/useBehaviorLogs'
import { useSensoryLogs, useSensoryLogsForDate } from '../hooks/useSensoryLogs'
import { useDietLogs, useDietLogsForDate } from '../hooks/useDietLogs'
import { useDietSettings } from '../hooks/useDietSettings'
import { useSleepLogs, useSleepLogForDate } from '../hooks/useSleepLogs'
import { useProgressNotes, useProgressNotesForDate } from '../hooks/useProgressNotes'
import { useGoals } from '../hooks/useGoals'
import { useAppointments, useAppointmentsForDate } from '../hooks/useAppointments'
import { useProviders } from '../hooks/useProviders'
import { useProfileMembers } from '../hooks/useProfileMembers'
import { useMyRole, canCreate, canEditEntry, canEditSleepEntry } from '../hooks/useMyRole'
import { CalendarView } from '../components/calendar/CalendarView'
import { DiaryEntryForm } from '../components/diary/DiaryEntryForm'
import { EntryPreviewCard } from '../components/diary/EntryPreviewCard'
import { BehaviorLogCard } from '../components/behavior/BehaviorLogCard'
import { BehaviorLogForm } from '../components/behavior/BehaviorLogForm'
import { SensoryLogCard } from '../components/sensory/SensoryLogCard'
import { SensoryLogForm } from '../components/sensory/SensoryLogForm'
import { DietLogCard } from '../components/diet/DietLogCard'
import { DietSheet } from '../components/diet/DietSheet'
import { SleepLogCard } from '../components/sleep/SleepLogCard'
import { SleepLogForm } from '../components/sleep/SleepLogForm'
import { ProgressNoteCard } from '../components/goals/ProgressNoteCard'
import { ProgressNoteForm } from '../components/goals/ProgressNoteForm'
import { AppointmentCard } from '../components/appointments/AppointmentCard'
import { AppointmentForm } from '../components/appointments/AppointmentForm'
import { DailySchedule } from '../components/schedule/DailySchedule'
import { FollowupReminderCard } from '../components/appointments/FollowupReminderCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import { SecureImage } from '../components/ui/SecureImage'
import type { Appointment, BehaviorLog, DietLog, DietSettings, ProgressNote, SensoryLog, SleepLog } from '../types'

export function CalendarPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const myRole = useMyRole(activeProfile?.id ?? null)
  const [editingDiary, setEditingDiary] = useState(false)

  const [behaviorSheetOpen, setBehaviorSheetOpen] = useState(false)
  const [editingBehavior, setEditingBehavior] = useState<BehaviorLog | null>(null)

  const [sensorySheetOpen, setSensorySheetOpen] = useState(false)
  const [editingSensory, setEditingSensory] = useState<SensoryLog | null>(null)

  const [dietSheetOpen, setDietSheetOpen] = useState(false)
  const [editingDiet, setEditingDiet] = useState<DietLog | null>(null)

  const [sleepSheetOpen, setSleepSheetOpen] = useState(false)

  const [progressSheetOpen, setProgressSheetOpen] = useState(false)
  const [editingProgress, setEditingProgress] = useState<ProgressNote | null>(null)

  const [apptSheetOpen,          setApptSheetOpen]          = useState(false)
  const [editingAppt,            setEditingAppt]            = useState<Appointment | null>(null)
  /** Set when the appointment form is being opened to convert a follow-up into a new appointment. */
  const [convertingFromFollowup, setConvertingFromFollowup] = useState<Appointment | null>(null)

  const [feedOpen, setFeedOpen] = useState(false)

  const { entries, loading: entriesLoading, refetch: refetchEntries } = useDiaryEntries(activeProfile?.id ?? null)
  const { logs: allBehavior, loading: behaviorLoading, refetch: refetchAllBehavior } = useBehaviorLogs(activeProfile?.id ?? null)
  const { logs: allSensory, loading: sensoryLoading, refetch: refetchAllSensory } = useSensoryLogs(activeProfile?.id ?? null)
  const { logs: allDiet, loading: dietLoading, refetch: refetchAllDiet } = useDietLogs(activeProfile?.id ?? null)
  const { logs: allSleep, loading: sleepLoading, refetch: refetchAllSleep } = useSleepLogs(activeProfile?.id ?? null)
  const { notes: allProgress, loading: progressLoading, refetch: refetchAllProgress } = useProgressNotes(activeProfile?.id ?? null)
  const { goals } = useGoals(activeProfile?.id ?? null)
  const { appointments: allAppts, loading: apptLoading, refetch: refetchAllAppts } = useAppointments(activeProfile?.id ?? null)
  const { providers } = useProviders(activeProfile?.id ?? null)
  const { settings: dietSettings, refetch: refetchDietSettings } = useDietSettings(activeProfile?.id ?? null)
  const memberMap = useProfileMembers(activeProfile?.id ?? null)
  const { entry: selectedEntry, refetch: refetchEntry } = useDiaryEntry(activeProfile?.id ?? null, selectedDate)
  const { logs: dayBehavior, refetch: refetchDayBehavior } = useBehaviorLogsForDate(activeProfile?.id ?? null, selectedDate)
  const { logs: daySensory, refetch: refetchDaySensory } = useSensoryLogsForDate(activeProfile?.id ?? null, selectedDate)
  const { logs: dayDiet, refetch: refetchDayDiet } = useDietLogsForDate(activeProfile?.id ?? null, selectedDate)
  const { log: daySleep, refetch: refetchDaySleep } = useSleepLogForDate(activeProfile?.id ?? null, selectedDate)
  const { notes: dayProgress, refetch: refetchDayProgress } = useProgressNotesForDate(activeProfile?.id ?? null, selectedDate)
  const { appointments: dayAppts, refetch: refetchDayAppts } = useAppointmentsForDate(activeProfile?.id ?? null, selectedDate)
  const goalById     = new Map(goals.map(g => [g.id, g]))
  const providerById = new Map(providers.map(p => [p.id, p]))

  // Follow-up reminders: appointments whose followup_date === selectedDate
  const dayFollowups = allAppts.filter(
    a => a.followup_needed && a.followup_date === selectedDate
  )

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 px-8 text-center">
        <CalendarDays className="w-12 h-12 text-brand-300" />
        <p className="text-sm text-gray-500">No profile selected. Set one up in the Profile tab.</p>
      </div>
    )
  }

  const loading = entriesLoading || behaviorLoading || sensoryLoading || dietLoading || sleepLoading || progressLoading || apptLoading
  if (loading) {
    return <div className="flex items-center justify-center flex-1"><Spinner className="w-8 h-8" /></div>
  }

  // Cross-reference maps for linked-entry display
  const sensoryByBehaviorId = new Map(
    allSensory.filter(s => s.behavior_log_id).map(s => [s.behavior_log_id!, s])
  )
  const behaviorById = new Map(allBehavior.map(b => [b.id, b]))
  const daySensoryByBehaviorId = new Map(
    daySensory.filter(s => s.behavior_log_id).map(s => [s.behavior_log_id!, s])
  )
  const dayBehaviorById = new Map(dayBehavior.map(b => [b.id, b]))

  // Interleaved recent feed
  const recentFeed = [
    ...entries.map(e => ({ type: 'diary' as const, date: e.entry_date, item: e })),
    ...allBehavior.map(l => ({ type: 'behavior' as const, date: l.entry_date, item: l })),
    ...allSensory.map(l => ({ type: 'sensory' as const, date: l.entry_date, item: l })),
    ...allDiet.map(l => ({ type: 'diet' as const, date: l.entry_date, item: l })),
    ...allSleep.map(l => ({ type: 'sleep' as const, date: l.log_date, item: l })),
    ...allProgress.map(n => ({ type: 'progress' as const, date: n.note_date, item: n })),
    ...allAppts.map(a => ({ type: 'appt' as const, date: a.appt_date, item: a })),
  ]
    .sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date)))
    .slice(0, 20)

  function handleSelectDate(date: string) {
    setSelectedDate(date)
    setEditingDiary(false)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-4">
          <CalendarView
            entries={entries}
            behaviorLogs={allBehavior}
            sensoryLogs={allSensory}
            dietLogs={allDiet}
            sleepLogs={allSleep}
            progressNotes={allProgress}
            appointments={allAppts}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

          {/* Selected day panel */}
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-200 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d')}
                </h3>
                {editingDiary && (
                  <button onClick={() => setEditingDiary(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {canCreate(myRole) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => { setEditingBehavior(null); setBehaviorSheetOpen(true) }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(198,168,75,0.12)', color: '#C6A84B', border: '1px solid rgba(198,168,75,0.28)' }}
                  >
                    <ModuleIcon name="behavior" className="w-3 h-3" /> Incident
                  </button>
                  <button
                    onClick={() => { setEditingSensory(null); setSensorySheetOpen(true) }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(155,142,196,0.12)', color: '#9B8EC4', border: '1px solid rgba(155,142,196,0.28)' }}
                  >
                    <ModuleIcon name="sensory" className="w-3 h-3" /> Sensory
                  </button>
                  <button
                    onClick={() => { setEditingDiet(null); setDietSheetOpen(true) }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(124,180,143,0.12)', color: '#7CB48F', border: '1px solid rgba(124,180,143,0.28)' }}
                  >
                    <ModuleIcon name="meal" className="w-3 h-3" /> Diet
                  </button>
                  <button
                    onClick={() => setSleepSheetOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(104,117,200,0.12)', color: '#6875C8', border: '1px solid rgba(104,117,200,0.28)' }}
                  >
                    <ModuleIcon name="sleep" className="w-3 h-3" /> Sleep
                  </button>
                  {goals.some(g => g.status === 'active') && (
                    <button
                      onClick={() => { setEditingProgress(null); setProgressSheetOpen(true) }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(91,123,122,0.12)', color: '#5B7B7A', border: '1px solid rgba(91,123,122,0.28)' }}
                    >
                      <ModuleIcon name="goals" className="w-3 h-3" /> Progress
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingAppt(null); setApptSheetOpen(true) }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(212,115,95,0.12)', color: '#D4735F', border: '1px solid rgba(212,115,95,0.28)' }}
                  >
                    <ModuleIcon name="appointments" className="w-3 h-3" /> Appt
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Diary entry section */}
              {editingDiary ? (
                <DiaryEntryForm
                  profileId={activeProfile.id}
                  date={selectedDate}
                  existingEntry={selectedEntry}
                  onSaved={() => { refetchEntries(); refetchEntry(); setEditingDiary(false) }}
                />
              ) : selectedEntry ? (
                <div className="space-y-3">
                  {selectedEntry.photo_url && (
                    <div className="rounded-xl overflow-hidden aspect-video bg-gray-100">
                      <SecureImage path={selectedEntry.photo_url} alt="Entry photo" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {selectedEntry.note && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedEntry.note}</p>
                  )}
                  {selectedEntry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEntry.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-xl bg-brand-50 text-brand-600 text-xs font-semibold">{tag}</span>
                      ))}
                    </div>
                  )}
                  {canEditEntry(myRole, selectedEntry.author_id, selectedDate, user?.id, today) && (
                    <button
                      onClick={() => setEditingDiary(true)}
                      className="w-full py-2 rounded-xl border border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 transition"
                    >
                      Edit diary entry
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <PenLine className="w-7 h-7 text-gray-300" />
                  <p className="text-sm text-gray-500">No diary entry for this day</p>
                  {canCreate(myRole) && (
                    <button
                      onClick={() => setEditingDiary(true)}
                      className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition"
                    >
                      Write entry
                    </button>
                  )}
                </div>
              )}

              {/* Behavior logs for selected day */}
              {dayBehavior.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-warm-200">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide pt-1">
                    Behavior logs ({dayBehavior.length})
                  </p>
                  {dayBehavior.map(log => (
                    <BehaviorLogCard
                      key={log.id}
                      log={log}
                      linkedSensoryLog={daySensoryByBehaviorId.get(log.id)}
                      authorName={memberMap.get(log.author_id)}
                      compact
                      onClick={canEditEntry(myRole, log.author_id, selectedDate, user?.id, today)
                        ? () => { setEditingBehavior(log); setBehaviorSheetOpen(true) }
                        : undefined}
                      onLinkedSensoryClick={() => {
                        const linked = daySensoryByBehaviorId.get(log.id)
                        if (linked) { setEditingSensory(linked); setSensorySheetOpen(true) }
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Sensory logs for selected day */}
              {daySensory.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-warm-200">
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide pt-1">
                    Sensory &amp; regulation ({daySensory.length})
                  </p>
                  {daySensory.map(log => (
                    <SensoryLogCard
                      key={log.id}
                      log={log}
                      linkedBehaviorLog={log.behavior_log_id ? dayBehaviorById.get(log.behavior_log_id) : null}
                      authorName={memberMap.get(log.author_id)}
                      compact
                      onClick={canEditEntry(myRole, log.author_id, selectedDate, user?.id, today)
                        ? () => { setEditingSensory(log); setSensorySheetOpen(true) }
                        : undefined}
                      onLinkedBehaviorClick={() => {
                        const linked = log.behavior_log_id ? dayBehaviorById.get(log.behavior_log_id) : null
                        if (linked) { setEditingBehavior(linked); setBehaviorSheetOpen(true) }
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Diet logs for selected day */}
              {dayDiet.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-warm-200">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide pt-1">
                    Diet &amp; nutrition ({dayDiet.length})
                  </p>
                  {dayDiet.map(log => (
                    <DietLogCard
                      key={log.id}
                      log={log}
                      authorName={memberMap.get(log.author_id)}
                      compact
                      onClick={canEditEntry(myRole, log.author_id, selectedDate, user?.id, today)
                        ? () => { setEditingDiet(log); setDietSheetOpen(true) }
                        : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Sleep log for selected day */}
              {daySleep && (
                <div className="space-y-2 pt-1 border-t border-warm-200">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide pt-1">
                    Sleep
                  </p>
                  <SleepLogCard
                    log={daySleep}
                    authorName={memberMap.get(daySleep.author_id)}
                    compact
                    onClick={canEditSleepEntry(myRole, daySleep.author_id, daySleep.log_date, user?.id, today, yesterday)
                      ? () => setSleepSheetOpen(true)
                      : undefined}
                  />
                </div>
              )}

              {/* Follow-up reminders for selected day */}
              {dayFollowups.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-warm-200">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide pt-1">
                    Follow-up reminders ({dayFollowups.length})
                  </p>
                  {dayFollowups.map(appt => (
                    <FollowupReminderCard
                      key={`followup-${appt.id}`}
                      appointment={appt}
                      provider={appt.provider_id ? providerById.get(appt.provider_id) : null}
                      onViewOriginal={() => { setEditingAppt(appt); setApptSheetOpen(true) }}
                      onConvert={() => {
                        setConvertingFromFollowup(appt)
                        setEditingAppt(null)
                        setApptSheetOpen(true)
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Appointments for selected day */}
              {dayAppts.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-warm-200">
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide pt-1">
                    Appointments ({dayAppts.length})
                  </p>
                  {dayAppts.map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      provider={appt.provider_id ? providerById.get(appt.provider_id) : null}
                      authorName={memberMap.get(appt.author_id)}
                      compact
                      onClick={canCreate(myRole) ? () => { setEditingAppt(appt); setApptSheetOpen(true) } : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Progress notes for selected day */}
              {dayProgress.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-warm-200">
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide pt-1">
                    Progress notes ({dayProgress.length})
                  </p>
                  {dayProgress.map(note => (
                    <ProgressNoteCard
                      key={note.id}
                      note={note}
                      goal={goalById.get(note.goal_id)}
                      authorName={memberMap.get(note.author_id)}
                      compact
                      onClick={() => {
                        if (canEditEntry(myRole, note.author_id, note.note_date, user?.id, today)) {
                          setEditingProgress(note)
                          setProgressSheetOpen(true)
                        } else {
                          navigate(`/goals/${note.goal_id}`)
                        }
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Daily schedule for selected day */}
              <div className="space-y-2 pt-1 border-t border-warm-200">
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide pt-1">
                  Daily schedule
                </p>
                <DailySchedule
                  profileId={activeProfile.id}
                  date={selectedDate}
                  myRole={myRole}
                  compact
                />
              </div>
            </div>
          </div>

          {/* Recent interleaved feed */}
          {recentFeed.length > 0 && (
            <div>
              <button
                onClick={() => setFeedOpen(o => !o)}
                className="flex items-center justify-between w-full px-1 mb-3 group"
              >
                <h3 className="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">
                  Recent activity
                  <span className="ml-2 text-xs font-normal text-gray-400">({recentFeed.length})</span>
                </h3>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${feedOpen ? 'rotate-180' : ''}`} />
              </button>
              {feedOpen && <div className="space-y-3">
                {recentFeed.map(({ type, date: feedDate, item }) => {
                  if (type === 'diary') {
                    const de = item as import('../types').DiaryEntry
                    return (
                      <EntryPreviewCard
                        key={`diary-${de.id}`}
                        entry={de}
                        authorName={memberMap.get(de.author_id)}
                        onClick={() => handleSelectDate(de.entry_date)}
                      />
                    )
                  }
                  if (type === 'behavior') {
                    const bl = item as BehaviorLog
                    const blCanEdit = canEditEntry(myRole, bl.author_id, feedDate, user?.id, today)
                    return (
                      <BehaviorLogCard
                        key={`behavior-${bl.id}`}
                        log={bl}
                        linkedSensoryLog={sensoryByBehaviorId.get(bl.id)}
                        authorName={memberMap.get(bl.author_id)}
                        onClick={blCanEdit ? () => {
                          handleSelectDate(feedDate)
                          setEditingBehavior(bl)
                          setBehaviorSheetOpen(true)
                        } : () => handleSelectDate(feedDate)}
                        onLinkedSensoryClick={() => {
                          const linked = sensoryByBehaviorId.get(bl.id)
                          if (linked) { setEditingSensory(linked); setSensorySheetOpen(true) }
                        }}
                      />
                    )
                  }
                  // sensory
                  if (type === 'sensory') {
                    const sl = item as SensoryLog
                    const slCanEdit = canEditEntry(myRole, sl.author_id, feedDate, user?.id, today)
                    return (
                      <SensoryLogCard
                        key={`sensory-${sl.id}`}
                        log={sl}
                        linkedBehaviorLog={sl.behavior_log_id ? behaviorById.get(sl.behavior_log_id) : null}
                        authorName={memberMap.get(sl.author_id)}
                        onClick={slCanEdit ? () => {
                          handleSelectDate(feedDate)
                          setEditingSensory(sl)
                          setSensorySheetOpen(true)
                        } : () => handleSelectDate(feedDate)}
                        onLinkedBehaviorClick={() => {
                          const linked = sl.behavior_log_id ? behaviorById.get(sl.behavior_log_id) : null
                          if (linked) { setEditingBehavior(linked); setBehaviorSheetOpen(true) }
                        }}
                      />
                    )
                  }
                  if (type === 'diet') {
                    const dl = item as DietLog
                    const dlCanEdit = canEditEntry(myRole, dl.author_id, feedDate, user?.id, today)
                    return (
                      <DietLogCard
                        key={`diet-${dl.id}`}
                        log={dl}
                        authorName={memberMap.get(dl.author_id)}
                        onClick={dlCanEdit ? () => {
                          handleSelectDate(feedDate)
                          setEditingDiet(dl)
                          setDietSheetOpen(true)
                        } : () => handleSelectDate(feedDate)}
                      />
                    )
                  }
                  if (type === 'sleep') {
                    const sl2 = item as SleepLog
                    const sl2CanEdit = canEditSleepEntry(myRole, sl2.author_id, sl2.log_date, user?.id, today, yesterday)
                    return (
                      <SleepLogCard
                        key={`sleep-${sl2.id}`}
                        log={sl2}
                        authorName={memberMap.get(sl2.author_id)}
                        compact
                        onClick={sl2CanEdit ? () => {
                          handleSelectDate(sl2.log_date)
                          setSleepSheetOpen(true)
                        } : () => handleSelectDate(sl2.log_date)}
                      />
                    )
                  }
                  if (type === 'progress') {
                    const pn = item as ProgressNote
                    return (
                      <ProgressNoteCard
                        key={`progress-${pn.id}`}
                        note={pn}
                        goal={goalById.get(pn.goal_id)}
                        authorName={memberMap.get(pn.author_id)}
                        compact
                        onClick={() => navigate(`/goals/${pn.goal_id}`)}
                      />
                    )
                  }
                  // appointment
                  const apptItem = item as Appointment
                  return (
                    <AppointmentCard
                      key={`appt-${apptItem.id}`}
                      appointment={apptItem}
                      provider={apptItem.provider_id ? providerById.get(apptItem.provider_id) : null}
                      authorName={memberMap.get(apptItem.author_id)}
                      compact
                      onClick={() => { handleSelectDate(apptItem.appt_date); setEditingAppt(apptItem); setApptSheetOpen(true) }}
                    />
                  )
                })}
              </div>}
            </div>
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
          date={selectedDate}
          existingLog={editingBehavior}
          onSaved={() => {
            setBehaviorSheetOpen(false)
            setEditingBehavior(null)
            refetchAllBehavior()
            refetchDayBehavior()
            refetchAllSensory()
            refetchDaySensory()
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
          date={selectedDate}
          existingLog={editingSensory}
          availableBehaviorLogs={dayBehavior}
          onSaved={() => {
            setSensorySheetOpen(false)
            setEditingSensory(null)
            refetchAllSensory()
            refetchDaySensory()
            refetchAllBehavior()
            refetchDayBehavior()
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
          date={selectedDate}
          existingLog={editingDiet}
          settings={dietSettings}
          onSaved={(updatedSettings?: Partial<DietSettings>) => {
            setDietSheetOpen(false)
            setEditingDiet(null)
            refetchAllDiet()
            refetchDayDiet()
            if (updatedSettings) refetchDietSettings()
          }}
          onCancel={() => { setDietSheetOpen(false); setEditingDiet(null) }}
        />
      </BottomSheet>

      {/* Sleep sheet */}
      <BottomSheet
        open={sleepSheetOpen}
        onClose={() => setSleepSheetOpen(false)}
        title={daySleep ? 'Edit sleep entry' : 'Log sleep'}
      >
        <SleepLogForm
          profileId={activeProfile.id}
          existingLog={daySleep}
          onSaved={() => {
            setSleepSheetOpen(false)
            refetchAllSleep()
            refetchDaySleep()
          }}
          onCancel={() => setSleepSheetOpen(false)}
        />
      </BottomSheet>

      {/* Progress note sheet */}
      <BottomSheet
        open={progressSheetOpen}
        onClose={() => { setProgressSheetOpen(false); setEditingProgress(null) }}
        title={editingProgress ? 'Edit progress note' : 'Log progress'}
      >
        <ProgressNoteForm
          profileId={activeProfile.id}
          availableGoals={goals}
          existingNote={editingProgress}
          defaultDate={selectedDate}
          onSaved={() => {
            setProgressSheetOpen(false)
            setEditingProgress(null)
            refetchAllProgress()
            refetchDayProgress()
          }}
          onCancel={() => { setProgressSheetOpen(false); setEditingProgress(null) }}
        />
      </BottomSheet>

      {/* Appointment sheet */}
      <BottomSheet
        open={apptSheetOpen}
        onClose={() => {
          setApptSheetOpen(false)
          setEditingAppt(null)
          setConvertingFromFollowup(null)
        }}
        title={
          convertingFromFollowup
            ? 'Convert follow-up to appointment'
            : editingAppt
              ? 'Edit appointment'
              : 'New appointment'
        }
      >
        <AppointmentForm
          profileId={activeProfile.id}
          providers={providers}
          existingAppt={editingAppt}
          defaultDate={convertingFromFollowup?.followup_date ?? selectedDate}
          defaultProviderId={convertingFromFollowup?.provider_id ?? undefined}
          onSaved={async (_, newProvider) => {
            // If this was a conversion, clear the follow-up on the original appointment
            if (convertingFromFollowup) {
              await supabase
                .from('appointments')
                .update({ followup_needed: false, followup_text: null, followup_date: null })
                .eq('id', convertingFromFollowup.id)
            }
            setApptSheetOpen(false)
            setEditingAppt(null)
            setConvertingFromFollowup(null)
            refetchAllAppts()
            refetchDayAppts()
            if (newProvider) { /* providers list auto-refetches via useProviders */ }
          }}
          onCancel={() => {
            setApptSheetOpen(false)
            setEditingAppt(null)
            setConvertingFromFollowup(null)
          }}
        />
      </BottomSheet>
    </>
  )
}
