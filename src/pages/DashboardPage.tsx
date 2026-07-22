import { lazy, Suspense, useRef, useState } from 'react'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import {
  AlertTriangle, Bell, BookOpen, Calendar,
  Moon, Pill, Settings2, TrendingDown, TrendingUp, Minus,
} from 'lucide-react'
import { WeekStrip } from '../components/calendar/WeekStrip'
import type { WeekStripHandle } from '../components/calendar/WeekStrip'
import { useWeekDots } from '../hooks/useWeekDots'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useQuickTiles } from '../hooks/useQuickTiles'
import { useGoals } from '../hooks/useGoals'
import { useProviders } from '../hooks/useProviders'
import { useCustomTrackers } from '../hooks/useCustomTrackers'
import { getTileDef } from '../lib/tileConstants'
import { getTrackerIcon, trackerIconBg } from '../lib/trackerIcons'
import { qualityLabel } from '../lib/sleepConstants'
import { BottomSheet } from '../components/ui/BottomSheet'
import { BehaviorLogForm } from '../components/behavior/BehaviorLogForm'
import { SensoryLogForm } from '../components/sensory/SensoryLogForm'
import { DietSheet } from '../components/diet/DietSheet'
import { SleepLogForm } from '../components/sleep/SleepLogForm'
import { ProgressNoteForm } from '../components/goals/ProgressNoteForm'
import { AppointmentForm } from '../components/appointments/AppointmentForm'
import { QuickMoodDrawer } from '../components/sensory/QuickMoodDrawer'
import { CustomTrackerLogForm } from '../components/tracker/CustomTrackerLogForm'
import { WeeklyBubbleChart } from '../components/dashboard/WeeklyBubbleChart'
import type { BubbleData } from '../components/dashboard/WeeklyBubbleChart'
import type { CorrelationPoint } from '../components/dashboard/BehaviorSleepCorrelationChart'
import { computeSleepBehaviorInsight } from '../lib/dashboardInsights'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { Spinner } from '../components/ui/Spinner'
import { HandoffNote } from '../components/dashboard/HandoffNote'
import { DailySchedule } from '../components/schedule/DailySchedule'
import { UnfiledNotes } from '../components/dashboard/UnfiledNotes'
import { useHandoffNote } from '../hooks/useHandoffNote'
import { useDietSettings } from '../hooks/useDietSettings'
import { useQuickNotes } from '../hooks/useQuickNotes'
import { useMyRole, canCreate as _canCreate } from '../hooks/useMyRole'
import type { AttentionItem } from '../hooks/useDashboard'

// The Trends charts pull in `recharts`, which is otherwise unused elsewhere in
// the eagerly-bundled Dashboard/Log routes. Lazy-loading them keeps that ~150kB
// library out of the critical-path bundle — it loads as its own chunk only
// when the Trends section actually renders.
const BehaviorFrequencyChart = lazy(() =>
  import('../components/dashboard/BehaviorFrequencyChart').then(m => ({ default: m.BehaviorFrequencyChart })))
const SleepDurationChart = lazy(() =>
  import('../components/dashboard/SleepDurationChart').then(m => ({ default: m.SleepDurationChart })))
const RegulationDistributionChart = lazy(() =>
  import('../components/dashboard/RegulationDistributionChart').then(m => ({ default: m.RegulationDistributionChart })))
const BehaviorSleepCorrelationChart = lazy(() =>
  import('../components/dashboard/BehaviorSleepCorrelationChart').then(m => ({ default: m.BehaviorSleepCorrelationChart })))

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, children, className = '', action }: {
  title: string; children: React.ReactNode; className?: string; action?: React.ReactNode
}) {
  return (
    <section
      className={`overflow-hidden ${className}`}
      style={{ background: 'var(--color-surface)', borderRadius: 20, boxShadow: '0 2px 10px rgba(51,50,46,0.07)' }}
    >
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</h2>
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
  return <Minus className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
}

type ChartTabId = 'overview' | 'behavior' | 'sleep' | 'regulation'

function ChartTabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-warm-100)',
        color:      active ? '#fff' : 'var(--color-text-muted)',
      }}
    >
      {children}
    </button>
  )
}

/** Shared fallback for the per-tab chart ErrorBoundaries (see DashboardPage's Trends section). */
function chartErrorFallback(_error: Error, retry: () => void) {
  return (
    <div className="text-center py-6">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Couldn't load this chart.</p>
      <button
        type="button"
        onClick={retry}
        className="mt-2 text-xs font-semibold underline"
        style={{ color: 'var(--color-accent)' }}
      >
        Try again
      </button>
    </div>
  )
}

function AttentionCard({ item, onNavigate }: { item: AttentionItem; onNavigate: () => void }) {
  const cfg: Record<AttentionItem['type'], { icon: React.ElementType; iconColor: string; bg: string }> = {
    draft_sleep:   { icon: Moon,     iconColor: 'var(--color-accent)', bg: 'var(--color-accent-subtle)'  },
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
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{item.label}</p>
        {item.sub && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{item.sub}</p>}
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user }         = useAuth()
  const { activeProfile } = useProfile()
  const navigate = useNavigate()

  // Date navigation — selection is independent of WeekStrip scroll position
  const realTodayStr = format(new Date(), 'yyyy-MM-dd')
  const [viewDate, setViewDate] = useState(realTodayStr)
  const isViewingToday = viewDate === realTodayStr
  const weekStripRef = useRef<WeekStripHandle>(null)

  // Dot fetch keyed to the strip's visible scroll window, not the selected day
  const [visibleRange, setVisibleRange] = useState<{ start: string; end: string }>({
    start: realTodayStr,
    end: realTodayStr,
  })
  const weekDots = useWeekDots(activeProfile?.id ?? null, visibleRange.start, visibleRange.end)

  const db = useDashboard(activeProfile?.id ?? null, viewDate)

  // Per-user quick tiles config
  const { tiles: quickTileIds } = useQuickTiles(user?.id ?? null)

  // Custom trackers (for quick tiles + day panel)
  const { trackers: customTrackers } = useCustomTrackers(activeProfile?.id ?? null)

  // Data needed for optional tiles
  const { goals }     = useGoals(activeProfile?.id ?? null)
  const { providers } = useProviders(activeProfile?.id ?? null)

  // Handoff note
  const myRole = useMyRole(activeProfile?.id ?? null)
  const { data: handoffData, updaterName: handoffUpdater, save: saveHandoff } = useHandoffNote(activeProfile?.id ?? null)
  const { settings: dietSettings } = useDietSettings(activeProfile?.id ?? null)
  const { notes: quickNotes, remove: removeQuickNote } = useQuickNotes(activeProfile?.id ?? null)

  // Sheet state
  const [behaviorOpen,    setBehaviorOpen]    = useState(false)
  const [sensoryOpen,     setSensoryOpen]     = useState(false)
  const [dietOpen,        setDietOpen]        = useState(false)
  const [sleepOpen,       setSleepOpen]       = useState(false)
  const [progressOpen,    setProgressOpen]    = useState(false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [_chartsOpen,     _setChartsOpen]     = useState(false) // replaced by bubble chart
  const [trackerLogOpen,  setTrackerLogOpen]  = useState<string | null>(null) // tracker ID
  const [quickMoodOpen,   setQuickMoodOpen]   = useState(false)
  const [chartTab,        setChartTab]        = useState<ChartTabId>('overview')

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

  // Weekly bubble snapshot — shared between the loading check and JSX below
  const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 0 })
  const sleepWeekCount = db.sleepChart.filter(
    p => parseISO(p.date) >= weekStartDate && p.hours != null
  ).length
  const sensoryWeekTotal = db.regulationChart.reduce((sum, z) => sum + z.count, 0)

  const weeklyBubbles: BubbleData[] = [
    {
      id:        'behavior',
      label:     'Behavior',
      value:     db.weekBehaviorCount,
      bgColor:   'var(--module-behavior-bg)',
      iconColor: 'var(--module-behavior-icon)',
      icon:      'behavior',
    },
    {
      id:        'diet',
      label:     'Diet',
      value:     db.smoothiesThisWeek,
      bgColor:   'var(--module-diet-bg)',
      iconColor: 'var(--module-diet-icon)',
      icon:      'smoothie',
    },
    {
      id:        'sleep',
      label:     'Sleep',
      value:     sleepWeekCount,
      bgColor:   'var(--module-sleep-bg)',
      iconColor: 'var(--module-sleep-icon)',
      icon:      'sleep',
    },
    {
      id:        'sensory',
      label:     'Regulation',
      value:     sensoryWeekTotal,
      bgColor:   'var(--module-sensory-bg)',
      iconColor: 'var(--module-sensory-icon)',
      icon:      'sensory',
    },
  ]

  // Combine the 30-day behavior + sleep series into one date-aligned dataset
  // for the "Behavior + Sleep" overlay chart.
  const sleepHoursByDate = new Map(db.sleepChart.map(p => [p.date, p.hours]))
  const correlationChart: CorrelationPoint[] = db.behaviorChart.map(p => ({
    date:  p.date,
    label: p.label,
    count: p.count,
    hours: sleepHoursByDate.get(p.date) ?? null,
  }))
  const sleepBehaviorInsight = computeSleepBehaviorInsight(db.sleepChart, db.behaviorChart)
  const hasBehaviorData = db.behaviorChart.some(p => p.count > 0)
  const hasSleepData    = db.sleepChart.some(p => p.hours != null)

  return (
    <div className="pb-28 w-full">

      {/* ── Page heading + week strip navigation ─────────────────────────────── */}
      <div className="pt-5 pb-1">
        <h1
          className="font-display text-2xl font-semibold text-center mb-4"
          style={{ color: 'var(--color-text)' }}
        >
          {isViewingToday ? 'Today' : format(parseISO(viewDate), 'EEEE, MMM d')}
        </h1>
        <div className="px-2">
          <WeekStrip
            ref={weekStripRef}
            selectedDate={viewDate}
            onSelectDate={setViewDate}
            dotsByDate={weekDots}
            onVisibleRangeChange={(start, end) => setVisibleRange({ start, end })}
          />
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
        const staticHandlers: Record<string, () => void> = {
          smoothie:    () => setDietOpen(true),
          meal:        () => setDietOpen(true),
          behavior:    () => setBehaviorOpen(true),
          sensory:     () => setSensoryOpen(true),
          sleep:       () => setSleepOpen(true),
          progress:    () => setProgressOpen(true),
          appointment: () => setAppointmentOpen(true),
          quick_mood:  () => setQuickMoodOpen(true),
        }
        const cols  = 2
        return (
          <div className="px-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--color-text-muted)' }}>Quick log</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {quickTileIds.map(id => {
                if (id.startsWith('tracker:')) {
                  const tracker = customTrackers.find(t => t.id === id.slice(8))
                  if (!tracker) return null
                  const TrIcon = getTrackerIcon(tracker.icon_name)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTrackerLogOpen(tracker.id)}
                      className="flex flex-col items-start gap-3 p-4 rounded-xl text-left active:scale-[0.97] transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      style={{ background: 'var(--color-surface)', boxShadow: '0 2px 10px rgba(51,50,46,0.07)', minHeight: 110 }}
                    >
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: trackerIconBg(tracker.color) }}>
                        <TrIcon className="w-5 h-5" style={{ color: tracker.color }} />
                      </span>
                      <div>
                        <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--color-text)' }}>{tracker.name}</p>
                        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>Log entry</p>
                      </div>
                    </button>
                  )
                }
                const def = getTileDef(id as import('../lib/tileConstants').TileId)
                if (!def) return null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={staticHandlers[id]}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl text-left active:scale-[0.97] transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    style={{ background: 'var(--color-surface)', boxShadow: '0 2px 10px rgba(51,50,46,0.07)', minHeight: 110 }}
                  >
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: def.iconBg }}>
                      <ModuleIcon name={def.icon} className="w-5 h-5" style={{ color: def.accent }} />
                    </span>
                    <div>
                      <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--color-text)' }}>{def.label}</p>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{def.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => navigate('/log')}
              className="w-full mt-2.5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
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
            <p className="text-xs font-medium leading-snug" style={{ color: 'var(--color-text-muted)' }}>
              Viewing {format(parseISO(viewDate), 'MMMM d')} — go to Today to log new entries.
            </p>
            <button
              onClick={() => weekStripRef.current?.goToToday()}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition"
              style={{ background: 'var(--color-accent)' }}
            >
              Go to Today
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-2 space-y-4">

        {/* ── Today at a glance ───────────────────────────────────────────────── */}
        <Section title={isViewingToday ? 'Today at a glance' : `${format(parseISO(viewDate), 'MMM d')} at a glance`}>
          {db.loading ? (
            <div className="flex justify-center py-4"><Spinner className="w-5 h-5" /></div>
          ) : activeBadges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {activeBadges.map(b => (
                <StatBadge key={b.label} label={b.label} value={b.value} icon={b.icon} color={b.color} />
              ))}
            </div>
          ) : (
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>Nothing logged yet — tap Quick log above.</p>
          )}

          {attentionItems.length > 0 && (
            <div className="space-y-2 pt-1" style={{ borderTop: '1px solid var(--color-warm-200)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--color-text-muted)' }}>Needs attention</p>
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
              style={{ color: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}
            >
              <Settings2 className="w-3 h-3" />
              Edit Schedule
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

        {/* ── This Week (bubble snapshot + trend detail, one consolidated card) ── */}
        <Section title={`This week  ${weekStart} - ${weekEnd}`}>
          {db.loading ? (
            <div className="flex justify-center py-4"><Spinner className="w-5 h-5" /></div>
          ) : (
            <>
              {/* Bubble snapshot — the at-a-glance counts for each module.
                  The detail rows below intentionally avoid repeating these
                  same raw numbers and instead add context the bubbles can't
                  show (trend direction, top triggers, goal status…). */}
              <WeeklyBubbleChart bubbles={weeklyBubbles} />

              <div className="space-y-3 mt-3">

                {/* Behavior */}
                <div className="flex items-start gap-3 pt-3" style={{ borderTop: '1px solid var(--color-warm-200)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--module-behavior-bg)' }}>
                    <ModuleIcon name="behavior" className="w-4 h-4" style={{ color: 'var(--module-behavior-icon)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{behaviorTrendText}</span>
                      <TrendIcon curr={db.weekBehaviorCount} prev={db.lastWeekBehaviorCount} />
                    </div>
                    {db.topAntecedents.length > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        Top trigger{db.topAntecedents.length > 1 ? 's' : ''}:{' '}
                        {db.topAntecedents.map(a => a.antecedent).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-warm-200)' }} />

                {/* Sleep */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--module-sleep-bg)' }}>
                    <ModuleIcon name="sleep" className="w-4 h-4" style={{ color: 'var(--module-sleep-icon)' }} />
                  </div>
                  <div className="flex-1">
                    {db.avgSleepHoursThisWeek != null ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                            Avg {db.avgSleepHoursThisWeek.toFixed(1)}h sleep
                          </span>
                          {sleepDiff != null && (
                            <TrendIcon curr={db.avgSleepHoursThisWeek} prev={db.avgSleepHoursLastWeek!} />
                          )}
                        </div>
                        {sleepDiff != null && (
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {sleepDiff > 0 ? '+' : ''}{sleepDiff.toFixed(1)}h vs prev week
                          </p>
                        )}
                        {db.avgSleepQualityThisWeek != null && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            Avg quality: {qualityLabel(Math.round(db.avgSleepQualityThisWeek))}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No completed sleep entries this week</p>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-warm-200)' }} />

                {/* Smoothies */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--module-diet-bg)' }}>
                    <ModuleIcon name="smoothie" className="w-4 h-4" style={{ color: 'var(--module-diet-icon)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {db.smoothiesThisWeek >= db.smoothiesExpected
                        ? <span className="text-sm font-semibold text-emerald-600">✓ On track for smoothies</span>
                        : db.smoothiesExpected > 0
                          ? <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{db.smoothiesExpected - db.smoothiesThisWeek} smoothie{db.smoothiesExpected - db.smoothiesThisWeek === 1 ? '' : 's'} missed</span>
                          : <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Smoothies logged this week</span>
                      }
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Logged vs. 2/day expected</p>
                  </div>
                </div>

                {/* Stalled goals */}
                {db.stalledGoals.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid var(--color-warm-200)' }} />
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--module-goals-bg)' }}>
                        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--module-goals-icon)' }} />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          {db.stalledGoals.length} goal{db.stalledGoals.length > 1 ? 's' : ''} with no recent progress
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>No progress notes in the last 14 days</p>
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
                              className="text-xs hover:opacity-70"
                              style={{ color: 'var(--color-text-muted)' }}
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
            </>
          )}
        </Section>

        {/* ── Trends (30-day charts + correlated insight) ─────────────────────── */}
        <Section title="Trends">
          {db.loading ? (
            <div className="flex justify-center py-4"><Spinner className="w-5 h-5" /></div>
          ) : (
            <>
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
                <ChartTabButton active={chartTab === 'overview'}   onClick={() => setChartTab('overview')}>Behavior + Sleep</ChartTabButton>
                <ChartTabButton active={chartTab === 'behavior'}   onClick={() => setChartTab('behavior')}>Behavior</ChartTabButton>
                <ChartTabButton active={chartTab === 'sleep'}      onClick={() => setChartTab('sleep')}>Sleep</ChartTabButton>
                <ChartTabButton active={chartTab === 'regulation'} onClick={() => setChartTab('regulation')}>Regulation</ChartTabButton>
              </div>

              {/*
                Each tab gets its OWN ErrorBoundary + Suspense pair, keyed by tab id,
                instead of one shared boundary around a conditionally-swapped chart.

                Why: recharts 3.x + React 19 has an open bug (recharts#7463) where if a
                Suspense boundary that has already committed a chart re-suspends (e.g. a
                *different* lazy chart under the same boundary hasn't loaded yet), React
                "hides" the previously-shown chart instead of unmounting it. Recharts'
                internal ref-cleanup runs unconditional setState calls during that hide,
                which loops forever ("Maximum update depth exceeded"). Giving each tab an
                independent boundary means switching tabs fully unmounts the old chart
                and freshly mounts the new one — never hides an already-rendered chart —
                which sidesteps the bug entirely.
              */}
              <div className="mt-3">
                {chartTab === 'overview' && (
                  <ErrorBoundary key="overview" fallback={chartErrorFallback}>
                    <Suspense fallback={<div className="flex justify-center py-8"><Spinner className="w-5 h-5" /></div>}>
                      {!hasBehaviorData && !hasSleepData ? (
                        <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>
                          No behavior or sleep entries in the last 30 days
                        </p>
                      ) : (
                        <>
                          <BehaviorSleepCorrelationChart data={correlationChart} />
                          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                            {sleepBehaviorInsight ? (
                              <>
                                On days after a night with under {sleepBehaviorInsight.threshold}h of sleep
                                ({sleepBehaviorInsight.lowNights} night{sleepBehaviorInsight.lowNights === 1 ? '' : 's'}),
                                there were an average of{' '}
                                <strong style={{ color: 'var(--color-text)' }}>
                                  {sleepBehaviorInsight.lowAvg.toFixed(1)} behavior incident{sleepBehaviorInsight.lowAvg === 1 ? '' : 's'}
                                </strong>
                                , compared to{' '}
                                <strong style={{ color: 'var(--color-text)' }}>{sleepBehaviorInsight.okAvg.toFixed(1)}</strong>
                                {' '}after nights of {sleepBehaviorInsight.threshold}h+
                                ({sleepBehaviorInsight.okNights} night{sleepBehaviorInsight.okNights === 1 ? '' : 's'}).
                                This isn't proof either causes the other, but may be worth watching.
                              </>
                            ) : (
                              'Keep logging sleep and behavior daily — once there\'s enough data in both a short-sleep and a well-rested group of nights, we\'ll surface whether one tends to follow the other.'
                            )}
                          </p>
                        </>
                      )}
                    </Suspense>
                  </ErrorBoundary>
                )}

                {chartTab === 'behavior' && (
                  <ErrorBoundary key="behavior" fallback={chartErrorFallback}>
                    <Suspense fallback={<div className="flex justify-center py-8"><Spinner className="w-5 h-5" /></div>}>
                      {hasBehaviorData
                        ? <BehaviorFrequencyChart data={db.behaviorChart} />
                        : <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No behavior incidents logged in the last 30 days</p>}
                    </Suspense>
                  </ErrorBoundary>
                )}

                {chartTab === 'sleep' && (
                  <ErrorBoundary key="sleep" fallback={chartErrorFallback}>
                    <Suspense fallback={<div className="flex justify-center py-8"><Spinner className="w-5 h-5" /></div>}>
                      {hasSleepData
                        ? <SleepDurationChart data={db.sleepChart} />
                        : <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No completed sleep entries in the last 30 days</p>}
                    </Suspense>
                  </ErrorBoundary>
                )}

                {chartTab === 'regulation' && (
                  <ErrorBoundary key="regulation" fallback={chartErrorFallback}>
                    <Suspense fallback={<div className="flex justify-center py-8"><Spinner className="w-5 h-5" /></div>}>
                      <RegulationDistributionChart data={db.regulationChart} />
                    </Suspense>
                  </ErrorBoundary>
                )}
              </div>

              <p className="text-[10px] mt-2 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                {chartTab === 'regulation' ? 'This week' : 'Last 30 days'}
              </p>
            </>
          )}
        </Section>

        {/* ── Unfiled voice notes ──────────────────────────────────────────────── */}
        {quickNotes.length > 0 && (
          <section
            className="overflow-hidden"
            style={{ background: 'var(--color-surface)', borderRadius: 20, boxShadow: '0 2px 10px rgba(51,50,46,0.07)' }}
          >
            <div className="px-4 pt-4 pb-1">
              <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                Unfiled notes
              </h2>
            </div>
            <div className="px-4 pb-4">
              <UnfiledNotes notes={quickNotes} onDelete={removeQuickNote} />
            </div>
          </section>
        )}

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

      {/* Quick Mood sheet */}
      <BottomSheet open={quickMoodOpen} onClose={() => setQuickMoodOpen(false)} title="Quick mood check">
        <QuickMoodDrawer
          profileId={activeProfile.id}
          date={realTodayStr}
          onSaved={() => setQuickMoodOpen(false)}
          onCancel={() => setQuickMoodOpen(false)}
        />
      </BottomSheet>

      {/* Custom tracker log sheet */}
      {trackerLogOpen && (() => {
        const tracker = customTrackers.find(t => t.id === trackerLogOpen)
        if (!tracker) return null
        return (
          <BottomSheet
            open
            onClose={() => setTrackerLogOpen(null)}
            title={`Log: ${tracker.name}`}
          >
            <CustomTrackerLogForm
              tracker={tracker}
              profileId={activeProfile.id}
              onSaved={() => setTrackerLogOpen(null)}
              onCancel={() => setTrackerLogOpen(null)}
            />
          </BottomSheet>
        )
      })()}
    </div>
  )
}
