import { useEffect, useState } from 'react'
import {
  format, subDays, startOfWeek, endOfWeek, subWeeks,
  parseISO, eachDayOfInterval,
} from 'date-fns'
import { supabase } from '../lib/supabase'
import type { Appointment, Goal, SleepLog } from '../types'

// ─── Result types ────────────────────────────────────────────────────────────

export interface TodayCounts {
  diary: number
  behavior: number
  sensory: number
  meals: number
  smoothies: number
  supplements: number
  medications: number
  sleep: number
}

export interface AttentionItem {
  type: 'draft_sleep' | 'appt_today' | 'followup_today'
  label: string
  sub?: string
  /** id of the source record, useful for navigation */
  id: string
}

export interface BehaviorChartPoint { date: string; label: string; count: number }
export interface SleepChartPoint    { date: string; label: string; hours: number | null }
export interface RegulationPoint    { zone: string; label: string; count: number; color: string }

export interface DashboardData {
  loading: boolean

  // Today
  todayCounts: TodayCounts
  attentionItems: AttentionItem[]

  // This week (Sun–Sat)
  weekBehaviorCount: number
  lastWeekBehaviorCount: number
  topAntecedents: { antecedent: string; count: number }[]
  avgSleepHoursThisWeek: number | null
  avgSleepHoursLastWeek: number | null
  avgSleepQualityThisWeek: number | null
  avgSleepQualityLastWeek: number | null
  smoothiesThisWeek: number
  smoothiesExpected: number   // 2 per day × days elapsed so far this week
  stalledGoals: Goal[]        // active goals with no progress note in 14 days

  // Charts
  behaviorChart: BehaviorChartPoint[]   // last 30 days, by day
  sleepChart:    SleepChartPoint[]      // last 30 days, by log_date
  regulationChart: RegulationPoint[]    // this week, by zone
}

const REGULATION_COLORS: Record<string, string> = {
  calm:         '#8FB89C',
  alert:        '#A9C08A',
  anxious:      '#E8C77E',
  dysregulated: '#D99A6C',
  shutdown:     '#C77B6A',
}
const REGULATION_LABELS: Record<string, string> = {
  calm:         'Calm',
  alert:        'Alert',
  anxious:      'Anxious',
  dysregulated: 'Dysreg.',
  shutdown:     'Shutdown',
}

function empty(): DashboardData {
  return {
    loading: true,
    todayCounts: { diary: 0, behavior: 0, sensory: 0, meals: 0, smoothies: 0, supplements: 0, medications: 0, sleep: 0 },
    attentionItems: [],
    weekBehaviorCount: 0,
    lastWeekBehaviorCount: 0,
    topAntecedents: [],
    avgSleepHoursThisWeek: null,
    avgSleepHoursLastWeek: null,
    avgSleepQualityThisWeek: null,
    avgSleepQualityLastWeek: null,
    smoothiesThisWeek: 0,
    smoothiesExpected: 0,
    stalledGoals: [],
    behaviorChart: [],
    sleepChart: [],
    regulationChart: [],
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboard(profileId: string | null, viewDate: string) {
  const [data, setData] = useState<DashboardData>(empty())

  useEffect(() => {
    if (!profileId) return
    setData(empty())
    let cancelled = false

    async function load() {
      const pid = profileId as string   // guarded by the `if (!profileId) return` above
      // ── Date constants ──────────────────────────────────────────────────────
      // viewDate drives the daily snapshot; todayDate drives weekly/chart queries.
      const todayDate      = new Date()
      const todayStr       = format(todayDate, 'yyyy-MM-dd')
      const viewDateDate   = parseISO(viewDate)
      const viewDateStr    = viewDate
      const yesterdayStr   = format(subDays(viewDateDate, 1), 'yyyy-MM-dd')

      // Current calendar week: Sunday → Saturday
      const weekStartDate  = startOfWeek(todayDate, { weekStartsOn: 0 })
      const weekEndDate    = endOfWeek(todayDate, { weekStartsOn: 0 })
      const weekStart      = format(weekStartDate, 'yyyy-MM-dd')
      const weekEnd        = format(weekEndDate,   'yyyy-MM-dd')

      const lastWeekStartDate = startOfWeek(subWeeks(weekStartDate, 1), { weekStartsOn: 0 })
      const lastWeekEndDate   = subDays(weekStartDate, 1)
      const lastWeekStart     = format(lastWeekStartDate, 'yyyy-MM-dd')
      const lastWeekEnd       = format(lastWeekEndDate,   'yyyy-MM-dd')

      // Previous 7-day window for sleep comparison
      const sevenDaysAgoStr   = format(subDays(todayDate, 6), 'yyyy-MM-dd')
      const fourteenDaysAgoStr = format(subDays(todayDate, 13), 'yyyy-MM-dd')
      const thirtyDaysAgoStr  = format(subDays(todayDate, 29), 'yyyy-MM-dd')

      // How many days of this week have elapsed (including today)?
      const daysElapsed = eachDayOfInterval({ start: weekStartDate, end: todayDate }).length

      // ── Parallel queries (minimal columns for efficiency) ───────────────────
      const [
        diaryRes,
        behaviorTodayRes,
        sensoryTodayRes,
        dietTodayRes,
        sleepTodayRes,
        draftSleepRes,
        apptsTodayRes,
        followupsTodayRes,
        behaviorWeekRes,
        behaviorLastWeekRes,
        sensoryWeekRes,
        sleepRecentRes,
        sleepPrevRes,
        smoothiesWeekRes,
        behaviorChartRes,
        sleepChartRes,
        goalsRes,
        progressRecentRes,
      ] = await Promise.all([
        // 1. Diary entries for viewDate
        supabase.from('diary_entries').select('id', { count: 'exact', head: true })
          .eq('profile_id', pid).eq('entry_date', viewDateStr),

        // 2. Behavior logs for viewDate
        supabase.from('behavior_logs').select('id, behavior, antecedent')
          .eq('profile_id', pid).eq('entry_date', viewDateStr),

        // 3. Sensory logs for viewDate (count only)
        supabase.from('sensory_logs').select('id', { count: 'exact', head: true })
          .eq('profile_id', pid).eq('entry_date', viewDateStr),

        // 4. Diet logs for viewDate (need log_type for breakdown)
        supabase.from('diet_logs').select('id, log_type')
          .eq('profile_id', pid).eq('entry_date', viewDateStr),

        // 5. Sleep logs for viewDate (log_date = viewDate or day before, to catch overnight)
        supabase.from('sleep_logs').select('id', { count: 'exact', head: true })
          .eq('profile_id', pid).gte('log_date', yesterdayStr).lte('log_date', viewDateStr),

        // 6. Draft sleep = sleep entry with no wake_time around viewDate
        supabase.from('sleep_logs')
          .select('id, log_date, bedtime')
          .eq('profile_id', pid)
          .gte('log_date', yesterdayStr)
          .lte('log_date', viewDateStr)
          .is('wake_time', null),

        // 7. Appointments on viewDate
        supabase.from('appointments')
          .select('id, appt_time, type, status, provider_id')
          .eq('profile_id', pid)
          .eq('appt_date', viewDateStr)
          .in('status', ['upcoming', 'completed']),

        // 8. Follow-up reminders due on viewDate
        supabase.from('appointments')
          .select('id, type, followup_text, provider_id')
          .eq('profile_id', pid)
          .eq('followup_needed', true)
          .eq('followup_date', viewDateStr),

        // 9. Behavior logs this week (antecedent + behavior)
        supabase.from('behavior_logs').select('id, behavior, antecedent')
          .eq('profile_id', pid).gte('entry_date', weekStart).lte('entry_date', weekEnd),

        // 10. Behavior logs last week (count only)
        supabase.from('behavior_logs').select('id', { count: 'exact', head: true })
          .eq('profile_id', pid).gte('entry_date', lastWeekStart).lte('entry_date', lastWeekEnd),

        // 11. Sensory logs this week (regulation_level)
        supabase.from('sensory_logs').select('id, regulation_level')
          .eq('profile_id', pid).gte('entry_date', weekStart).lte('entry_date', weekEnd),

        // 12. Sleep logs last 7 days (for "this week" comparison)
        supabase.from('sleep_logs')
          .select('id, log_date, total_sleep_minutes, sleep_quality')
          .eq('profile_id', pid)
          .gte('log_date', sevenDaysAgoStr)
          .lte('log_date', todayStr)
          .not('wake_time', 'is', null),

        // 13. Sleep logs prev 7 days (for comparison)
        supabase.from('sleep_logs')
          .select('id, log_date, total_sleep_minutes, sleep_quality')
          .eq('profile_id', pid)
          .gte('log_date', fourteenDaysAgoStr)
          .lt('log_date', sevenDaysAgoStr)
          .not('wake_time', 'is', null),

        // 14. Smoothies this week
        supabase.from('diet_logs').select('id', { count: 'exact', head: true })
          .eq('profile_id', pid)
          .eq('log_type', 'smoothie')
          .gte('entry_date', weekStart)
          .lte('entry_date', weekEnd),

        // 15. Behavior chart: last 30 days (just entry_date)
        supabase.from('behavior_logs').select('id, entry_date')
          .eq('profile_id', pid).gte('entry_date', thirtyDaysAgoStr).lte('entry_date', todayStr),

        // 16. Sleep chart: last 30 days
        supabase.from('sleep_logs')
          .select('id, log_date, total_sleep_minutes')
          .eq('profile_id', pid)
          .gte('log_date', thirtyDaysAgoStr)
          .lte('log_date', todayStr)
          .not('wake_time', 'is', null),

        // 17. Active goals
        supabase.from('goals').select('*')
          .eq('profile_id', pid).eq('status', 'active'),

        // 18. Progress notes last 14 days (just goal_id)
        supabase.from('progress_notes').select('goal_id')
          .eq('profile_id', pid).gte('note_date', fourteenDaysAgoStr),
      ])

      if (cancelled) return

      // ── Process today ───────────────────────────────────────────────────────
      const dietToday     = (dietTodayRes.data ?? []) as { id: string; log_type: string }[]
      const todayCounts: TodayCounts = {
        diary:       diaryRes.count ?? 0,
        behavior:    (behaviorTodayRes.data ?? []).length,
        sensory:     sensoryTodayRes.count ?? 0,
        meals:       dietToday.filter(d => d.log_type === 'meal').length,
        smoothies:   dietToday.filter(d => d.log_type === 'smoothie').length,
        supplements: dietToday.filter(d => d.log_type === 'supplements').length,
        medications: dietToday.filter(d => d.log_type === 'medications').length,
        sleep:       sleepTodayRes.count ?? 0,
      }

      // ── Attention items ─────────────────────────────────────────────────────
      const attentionItems: AttentionItem[] = []

      for (const draft of (draftSleepRes.data ?? []) as Pick<SleepLog, 'id' | 'log_date' | 'bedtime'>[]) {
        attentionItems.push({
          type: 'draft_sleep',
          label: 'Incomplete sleep entry',
          sub: draft.bedtime ? `Bedtime logged — wake time missing` : 'Started but not completed',
          id: draft.id,
        })
      }
      for (const appt of (apptsTodayRes.data ?? []) as Pick<Appointment, 'id' | 'appt_time' | 'type' | 'status'>[]) {
        if (appt.status === 'upcoming') {
          attentionItems.push({
            type: 'appt_today',
            label: `Appointment today: ${appt.type}`,
            sub: appt.appt_time ?? undefined,
            id: appt.id,
          })
        }
      }
      for (const f of (followupsTodayRes.data ?? []) as Pick<Appointment, 'id' | 'type' | 'followup_text'>[]) {
        attentionItems.push({
          type: 'followup_today',
          label: `Follow-up due today`,
          sub: f.followup_text ?? f.type,
          id: f.id,
        })
      }

      // ── This week behavior ──────────────────────────────────────────────────
      const weekBehaviors = (behaviorWeekRes.data ?? []) as { id: string; behavior: string; antecedent: string }[]
      const weekBehaviorCount = weekBehaviors.length

      // Top antecedents this week
      const antecedentFreq: Record<string, number> = {}
      for (const b of weekBehaviors) {
        if (b.antecedent && b.antecedent !== 'other') {
          antecedentFreq[b.antecedent] = (antecedentFreq[b.antecedent] ?? 0) + 1
        }
      }
      const topAntecedents = Object.entries(antecedentFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([antecedent, count]) => ({ antecedent, count }))

      // ── Sleep trends ────────────────────────────────────────────────────────
      function avgMinutes(rows: { total_sleep_minutes: number | null }[]): number | null {
        const valid = rows.map(r => r.total_sleep_minutes).filter((m): m is number => m != null)
        if (!valid.length) return null
        return valid.reduce((a, b) => a + b, 0) / valid.length
      }
      function avgQuality(rows: { sleep_quality: number | null }[]): number | null {
        const valid = rows.map(r => r.sleep_quality).filter((q): q is number => q != null)
        if (!valid.length) return null
        return valid.reduce((a, b) => a + b, 0) / valid.length
      }

      const recentSleep = (sleepRecentRes.data ?? []) as Pick<SleepLog, 'log_date' | 'total_sleep_minutes' | 'sleep_quality'>[]
      const prevSleep   = (sleepPrevRes.data   ?? []) as Pick<SleepLog, 'log_date' | 'total_sleep_minutes' | 'sleep_quality'>[]

      const avgMinutesRecent = avgMinutes(recentSleep)
      const avgMinutesPrev   = avgMinutes(prevSleep)

      // ── Smoothies this week ─────────────────────────────────────────────────
      const smoothiesThisWeek = smoothiesWeekRes.count ?? 0
      // Expected: 2 per day × days elapsed in this week (Sun–today)
      const smoothiesExpected = daysElapsed * 2

      // ── Stalled goals ───────────────────────────────────────────────────────
      const activeGoals = (goalsRes.data ?? []) as Goal[]
      const recentProgressGoalIds = new Set(
        ((progressRecentRes.data ?? []) as { goal_id: string }[]).map(p => p.goal_id)
      )
      const stalledGoals = activeGoals.filter(g => !recentProgressGoalIds.has(g.id))

      // ── Behavior chart: last 30 days ────────────────────────────────────────
      const days30 = eachDayOfInterval({
        start: parseISO(thirtyDaysAgoStr),
        end:   parseISO(todayStr),
      })
      const behaviorByDay = new Map<string, number>()
      for (const row of (behaviorChartRes.data ?? []) as { entry_date: string }[]) {
        behaviorByDay.set(row.entry_date, (behaviorByDay.get(row.entry_date) ?? 0) + 1)
      }
      const behaviorChart: BehaviorChartPoint[] = days30.map(d => {
        const ds = format(d, 'yyyy-MM-dd')
        return { date: ds, label: format(d, 'M/d'), count: behaviorByDay.get(ds) ?? 0 }
      })

      // ── Sleep chart: last 30 days ───────────────────────────────────────────
      const sleepByDay = new Map<string, number>()
      for (const row of (sleepChartRes.data ?? []) as { log_date: string; total_sleep_minutes: number | null }[]) {
        if (row.total_sleep_minutes != null) {
          sleepByDay.set(row.log_date, row.total_sleep_minutes / 60)
        }
      }
      const sleepChart: SleepChartPoint[] = days30.map(d => {
        const ds = format(d, 'yyyy-MM-dd')
        return { date: ds, label: format(d, 'M/d'), hours: sleepByDay.get(ds) ?? null }
      })

      // ── Regulation chart: this week ─────────────────────────────────────────
      const regulationFreq: Record<string, number> = {}
      for (const s of (sensoryWeekRes.data ?? []) as { regulation_level: string }[]) {
        regulationFreq[s.regulation_level] = (regulationFreq[s.regulation_level] ?? 0) + 1
      }
      const ZONE_ORDER = ['calm', 'alert', 'anxious', 'dysregulated', 'shutdown']
      const regulationChart: RegulationPoint[] = ZONE_ORDER.map(zone => ({
        zone,
        label: REGULATION_LABELS[zone] ?? zone,
        count: regulationFreq[zone] ?? 0,
        color: REGULATION_COLORS[zone] ?? '#9ca3af',
      }))

      if (cancelled) return

      setData({
        loading: false,
        todayCounts,
        attentionItems,
        weekBehaviorCount,
        lastWeekBehaviorCount: behaviorLastWeekRes.count ?? 0,
        topAntecedents,
        avgSleepHoursThisWeek: avgMinutesRecent != null ? avgMinutesRecent / 60 : null,
        avgSleepHoursLastWeek: avgMinutesPrev   != null ? avgMinutesPrev   / 60 : null,
        avgSleepQualityThisWeek: avgQuality(recentSleep),
        avgSleepQualityLastWeek: avgQuality(prevSleep),
        smoothiesThisWeek,
        smoothiesExpected,
        stalledGoals,
        behaviorChart,
        sleepChart,
        regulationChart,
      })
    }

    load()
    return () => { cancelled = true }
  }, [profileId, viewDate])

  return data
}

