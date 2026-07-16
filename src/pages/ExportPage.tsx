import { useState } from 'react'
import {
  endOfMonth, format, startOfMonth, startOfWeek, subDays,
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
  CustomTrackerLog,
  DiaryEntry, BehaviorLog, SensoryLog, DietLog, SleepLog,
  Goal, ProgressNote, Appointment, Provider,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd')

type Preset = 'last7' | 'thisWeek' | 'last30' | 'thisMonth' | 'custom'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'last7',     label: 'Last 7 days'  },
  { id: 'thisWeek',  label: 'This week'    },
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
  if (p === 'thisWeek')  return { start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: TODAY }
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

  const [sampleStatus, setSampleStatus] = useState<'idle' | 'generating' | 'done'>('idle')

  async function handleSampleReport() {
    if (sampleStatus === 'generating') return
    setSampleStatus('generating')
    try {
      await downloadPDF({
        childName:     'Sample Child',
        startDate:     '2026-07-01',
        endDate:       '2026-07-15',
        generatedDate: 'July 16, 2026',
        modules: ['diary','behavior','sensory','diet','sleep','goals','appointments'],
        diary: [
          { id:'d1', profile_id:'x', entry_date:'2026-07-03', note:'Had a great morning. Tried a new breakfast routine and it worked really well — he transitioned to the table without any prompting. Small win but a big one.', tags:['morning','routine','win'], created_at:'' },
          { id:'d2', profile_id:'x', entry_date:'2026-07-08', note:'Tough day overall. The fire drill at school seems to have set the tone for the afternoon. Gave extra downtime and a weighted blanket after pickup, which helped him decompress.', tags:['school','sensory','decompression'], created_at:'' },
          { id:'d3', profile_id:'x', entry_date:'2026-07-13', note:'Great pool session today. He tolerated the water on his face more than usual and even put his head under briefly. His therapist will be happy to hear this.', tags:['pool','sensory progress','water'], created_at:'' },
        ] as DiaryEntry[],
        behavior: [
          { id:'b1', profile_id:'x', entry_date:'2026-07-01', time_of_day:'09:15', behavior:'meltdown',          severity:3, location:'home',   antecedent:'transition',        antecedent_note:'Moving from screen time to breakfast', consequence:'Deep pressure vest applied', helped:'somewhat', duration_mins:15, notes:'', created_at:'' },
          { id:'b2', profile_id:'x', entry_date:'2026-07-03', time_of_day:'14:00', behavior:'aggression',         severity:4, location:'school', antecedent:'loud noise',        antecedent_note:'Unexpected fire drill mid-morning',    consequence:'Moved to quiet corner with headphones', helped:'yes', duration_mins:20, notes:'Very startled initially', created_at:'' },
          { id:'b3', profile_id:'x', entry_date:'2026-07-05', time_of_day:'16:30', behavior:'stimming spike',     severity:2, location:'home',   antecedent:'hunger',            antecedent_note:'',                                     consequence:'Offered snack break', helped:'yes', duration_mins:5, notes:'', created_at:'' },
          { id:'b4', profile_id:'x', entry_date:'2026-07-07', time_of_day:'11:00', behavior:'meltdown',           severity:5, location:'store',  antecedent:'sensory overload',  antecedent_note:'Crowded grocery store with loud music', consequence:'Left store immediately, sat in car', helped:'yes', duration_mins:25, notes:'Very intense — worst this week', created_at:'' },
          { id:'b5', profile_id:'x', entry_date:'2026-07-08', time_of_day:'08:00', behavior:'shutdown',           severity:2, location:'home',   antecedent:'transition',        antecedent_note:'School morning routine', consequence:'Given extra prep time', helped:'somewhat', duration_mins:10, notes:'', created_at:'' },
          { id:'b6', profile_id:'x', entry_date:'2026-07-09', time_of_day:'15:30', behavior:'meltdown',           severity:3, location:'school', antecedent:'denied request',    antecedent_note:'Asked for iPad during class', consequence:'Redirection with fidget toy', helped:'somewhat', duration_mins:12, notes:'', created_at:'' },
          { id:'b7', profile_id:'x', entry_date:'2026-07-10', time_of_day:'17:00', behavior:'elopement',          severity:4, location:'park',   antecedent:'schedule change',   antecedent_note:'Park closed early unexpectedly', consequence:'Physical redirect, visual schedule shown', helped:'yes', duration_mins:8, notes:'', created_at:'' },
          { id:'b8', profile_id:'x', entry_date:'2026-07-11', time_of_day:'10:30', behavior:'stimming spike',     severity:1, location:'home',   antecedent:'hunger',            antecedent_note:'Snack delayed by 30 min', consequence:'Snack offered immediately', helped:'yes', duration_mins:3, notes:'', created_at:'' },
          { id:'b9', profile_id:'x', entry_date:'2026-07-12', time_of_day:'09:00', behavior:'meltdown',           severity:3, location:'home',   antecedent:'unfamiliar person', antecedent_note:'New babysitter introduced without prep', consequence:'Calming kit used, stayed nearby', helped:'yes', duration_mins:18, notes:'', created_at:'' },
          { id:'b10',profile_id:'x', entry_date:'2026-07-14', time_of_day:'13:00', behavior:'self-injury',        severity:4, location:'home',   antecedent:'sensory overload',  antecedent_note:'Too much visual stimulation at lunch', consequence:'Dimmed lights, removed extra items', helped:'yes', duration_mins:14, notes:'Head-banging on table twice', created_at:'' },
          { id:'b11',profile_id:'x', entry_date:'2026-07-15', time_of_day:'07:45', behavior:'shutdown',           severity:2, location:'home',   antecedent:'transition',        antecedent_note:'Early wake-up school day', consequence:'Extra quiet morning routine', helped:'yes', duration_mins:20, notes:'', created_at:'' },
        ] as BehaviorLog[],
        sensory: [
          { id:'s1', profile_id:'x', entry_date:'2026-07-02', time_of_day:'10:00', regulation_level:'anxious',      location:'school', duration_mins:20, sensory_triggers:['Noise','Light'],    calming_strategies:['Headphones','Quiet space'],   helped:'yes',      notes:'Settled well after headphones', created_at:'' },
          { id:'s2', profile_id:'x', entry_date:'2026-07-04', time_of_day:'13:00', regulation_level:'calm',          location:'home',   duration_mins:null,sensory_triggers:[],                   calming_strategies:[],                             helped:'yes',      notes:'Great afternoon, played independently', created_at:'' },
          { id:'s3', profile_id:'x', entry_date:'2026-07-07', time_of_day:'12:00', regulation_level:'dysregulated',  location:'store',  duration_mins:30, sensory_triggers:['Crowd','Smell'],    calming_strategies:['Movement/rocking'],           helped:'somewhat', notes:'Required full exit', created_at:'' },
          { id:'s4', profile_id:'x', entry_date:'2026-07-09', time_of_day:'09:30', regulation_level:'alert',         location:'school', duration_mins:15, sensory_triggers:['Light'],            calming_strategies:['Preferred item'],             helped:'yes',      notes:'', created_at:'' },
          { id:'s5', profile_id:'x', entry_date:'2026-07-11', time_of_day:'14:00', regulation_level:'calm',          location:'home',   duration_mins:null,sensory_triggers:[],                   calming_strategies:[],                             helped:'yes',      notes:'Good regulated afternoon', created_at:'' },
          { id:'s6', profile_id:'x', entry_date:'2026-07-13', time_of_day:'11:00', regulation_level:'anxious',       location:'therapy',duration_mins:25, sensory_triggers:['Touch','Texture'],  calming_strategies:['Deep pressure','Quiet space'], helped:'yes',     notes:'Tactile defensiveness noted', created_at:'' },
          { id:'s7', profile_id:'x', entry_date:'2026-07-14', time_of_day:'16:00', regulation_level:'shutdown',      location:'home',   duration_mins:40, sensory_triggers:['Noise','Crowd'],    calming_strategies:['Weighted blanket'],           helped:'somewhat', notes:'Very withdrawn after school', created_at:'' },
        ] as SensoryLog[],
        sleep: [
          { id:'sl1', profile_id:'x', log_date:'2026-07-01', bedtime:'20:30', wake_time:'06:45', total_sleep_minutes:495, sleep_quality:4, night_wakings_count:1, night_wakings_detail:[{cause:'bad dream', duration_minutes:15}], nap_enabled:false, naps:[], notes:'', created_at:'' },
          { id:'sl2', profile_id:'x', log_date:'2026-07-02', bedtime:'20:15', wake_time:'06:30', total_sleep_minutes:495, sleep_quality:4, night_wakings_count:0, night_wakings_detail:[], nap_enabled:false, naps:[], notes:'Good night', created_at:'' },
          { id:'sl3', profile_id:'x', log_date:'2026-07-04', bedtime:'21:30', wake_time:'07:00', total_sleep_minutes:450, sleep_quality:3, night_wakings_count:2, night_wakings_detail:[{cause:'refused to sleep', duration_minutes:30},{cause:'night waking',duration_minutes:10}], nap_enabled:false, naps:[], notes:'Late bedtime after fireworks', created_at:'' },
          { id:'sl4', profile_id:'x', log_date:'2026-07-06', bedtime:'20:00', wake_time:'05:30', total_sleep_minutes:330, sleep_quality:2, night_wakings_count:3, night_wakings_detail:[{cause:'stimming', duration_minutes:40}], nap_enabled:true, naps:[{start:'13:00',end:'14:30',duration_minutes:90}], notes:'Very rough night — overtired next day', created_at:'' },
          { id:'sl5', profile_id:'x', log_date:'2026-07-08', bedtime:'20:45', wake_time:'07:00', total_sleep_minutes:495, sleep_quality:4, night_wakings_count:0, night_wakings_detail:[], nap_enabled:false, naps:[], notes:'', created_at:'' },
          { id:'sl6', profile_id:'x', log_date:'2026-07-10', bedtime:'20:00', wake_time:'06:45', total_sleep_minutes:525, sleep_quality:5, night_wakings_count:0, night_wakings_detail:[], nap_enabled:false, naps:[], notes:'Best sleep in weeks', created_at:'' },
          { id:'sl7', profile_id:'x', log_date:'2026-07-12', bedtime:'21:00', wake_time:'06:30', total_sleep_minutes:450, sleep_quality:3, night_wakings_count:1, night_wakings_detail:[{cause:'noise outside', duration_minutes:20}], nap_enabled:false, naps:[], notes:'', created_at:'' },
          { id:'sl8', profile_id:'x', log_date:'2026-07-14', bedtime:'20:15', wake_time:'06:30', total_sleep_minutes:495, sleep_quality:4, night_wakings_count:0, night_wakings_detail:[], nap_enabled:false, naps:[], notes:'', created_at:'' },
        ] as unknown as SleepLog[],
        diet: [
          { id:'di1', profile_id:'x', entry_date:'2026-07-01', time_of_day:'07:30', log_type:'meal', meal_type:'breakfast', foods_eaten:['Oatmeal','Banana','Almond milk'], new_food_introduced:false, notes:'', created_at:'' },
          { id:'di2', profile_id:'x', entry_date:'2026-07-01', time_of_day:'07:30', log_type:'supplements', supplements_checked:['Vitamin D','Magnesium glycinate','Omega-3'], notes:'All given with breakfast', created_at:'' },
          { id:'di3', profile_id:'x', entry_date:'2026-07-02', time_of_day:'07:45', log_type:'smoothie', smoothie_type:'morning', ingredients_omitted:['spinach'], hydration:'good', notes:'Refused spinach again', created_at:'' },
          { id:'di4', profile_id:'x', entry_date:'2026-07-03', time_of_day:'12:00', log_type:'meal', meal_type:'lunch', foods_eaten:['Grilled chicken strips','Rice','Cucumber'], new_food_introduced:true, new_food_name:'Cucumber slices', new_food_acceptance:'neutral', notes:'', created_at:'' },
          { id:'di5', profile_id:'x', entry_date:'2026-07-05', time_of_day:'08:00', log_type:'smoothie', smoothie_type:'morning', ingredients_omitted:[], hydration:'great', notes:'Drank the whole thing!', created_at:'' },
          { id:'di6', profile_id:'x', entry_date:'2026-07-07', time_of_day:'08:00', log_type:'medications', medications_checked:['Melatonin 1mg (bedtime)'], notes:'', created_at:'' },
          { id:'di7', profile_id:'x', entry_date:'2026-07-10', time_of_day:'12:30', log_type:'meal', meal_type:'lunch', foods_eaten:['PB&J sandwich','Apple slices','Milk'], new_food_introduced:false, notes:'', created_at:'' },
          { id:'di8', profile_id:'x', entry_date:'2026-07-13', time_of_day:'18:00', log_type:'meal', meal_type:'dinner', foods_eaten:['Pasta (plain)','Broccoli (refused)','Bread'], new_food_introduced:false, notes:'Refused broccoli but tolerated it on the plate', created_at:'' },
        ] as DietLog[],
        goals: [
          { id:'g1', profile_id:'x', title:'Independent morning routine', description:'Complete all 5 steps of the morning routine (wake, dress, brush teeth, eat breakfast, put on shoes) without physical or verbal prompting from a caregiver.', status:'active', source:'OT', start_date:'2026-06-01', target_date:'2026-08-31', created_at:'' },
          { id:'g2', profile_id:'x', title:'Reduce meltdown average duration', description:'Bring the average meltdown duration below 10 minutes through proactive regulation strategies and environmental modifications.', status:'active', source:'BCBA', start_date:'2026-05-15', target_date:'2026-09-01', created_at:'' },
          { id:'g3', profile_id:'x', title:'Expand food variety to 25 accepted foods', description:'Systematically introduce new foods using food chaining, reaching a total accepted food list of 25 items.', status:'active', source:'Feeding therapist', start_date:'2026-04-01', target_date:'2026-12-01', created_at:'' },
          { id:'g4', profile_id:'x', title:'Tolerate haircuts without distress', description:'Complete a haircut at the salon using desensitization protocol without significant behavioral escalation.', status:'achieved', source:'OT', start_date:'2026-01-10', target_date:'2026-06-30', created_at:'' },
        ] as Goal[],
        progressNotes: [
          { id:'p1', profile_id:'x', goal_id:'g1', note_date:'2026-07-03', rating:'making_progress', notes:'Completed 4/5 steps independently — just needed a verbal cue for shoes', created_at:'' },
          { id:'p2', profile_id:'x', goal_id:'g1', note_date:'2026-07-10', rating:'making_progress', notes:'All 5 steps with only one gestural prompt for teeth brushing', created_at:'' },
          { id:'p3', profile_id:'x', goal_id:'g2', note_date:'2026-07-07', rating:'mixed',           notes:'Long incident at the store (25 min) but school incidents much shorter this week', created_at:'' },
          { id:'p4', profile_id:'x', goal_id:'g2', note_date:'2026-07-14', rating:'making_progress', notes:'Average duration trending down — 4 incidents averaged 14 min combined', created_at:'' },
          { id:'p5', profile_id:'x', goal_id:'g3', note_date:'2026-07-05', rating:'making_progress', notes:'Accepted cucumber slices for the first time — now at 18 accepted foods', created_at:'' },
        ] as ProgressNote[],
        appointments: [
          { id:'a1', profile_id:'x', appt_date:'2026-07-02', appt_time:'10:00', type:'OT Session', provider_id:'pr1', status:'completed', notes:'Worked on fine motor coordination and reviewed sensory diet. Home program updated.', followup_needed:true, followup_date:'2026-07-16', followup_text:'Bring sensory diet log for review', created_at:'' },
          { id:'a2', profile_id:'x', appt_date:'2026-07-09', appt_time:'14:00', type:'BCBA Session', provider_id:'pr2', status:'completed', notes:'Reviewed behavior data. Updated antecedent strategies for store and transition situations.', followup_needed:false, followup_date:null, followup_text:null, created_at:'' },
          { id:'a3', profile_id:'x', appt_date:'2026-07-16', appt_time:'09:00', type:'Pediatrician - 6-month check', provider_id:'pr3', status:'scheduled', notes:'Bring behavior log summary and current medication/supplement list.', followup_needed:false, followup_date:null, followup_text:null, created_at:'' },
        ] as Appointment[],
        providers: [
          { id:'pr1', profile_id:'x', name:'Sarah M., MOT/L', role:'Occupational Therapist', phone:'555-0101', email:'sarah@example.com', notes:'Specializes in sensory processing and feeding', created_at:'' },
          { id:'pr2', profile_id:'x', name:'Dr. James R., BCBA-D', role:'Board Certified Behavior Analyst', phone:'555-0102', email:'james@example.com', notes:'Monthly data review + home consultation quarterly', created_at:'' },
          { id:'pr3', profile_id:'x', name:'Dr. Aisha K., MD', role:'Pediatrician', phone:'555-0103', email:'aisha@example.com', notes:'Primary care — familiar with diagnosis history', created_at:'' },
        ] as Provider[],
        customTrackers: [],
        customTrackerLogs: [],
      })
      setSampleStatus('done')
      setTimeout(() => setSampleStatus('idle'), 3000)
    } catch {
      setSampleStatus('idle')
      toast.error('Could not generate sample report')
    }
  }

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

      {/* ── Sample report ────────────────────────────────────────────────────── */}
      <div className="border-t border-warm-200 pt-4 space-y-2">
        <p className="text-center text-xs text-gray-400 font-medium">Want to see the PDF format first?</p>
        <button
          type="button"
          onClick={handleSampleReport}
          disabled={sampleStatus === 'generating' || isGenerating}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-warm-200 bg-warm-50 text-gray-600 text-sm font-semibold hover:bg-warm-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {sampleStatus === 'generating' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating sample…</span>
            </>
          ) : sampleStatus === 'done' ? (
            <>
              <Download className="w-4 h-4" />
              <span>Sample downloaded!</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Download sample PDF report</span>
            </>
          )}
        </button>
        <p className="text-center text-xs text-gray-400">
          Uses fictional data — shows all sections and the summary chart.
        </p>
      </div>
    </div>
  )
}
