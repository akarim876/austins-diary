import { useState } from 'react'
import { format, startOfWeek, endOfWeek, addDays, subDays, parseISO } from 'date-fns'
import {
  AlertTriangle, Bell, BookOpen, Calendar,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Moon, Pill, Settings2, TrendingDown, TrendingUp, Minus,
} from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useQuickTiles } from '../hooks/useQuickTiles'
import { useGoals } from '../hooks/useGoals'
import { useProviders } from '../hooks/useProviders'
import { getTileDef } from '../lib/tileConstants'
import { qualityLabel } from '../lib/sleepConstants'
import { BottomSheet } from '../components/ui/BottomSheet'
import { BehaviorLogForm } from '../components/behavior/BehaviorLogForm'
import { SensoryLogForm } from '../components/sensory/SensoryLogForm'
import { DietSheet } from '../components/diet/DietSheet'
import { SleepLogForm } from '../components/sleep/SleepLogForm'
import { ProgressNoteForm } from '../components/goals/ProgressNoteForm'
import { AppointmentForm } from '../components/appointments/AppointmentForm'
import { BehaviorFrequencyChart } from '../components/dashboard/BehaviorFrequencyChart'
import { SleepDurationChart } from '../components/dashboard/SleepDurationChart'
import { RegulationDistributionChart } from '../components/dashboard/RegulationDistributionChart'
import { Spinner } from '../components/ui/Spinner'
import { HandoffNote } from '../components/dashboard/HandoffNote'
import { DailySchedule } from '../components/schedule/DailySchedule'
import { useHandoffNote } from '../hooks/useHandoffNote'
import { useDietSettings } from '../hooks/useDietSettings'
import { useMyRole, canCreate as _canCreate } from '../hooks/useMyRole'
import type { AttentionItem } from '../hooks/useDashboard'

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, children, className = '', action }: {
  title: string; children: React.ReactNode; className?: string; action?: React.ReactNode
}) {
  return (
    <section
      className={`overflow-hidden ${className}`}
      style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(51,50,46,0.07)' }}
    >
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9A9187' }}>{title}</h2>
        {action}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  )
}

function StatBadge({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string
}) {
  if (value === 0) return null
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${color}`}>
      <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center">{icon}</span>
      <span className="text-xs font-semibold">{value} {label}</span>
    </div>
  )
}

function TrendIcon({ curr, prev }: { curr: number; prev: number }) {
  if (curr > prev) return <TrendingUp className="w-3.5 h-3.5 text-red-500" />
  if (curr < prev) return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
  return <Minus className="w-3.5 h-3.5 text-gray-400" />
}

function AttentionCard({ item, onNavigate }: { item: AttentionItem; onNavigate: () => void }) {
  const cfg: Record<AttentionItem['type'], { icon: React.ElementType; iconColor: string; bg: string }> = {
    draft_sleep:   { icon: Moon,     iconColor: '#5B7B7A', bg: 'rgba(91,123,122,0.08)'  },
    appt_today:    { icon: Calendar, iconColor: '#C77B6A', bg: 'rgba(199,123,106,0.08)' },
    followup_today:{ icon: Bell,     iconColor: '#D99A6C', bg: 'rgba(217,154,108,0.10)' },
  }
  const { icon: Icon, iconColor, bg } = cfg[item.type]
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{ background: bg }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: '#33322E' }}>{item.label}</p>
        {item.sub && <p className="text-xs mt-0.5 truncate" style={{ color: '#9A9187' }}>{item.sub}</p>}
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user }         = useAuth()
  const { activeProfile } = useProfile()
  const navigate = useNavigate()

  // Date navigation
  const realTodayStr = format(new Date(), 'yyyy-MM-dd')
  const [viewDate, setViewDate] = useState(realTodayStr)
  const isViewingToday = viewDate === realTodayStr

  function goBack()    { setViewDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd')) }
  function goForward() { if (!isViewingToday) setViewDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd')) }
  function goToday()   { setViewDate(realTodayStr) }

  const db = useDashboard(activeProfile?.id ?? null, viewDate)

  // Per-user quick tiles config
  const { tiles: quickTileIds } = useQuickTiles(user?.id ?? null)

  // Data needed for optional tiles
  const { goals }     = useGoals(activeProfile?.id ?? null)
  const { providers } = useProviders(activeProfile?.id ?? null)

  // Handoff note
  const myRole = useMyRole(activeProfile?.id ?? null)
  const { data: handoffData, updaterName: handoffUpdater, save: saveHandoff } = useHandoffNote(activeProfile?.id ?? null)
  const { settings: dietSettings } = useDietSettings(activeProfile?.id ?? null)

  // Sheet state
  const [behaviorOpen,    setBehaviorOpen]    = useState(false)
  const [sensoryOpen,     setSensoryOpen]     = useState(false)
  const [dietOpen,        setDietOpen]        = useState(false)
  const [sleepOpen,       setSleepOpen]       = useState(false)
  const [progressOpen,    setProgressOpen]    = useState(false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [chartsOpen,      setChartsOpen]      = useState(false)

  const today     = new Date()
  const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), 'MMM d')
  const weekEnd   = format(endOfWeek(today,   { weekStartsOn: 0 }), 'MMM d')

  if (!activeProfile) return null

  const { todayCounts, attentionItems } = db

  // Build the "today at a glance" badge list
  const todayBadges: { label: string; value: number; icon: React.ReactNode; color: string }[] = [
    { label: 'diary',    value: todayCounts.diary,       icon: <BookOpen className="w-3.5 h-3.5" />,                            color: 'bg-brand-50 text-brand-700'   },
    { label: 'behavior', value: todayCounts.behavior,    icon: <ModuleIcon name="behavior"     className="w-3.5 h-3.5" />,       color: 'bg-amber-50 text-amber-700'   },
    { label: 'sensory',  value: todayCounts.sensory,     icon: <ModuleIcon name="sensory"      className="w-3.5 h-3.5" />,       color: 'bg-violet-50 text-violet-700' },
    { label: todayCounts.meals === 1 ? 'meal' : 'meals', value: todayCounts.meals, icon: <ModuleIcon name="meal" className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700' },
    { label: todayCounts.smoothies === 1 ? 'smoothie' : 'smoothies', value: todayCounts.smoothies, icon: <ModuleIcon name="smoothie" className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'supps',    value: todayCounts.supplements, icon: <Pill className="w-3.5 h-3.5" />,                                 color: 'bg-teal-50 text-teal-700'     },
    { label: 'meds',     value: todayCounts.medications, icon: <Pill className="w-3.5 h-3.5" />,                                 color: 'bg-teal-50 text-teal-700'     },
    { label: todayCounts.sleep === 1 ? 'sleep entry' : 'sleep entries', value: todayCounts.sleep, icon: <ModuleIcon name="sleep" className="w-3.5 h-3.5" />, color: 'bg-indigo-50 text-indigo-700' },
  ]
  const activeBadges = todayBadges.filter(b => b.value > 0)

  // Behavior trend
  const behaviorDiff = db.weekBehaviorCount - db.lastWeekBehaviorCount
  const behaviorTrendText = behaviorDiff === 0
    ? 'Same as last week'
    : behaviorDiff > 0
      ? `${behaviorDiff} more than last week`
      : `${Math.abs(behaviorDiff)} fewer than last week`

  // Sleep trend
  const sleepDiff = db.avgSleepHoursThisWeek != null && db.avgSleepHoursLastWeek != null
    ? db.avgSleepHoursThisWeek - db.avgSleepHoursLastWeek
    : null

  return (
    <div className="pb-28 w-full">

      {/* ── Page heading with date navigation ────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 flex flex-col items-center">
        <h1 className="font-display text-2xl font-semibold" style={{ color: '#33322E' }}>
          {isViewingToday ? 'Today' : format(parseISO(viewDate), 'EEEE')}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={goBack}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            style={{ color: '#9A9187', background: 'rgba(255,255,255,0.6)' }}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p
            className="text-sm font-data select-none"
            style={{ color: '#9A9187', cursor: !isViewingToday ? 'pointer' : 'default' }}
            onClick={!isViewingToday ? goToday : undefined}
            title={!isViewingToday ? 'Tap to go back to today' : undefined}
          >
            {format(parseISO(viewDate), 'MMMM d, yyyy')}
          </p>
          <button
            onClick={goForward}
            disabled={isViewingToday}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            style={{ color: '#9A9187', background: 'rgba(255,255,255,0.6)' }}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Handoff note ──────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <HandoffNote
          data={handoffData}
          updaterName={handoffUpdater}
          myRole={myRole}
          onSave={saveHandoff}
        />
      </div>

      {/* ── Quick-log tiles (today only) / locked notice (past days) ───────── */}
      {isViewingToday ? (() => {
        const tileHandlers: Record<string, () => void> = {
          smoothie:    () => setDietOpen(true),
          meal:        () => setDietOpen(true),
          behavior:    () => setBehaviorOpen(true),
          sensory:     () => setSensoryOpen(true),
          sleep:       () => setSleepOpen(true),
          progress:    () => setProgressOpen(true),
          appointment: () => setAppointmentOpen(true),
        }
        const count = quickTileIds.length
        const cols  = count <= 3 ? count : count === 4 ? 2 : 3
        return (
          <div className="px-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#9A9187' }}>Quick log</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {quickTileIds.map(id => {
                const def = getTileDef(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={tileHandlers[id]}
                    className="flex flex-col items-center gap-2 py-3 px-1 rounded-xl active:scale-95 transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    style={{ background: '#fff', boxShadow: '0 2px 10px rgba(51,50,46,0.07)' }}
                  >
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: def.iconBg }}>
                      <ModuleIcon name={def.icon} className="w-4 h-4" style={{ color: def.accent }} />
                    </span>
                    <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: '#33322E' }}>{def.label}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => navigate('/log')}
              className="w-full mt-2.5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              style={{ background: 'rgba(91,123,122,0.10)', color: '#5B7B7A' }}
            >
              + All entry types
            </button>
          </div>
        )
      })() : (
        <div className="px-4 pb-3">
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: 'rgba(51,50,46,0.04)', border: '1px solid rgba(51,50,46,0.08)' }}
          >
            <p className="text-xs font-medium leading-snug" style={{ color: '#6B6860' }}>
              Viewing {format(parseISO(viewDate), 'MMMM d')} — go to Today to log new entries.
            </p>
            <button
              onClick={goToday}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition"
              style={{ background: '#5B7B7A' }}
            >
              Go to Today
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-2 space-y-4">

        {/* ── Today at a glance ───────────────────────────────────────────────── */}
        <Section title={isViewingToday ? 'Today at a glance' : `${format(parseISO(viewDate), 'MMM d')} at a glance`}>
          <p className="text-sm font-semibold" style={{ color: '#33322E' }} />

          {db.loading ? (
            <div className="flex justify-center py-4"><Spinner className="w-5 h-5" /></div>
          ) : activeBadges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {activeBadges.map(b => (
                <StatBadge key={b.label} label={b.label} value={b.value} icon={b.icon} color={b.color} />
              ))}
            </div>
          ) : (
            <p className="text-sm mb-3" style={{ color: '#9A9187' }}>Nothing logged yet — tap Quick log above.</p>
          )}

          {attentionItems.length > 0 && (
            <div className="space-y-2 pt-1" style={{ borderTop: '1px solid #EDE9E3' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: '#9A9187' }}>Needs attention</p>
              {attentionItems.map(item => (
                <AttentionCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onNavigate={() => {
                    if (item.type === 'draft_sleep') setSleepOpen(true)
                    else if (item.type === 'appt_today') navigate('/providers')
                    else if (item.type === 'followup_today') navigate('/calendar')
                  }}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── Daily schedule ───────────────────────────────────────────────────── */}
        <Section
          title={isViewingToday ? "Today's schedule" : `${format(parseISO(viewDate), 'MMM d')} schedule`}
          action={
            <button
              onClick={() => navigate('/schedule-settings')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-80"
              style={{ color: '#5B7B7A', background: 'rgba(91,123,122,0.08)' }}
            >
              <Settings2 className="w-3 h-3" />
              Edit template
            </button>
          }
        >
          <DailySchedule
            profileId={activeProfile.id}
            date={viewDate}
            myRole={myRole}
            onLogBehavior={() => setBehaviorOpen(true)}
          />
        </Section>

        {/* ── This Week ───────────────────────────────────────────────────────── */}
        <Section title={`This week  ${weekStart} - ${weekEnd}`}>
          {db.loading ? (
            <div className="flex justify-center py-4"><Spinner className="w-5 h-5" /></div>
          ) : (
            <div className="space-y-3 mt-1">

              {/* Behavior */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <ModuleIcon name="behavior" className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {db.weekBehaviorCount} behavior {db.weekBehaviorCount === 1 ? 'incident' : 'incidents'}
                    </span>
                    <TrendIcon curr={db.weekBehaviorCount} prev={db.lastWeekBehaviorCount} />
                  </div>
                  <p className="text-xs text-gray-500">{behaviorTrendText}</p>
                  {db.topAntecedents.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Top trigger{db.topAntecedents.length > 1 ? 's' : ''}:{' '}
                      {db.topAntecedents.map(a => a.antecedent).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #EDE9E3' }} />

              {/* Sleep */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <ModuleIcon name="sleep" className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1">
                  {db.avgSleepHoursThisWeek != null ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900">
                          Avg {db.avgSleepHoursThisWeek.toFixed(1)}h sleep
                        </span>
                        {sleepDiff != null && (
                          <TrendIcon curr={db.avgSleepHoursThisWeek} prev={db.avgSleepHoursLastWeek!} />
                        )}
                      </div>
                      {sleepDiff != null && (
                        <p className="text-xs text-gray-500">
                          {sleepDiff > 0 ? '+' : ''}{sleepDiff.toFixed(1)}h vs prev week
                        </p>
                      )}
                      {db.avgSleepQualityThisWeek != null && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Avg quality: {qualityLabel(Math.round(db.avgSleepQualityThisWeek))}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No completed sleep entries this week</p>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #EDE9E3' }} />

              {/* Smoothies */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <ModuleIcon name="smoothie" className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {db.smoothiesThisWeek}/{db.smoothiesExpected} smoothies
                    </span>
                    {db.smoothiesThisWeek >= db.smoothiesExpected
                      ? <span className="text-xs font-medium text-emerald-600">✓ On track</span>
                      : db.smoothiesExpected > 0
                        ? <span className="text-xs text-gray-400">{db.smoothiesExpected - db.smoothiesThisWeek} missed</span>
                        : null
                    }
                  </div>
                  <p className="text-xs text-gray-500">Logged vs. 2/day expected</p>
                </div>
              </div>

              {/* Stalled goals */}
              {db.stalledGoals.length > 0 && (
                <>
                  <div style={{ borderTop: '1px solid #EDE9E3' }} />
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {db.stalledGoals.length} goal{db.stalledGoals.length > 1 ? 's' : ''} with no recent progress
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">No progress notes in the last 14 days</p>
                      <div className="mt-1.5 space-y-1">
                        {db.stalledGoals.slice(0, 3).map(g => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => navigate(`/goals/${g.id}`)}
                            className="flex items-center gap-1.5 text-xs text-brand-600 font-medium hover:text-brand-700"
                          >
                            <ModuleIcon name="goals" className="w-3 h-3" />
                            {g.title}
                          </button>
                        ))}
                        {db.stalledGoals.length > 3 && (
                          <button
                            type="button"
                            onClick={() => navigate('/goals')}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            +{db.stalledGoals.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </Section>

        {/* ── Charts ──────────────────────────────────────────────────────────── */}
        <section className="overflow-hidden" style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(51,50,46,0.07)' }}>
          <button
            type="button"
            onClick={() => setChartsOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9A9187' }}>Trends &amp; charts</span>
            {chartsOpen
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>

          {chartsOpen && (
            <div className="px-4 pb-5 space-y-6">
              {/* Behavior 30 days */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <ModuleIcon name="behavior" className="w-3.5 h-3.5 text-amber-500" />
                  Behavior incidents — last 30 days
                </p>
                {db.loading
                  ? <div className="flex justify-center py-6"><Spinner className="w-5 h-5" /></div>
                  : <BehaviorFrequencyChart data={db.behaviorChart} />
                }
              </div>

              {/* Sleep 30 days */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <ModuleIcon name="sleep" className="w-3.5 h-3.5 text-indigo-500" />
                  Sleep duration — last 30 days
                </p>
                {db.loading
                  ? <div className="flex justify-center py-6"><Spinner className="w-5 h-5" /></div>
                  : <SleepDurationChart data={db.sleepChart} />
                }
                <p className="text-[10px] text-gray-400 mt-1">Dashed line = 9h reference</p>
              </div>

              {/* Regulation this week */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <ModuleIcon name="sensory" className="w-3.5 h-3.5 text-violet-500" />
                  Regulation zones — this week
                </p>
                {db.loading
                  ? <div className="flex justify-center py-6"><Spinner className="w-5 h-5" /></div>
                  : <RegulationDistributionChart data={db.regulationChart} />
                }
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ── Quick-log sheets ─────────────────────────────────────────────────── */}
      <BottomSheet open={behaviorOpen} onClose={() => setBehaviorOpen(false)} title="Log behavior">
        <BehaviorLogForm
          profileId={activeProfile.id}
          date={realTodayStr}
          onSaved={() => setBehaviorOpen(false)}
          onCancel={() => setBehaviorOpen(false)}
        />
      </BottomSheet>

      <BottomSheet open={sensoryOpen} onClose={() => setSensoryOpen(false)} title="Log sensory/regulation">
        <SensoryLogForm
          profileId={activeProfile.id}
          date={realTodayStr}
          onSaved={() => setSensoryOpen(false)}
          onCancel={() => setSensoryOpen(false)}
        />
      </BottomSheet>

      <BottomSheet open={dietOpen} onClose={() => setDietOpen(false)} title="Log diet">
        <DietSheet
          profileId={activeProfile.id}
          date={realTodayStr}
          settings={dietSettings}
          onSaved={() => setDietOpen(false)}
          onCancel={() => setDietOpen(false)}
        />
      </BottomSheet>

      <BottomSheet open={sleepOpen} onClose={() => setSleepOpen(false)} title="Log sleep">
        <SleepLogForm
          profileId={activeProfile.id}
          onSaved={() => setSleepOpen(false)}
          onCancel={() => setSleepOpen(false)}
        />
      </BottomSheet>

      <BottomSheet open={progressOpen} onClose={() => setProgressOpen(false)} title="Log goal progress">
        <ProgressNoteForm
          profileId={activeProfile.id}
          availableGoals={goals}
          onSaved={() => setProgressOpen(false)}
          onCancel={() => setProgressOpen(false)}
        />
      </BottomSheet>

      <BottomSheet open={appointmentOpen} onClose={() => setAppointmentOpen(false)} title="Log appointment">
        <AppointmentForm
          profileId={activeProfile.id}
          providers={providers}
          onSaved={() => setAppointmentOpen(false)}
          onCancel={() => setAppointmentOpen(false)}
        />
      </BottomSheet>
    </div>
  )
}
