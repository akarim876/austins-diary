import JSZip from 'jszip'
import type {
  DiaryEntry, BehaviorLog, SensoryLog, DietLog, SleepLog,
  Goal, ProgressNote, Appointment, Provider,
} from '../types'
import { qualityLabel } from './sleepConstants'
import { ratingMeta } from './goalConstants'

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(v: string | number | boolean | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(esc).join(',')
}

function arr(a: string[] | undefined | null): string {
  return (a ?? []).join('; ')
}

function time(t: string | null | undefined): string {
  if (!t) return ''
  // "HH:MM" → "HH:MM AM/PM"
  const [hStr, m] = t.split(':')
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${ampm}`
}

function fmtMinutes(mins: number | null | undefined): string {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Per-module CSV builders ─────────────────────────────────────────────────

function diaryCSV(entries: DiaryEntry[]): string {
  const header = row('Date', 'Note', 'Tags')
  const rows = entries
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map(e => row(e.entry_date, e.note, arr(e.tags)))
  return [header, ...rows].join('\n')
}

function behaviorCSV(logs: BehaviorLog[]): string {
  const header = row(
    'Date', 'Time', 'Location', 'Antecedent', 'Antecedent Notes',
    'Behavior', 'Severity (1–5)', 'Duration (min)', 'Response', 'Helped',
  )
  const rows = logs
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.time_of_day.localeCompare(b.time_of_day))
    .map(l => row(
      l.entry_date, time(l.time_of_day), l.location,
      l.antecedent, l.antecedent_note,
      l.behavior, l.severity, l.duration_mins ?? '',
      l.consequence, l.helped,
    ))
  return [header, ...rows].join('\n')
}

function sensoryCSV(logs: SensoryLog[]): string {
  const header = row(
    'Date', 'Time', 'Location', 'Regulation Zone',
    'Triggers', 'Calming Strategies', 'Helped', 'Duration (min)', 'Notes',
  )
  const rows = logs
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.time_of_day.localeCompare(b.time_of_day))
    .map(l => row(
      l.entry_date, time(l.time_of_day), l.location,
      l.regulation_level,
      arr(l.sensory_triggers), arr(l.calming_strategies),
      l.helped, l.duration_mins ?? '', l.notes,
    ))
  return [header, ...rows].join('\n')
}

function dietCSV(logs: DietLog[]): string {
  const header = row(
    'Date', 'Time', 'Type', 'Meal Type',
    'Foods Eaten', 'New Food', 'New Food Acceptance',
    'Smoothie Name', 'Ingredients Checked', 'Ingredients Omitted',
    'Supplements Checked', 'Supplements Omitted',
    'Medications Checked', 'Medications Omitted',
    'Hydration', 'Notes',
  )
  const rows = logs
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.time_of_day.localeCompare(b.time_of_day))
    .map(l => row(
      l.entry_date, time(l.time_of_day), l.log_type, l.meal_type ?? '',
      arr(l.foods_eaten),
      l.new_food_introduced ? l.new_food_name : '',
      l.new_food_acceptance ?? '',
      l.smoothie_type ?? '',
      arr(l.ingredients_checked), arr(l.ingredients_omitted),
      arr(l.supplements_checked), arr(l.supplements_omitted),
      arr(l.medications_checked), arr(l.medications_omitted),
      l.hydration ?? '', l.notes,
    ))
  return [header, ...rows].join('\n')
}

function sleepCSV(logs: SleepLog[]): string {
  const header = row(
    'Date', 'Bedtime', 'Wake Time', 'Total Sleep',
    'Night Wakings', 'Sleep Quality', 'Nap Enabled', 'Notes',
  )
  const rows = logs
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map(l => row(
      l.log_date,
      time(l.bedtime), time(l.wake_time),
      fmtMinutes(l.total_sleep_minutes),
      l.night_wakings_count,
      l.sleep_quality != null ? qualityLabel(l.sleep_quality) : '',
      l.nap_enabled ? 'Yes' : 'No',
      l.notes ?? '',
    ))
  return [header, ...rows].join('\n')
}

function goalsCSV(goals: Goal[]): string {
  const header = row('Title', 'Source', 'Status', 'Description', 'Start Date', 'Target Date')
  const rows = goals
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map(g => row(g.title, g.source, g.status, g.description, g.start_date, g.target_date ?? ''))
  return [header, ...rows].join('\n')
}

function progressCSV(notes: ProgressNote[], goalMap: Map<string, string>): string {
  const header = row('Date', 'Goal', 'Rating', 'Notes')
  const rows = notes
    .sort((a, b) => a.note_date.localeCompare(b.note_date))
    .map(n => row(
      n.note_date,
      goalMap.get(n.goal_id) ?? n.goal_id,
      ratingMeta(n.rating).label,
      n.notes ?? '',
    ))
  return [header, ...rows].join('\n')
}

function appointmentsCSV(appts: Appointment[], providerMap: Map<string, Provider>): string {
  const header = row(
    'Date', 'Time', 'Provider', 'Provider Role', 'Type', 'Status',
    'Notes', 'Follow-up Needed', 'Follow-up Text', 'Follow-up Date',
  )
  const rows = appts
    .sort((a, b) => a.appt_date.localeCompare(b.appt_date))
    .map(a => {
      const prov = a.provider_id ? providerMap.get(a.provider_id) : null
      return row(
        a.appt_date, time(a.appt_time ?? undefined),
        prov?.name ?? '', prov?.role ?? '',
        a.type, a.status, a.notes ?? '',
        a.followup_needed ? 'Yes' : 'No',
        a.followup_text ?? '', a.followup_date ?? '',
      )
    })
  return [header, ...rows].join('\n')
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface CSVExportParams {
  childName: string
  startDate: string
  endDate: string
  modules: string[]   // which modules are selected
  diary: DiaryEntry[]
  behavior: BehaviorLog[]
  sensory: SensoryLog[]
  diet: DietLog[]
  sleep: SleepLog[]
  goals: Goal[]
  progressNotes: ProgressNote[]
  appointments: Appointment[]
  providers: Provider[]
}

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** Download one or more CSV files. Single module → single download; multiple → zip. */
export async function downloadCSV(params: CSVExportParams): Promise<void> {
  const goalMap = new Map(params.goals.map(g => [g.id, g.title]))
  const providerMap = new Map(params.providers.map(p => [p.id, p]))

  const files: { name: string; content: string }[] = []

  if (params.modules.includes('diary') && params.diary.length > 0)
    files.push({ name: 'diary.csv', content: diaryCSV(params.diary) })
  if (params.modules.includes('behavior') && params.behavior.length > 0)
    files.push({ name: 'behavior_logs.csv', content: behaviorCSV(params.behavior) })
  if (params.modules.includes('sensory') && params.sensory.length > 0)
    files.push({ name: 'sensory_logs.csv', content: sensoryCSV(params.sensory) })
  if (params.modules.includes('diet') && params.diet.length > 0)
    files.push({ name: 'diet_logs.csv', content: dietCSV(params.diet) })
  if (params.modules.includes('sleep') && params.sleep.length > 0)
    files.push({ name: 'sleep_logs.csv', content: sleepCSV(params.sleep) })
  if (params.modules.includes('goals')) {
    if (params.goals.length > 0)
      files.push({ name: 'goals.csv', content: goalsCSV(params.goals) })
    if (params.progressNotes.length > 0)
      files.push({ name: 'progress_notes.csv', content: progressCSV(params.progressNotes, goalMap) })
  }
  if (params.modules.includes('appointments') && params.appointments.length > 0)
    files.push({ name: 'appointments.csv', content: appointmentsCSV(params.appointments, providerMap) })

  if (files.length === 0) {
    throw new Error('No data found for the selected date range and modules.')
  }

  const prefix = `${slug(params.childName)}-${params.startDate}-${params.endDate}`

  if (files.length === 1) {
    triggerDownload(
      new Blob([files[0].content], { type: 'text/csv;charset=utf-8;' }),
      `${prefix}-${files[0].name}`,
    )
    return
  }

  // Multiple files → zip
  const zip = new JSZip()
  const folder = zip.folder(prefix)!
  for (const f of files) folder.file(f.name, f.content)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  triggerDownload(blob, `${prefix}.zip`)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
