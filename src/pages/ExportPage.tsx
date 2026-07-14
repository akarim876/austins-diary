import { useState } from 'react'
import {
  endOfMonth, format, startOfMonth, subDays,
} from 'date-fns'
import {
  AlertCircle, CheckSquare, Download, FileSpreadsheet, FileText,
  Loader2, Square,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useProfile } from '../contexts/ProfileContext'
import { useCustomTrackers } from '../hooks/useCustomTrackers'
import { getTrackerIcon, trackerIconBg } from '../lib/trackerIcons'
import { downloadCSV }  from '../lib/csvExport'
import { downloadPDF }  from '../lib/pdfExport'
import type {
  CustomTracker, CustomTrackerLog,
  DiaryEntry, BehaviorLog, SensoryLog, DietLog, SleepLog,
  Goal, ProgressNote, Appointment, Provider,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd')

type Preset = 'last7' | 'last30' | 'thisMonth' | 'custom'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'last7',     label: 'Last 7 days'  },
  { id: 'last30',    label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month'   },
  { id: 'custom',    label: 'Custom range' },
]

const STATIC_MODULES = [
  { id: 'diary',        label: 'Diary',              desc: 'Daily notes and photos' },
  { id: 'behavior',     label: 'Behavior',           desc: 'Incidents, severity, antecedents' },
  { id: 'sensory',      label: 'Sensory / Regulation', desc: 'Zone, triggers, strategies' },
  { id: 'diet',         label: 'Diet & Nutrition',   desc: 'Meals, smoothies, supplements, meds' },
  { id: 'sleep',        label: 'Sleep',              desc: 'Duration, quality, wakings' },
  { id: 'goals',        label: 'Goals & Progress',   desc: 'Active goals and progress notes' },
  { id: 'appointments', label: 'Appointments',       desc: 'Providers and visit history' },
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

function presetRange(p: Preset): { start: string; end: string } {
  const today = new Date()
  if (p === 'last7')     return { start: format(subDays(today, 6), 'yyyy-MM-dd'), end: TODAY }
  if (p === 'last30')    return { start: format(subDays(today, 29), 'yyyy-MM-dd'), end: TODAY }
  if (p === 'thisMonth') return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') }
  return { start: format(subDays(today, 29), 'yyyy-MM-dd'), end: TODAY }
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchExportData(
  profileId: string,
  start: string,
  end: string,
  modules: string[],
) {
  const inc = (m: string) => modules.includes(m)
  const trackerIds = modules.filter(m => m.startsWith('tracker:')).map(m => m.slice(8))

  const [
    diaryRes, behaviorRes, sensoryRes, dietRes,
    sleepRes, goalsRes, progressRes, apptsRes, providersRes, trackerLogsRes,
  ] = await Promise.all([
    inc('diary')
      ? supabase.from('diary_entries').select('*').eq('profile_id', profileId).gte('entry_date', start).lte('entry_date', end)
      : Promise.resolve({ data: [] }),
    inc('behavior')
      ? supabase.from('behavior_logs').select('*').eq('profile_id', profileId).gte('entry_date', start).lte('entry_date', end)
      : Promise.resolve({ data: [] }),
    inc('sensory')
      ? supabase.from('sensory_logs').select('*').eq('profile_id', profileId).gte('entry_date', start).lte('entry_date', end)
      : Promise.resolve({ data: [] }),
    inc('diet')
      ? supabase.from('diet_logs').select('*').eq('profile_id', profileId).gte('entry_date', start).lte('entry_date', end)
      : Promise.resolve({ data: [] }),
    inc('sleep')
      ? supabase.from('sleep_logs').select('*').eq('profile_id', profileId).gte('log_date', start).lte('log_date', end)
      : Promise.resolve({ data: [] }),
    inc('goals')
      ? supabase.from('goals').select('*').eq('profile_id', profileId)
      : Promise.resolve({ data: [] }),
    inc('goals')
      ? supabase.from('progress_notes').select('*').eq('profile_id', profileId).gte('note_date', start).lte('note_date', end)
      : Promise.resolve({ data: [] }),
    inc('appointments')
      ? supabase.from('appointments').select('*').eq('profile_id', profileId).gte('appt_date', start).lte('appt_date', end)
      : Promise.resolve({ data: [] }),
    inc('appointments')
      ? supabase.from('providers').select('*').eq('profile_id', profileId)
      : Promise.resolve({ data: [] }),
    trackerIds.length > 0
      ? supabase.from('custom_tracker_logs').select('*').eq('profile_id', profileId).in('tracker_id', trackerIds).gte('entry_date', start).lte('entry_date', end).order('entry_date')
      : Promise.resolve({ data: [] }),
  ])

  return {
    diary:          (diaryRes.data       ?? []) as DiaryEntry[],
    behavior:       (behaviorRes.data    ?? []) as BehaviorLog[],
    sensory:        (sensoryRes.data     ?? []) as SensoryLog[],
    diet:           (dietRes.data        ?? []) as DietLog[],
    sleep:          (sleepRes.data       ?? []) as unknown as SleepLog[],
    goals:          (goalsRes.data       ?? []) as Goal[],
    progressNotes:  (progressRes.data    ?? []) as ProgressNote[],
    appointments:   (apptsRes.data       ?? []) as Appointment[],
    providers:      (providersRes.data   ?? []) as Provider[],
    customTrackerLogs: (trackerLogsRes.data ?? []) as CustomTrackerLog[],
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

type Status = 'idle' | 'fetching' | 'generating' | 'done' | 'error'

export function ExportPage() {
  const { activeProfile } = useProfile()
  const { trackers: customTrackers } = useCustomTrackers(activeProfile?.id ?? null)

  const ALL_MODULES = [
    ...STATIC_MODULES,
    ...customTrackers.map(t => ({
      id:   `tracker:${t.id}`,
      label: t.name,
      desc: `${t.tracker_type.replace('_', ' ')} tracker`,
      tracker: t,
    })),
  ]

  const [preset,     setPreset]     = useState<Preset>('last30')
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [customEnd,   setCustomEnd]   = useState(TODAY)
  const [modules,    setModules]    = useState<string[]>(STATIC_MODULES.map(m => m.id))
  const [exportFmt,  setExportFmt]  = useState<'pdf' | 'csv'>('pdf')
  const [status,     setStatus]     = useState<Status>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')

  if (!activeProfile) return null

  const range = preset === 'custom'
    ? { start: customStart, end: customEnd }
    : presetRange(preset)

  const allChecked  = modules.length === ALL_MODULES.length
  const noneChecked = modules.length === 0

  function toggleModule(id: string) {
    setModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  function toggleAll() {
    setModules(allChecked ? [] : ALL_MODULES.map(m => m.id))
  }

  async function handleExport() {
    if (noneChecked) { toast.error('Select at least one module'); return }
    if (!activeProfile) return

    setStatus('fetching')
    setErrorMsg('')
    try {
      const data = await fetchExportData(activeProfile.id, range.start, range.end, modules)

      setStatus('generating')

      const selectedTrackers = customTrackers.filter(t =>
        modules.includes(`tracker:${t.id}`),
      )

      const common = {
        childName:    activeProfile.name,
        startDate:    range.start,
        endDate:      range.end,
        modules,
        ...data,
        customTrackers: selectedTrackers,
      }

      if (exportFmt === 'csv') {
        await downloadCSV(common)
      } else {
        await downloadPDF({
          ...common,
          generatedDate: format(new Date(), 'MMMM d, yyyy'),
        })
      }

      setStatus('done')
      toast.success('Export downloaded!')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setErrorMsg(msg)
      setStatus('error')
      toast.error(msg)
    }
  }

  const isGenerating = status === 'fetching' || status === 'generating'

  return (
    <div className="pb-24 max-w-lg mx-auto px-4 pt-4 space-y-4">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Export Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Download a snapshot of {activeProfile.name}'s records for appointments, school meetings, or personal analysis.
        </p>
      </div>

      {/* ── Date range ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date range</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${
                preset === p.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-700 border-warm-200 hover:bg-warm-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex gap-3 items-center pt-1">
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={e => setCustomStart(e.target.value)}
                className="w-full border border-warm-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={TODAY}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-full border border-warm-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
        )}

        {preset !== 'custom' && (
          <p className="text-xs text-gray-400">
            {format(new Date(range.start + 'T12:00:00'), 'MMMM d, yyyy')} – {format(new Date(range.end + 'T12:00:00'), 'MMMM d, yyyy')}
          </p>
        )}
      </section>

      {/* ── Modules ─────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sections</h2>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-brand-600 font-semibold hover:text-brand-700"
          >
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="space-y-1">
          {ALL_MODULES.map(m => {
            const checked  = modules.includes(m.id)
            const isTracker = m.id.startsWith('tracker:')
            const tracker = isTracker
              ? customTrackers.find(t => t.id === m.id.slice(8))
              : null
            const TrIcon = tracker ? getTrackerIcon(tracker.icon_name) : null
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleModule(m.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-warm-50 transition text-left"
              >
                {checked
                  ? <CheckSquare className="w-5 h-5 text-brand-600 flex-shrink-0" />
                  : <Square className="w-5 h-5 text-gray-300 flex-shrink-0" />
                }
                {tracker && TrIcon && (
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: trackerIconBg(tracker.color) }}
                  >
                    <TrIcon className="w-3.5 h-3.5" style={{ color: tracker.color }} />
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Format ──────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Format</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setExportFmt('pdf')}
            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition ${
              exportFmt === 'pdf'
                ? 'border-brand-500 bg-brand-50'
                : 'border-warm-200 bg-white hover:bg-warm-50'
            }`}
          >
            <FileText className={`w-7 h-7 ${exportFmt === 'pdf' ? 'text-brand-600' : 'text-gray-400'}`} />
            <div className="text-center">
              <p className={`text-sm font-bold ${exportFmt === 'pdf' ? 'text-brand-700' : 'text-gray-700'}`}>PDF</p>
              <p className="text-xs text-gray-400 mt-0.5">Readable report for doctors & school</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setExportFmt('csv')}
            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition ${
              exportFmt === 'csv'
                ? 'border-brand-500 bg-brand-50'
                : 'border-warm-200 bg-white hover:bg-warm-50'
            }`}
          >
            <FileSpreadsheet className={`w-7 h-7 ${exportFmt === 'csv' ? 'text-brand-600' : 'text-gray-400'}`} />
            <div className="text-center">
              <p className={`text-sm font-bold ${exportFmt === 'csv' ? 'text-brand-700' : 'text-gray-700'}`}>CSV</p>
              <p className="text-xs text-gray-400 mt-0.5">Raw data for Excel / analysis</p>
            </div>
          </button>
        </div>

        {exportFmt === 'pdf' && (
          <p className="text-xs text-gray-400 leading-relaxed">
            Generates a narrative report with a cover page, summary stats, and chronological entries per section.
            PDF is created in your browser — larger date ranges may take a few seconds.
          </p>
        )}
        {exportFmt === 'csv' && (
          <p className="text-xs text-gray-400 leading-relaxed">
            One CSV file per section. If multiple sections are selected, they are bundled into a single ZIP file.
          </p>
        )}
      </section>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {status === 'error' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* ── Generate button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleExport}
        disabled={isGenerating || noneChecked}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-brand-600 text-white text-sm font-bold shadow-sm hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>
              {status === 'fetching'    ? 'Fetching data…'      : ''}
              {status === 'generating'  ? `Generating ${exportFmt.toUpperCase()}…` : ''}
            </span>
          </>
        ) : status === 'done' ? (
          <>
            <Download className="w-5 h-5" />
            <span>Downloaded!</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Generate & Download {exportFmt.toUpperCase()}</span>
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 pb-2">
        Files download directly to your device — nothing is stored online.
      </p>
    </div>
  )
}
