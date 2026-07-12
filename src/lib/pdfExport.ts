import jsPDF from 'jspdf'
import { format, parseISO } from 'date-fns'
import type {
  DiaryEntry, BehaviorLog, SensoryLog, DietLog, SleepLog,
  Goal, ProgressNote, Appointment, Provider,
} from '../types'
import { qualityLabel } from './sleepConstants'
import { ratingMeta, statusMeta } from './goalConstants'
import { SEVERITY_LABELS } from './behaviorConstants'
import { REGULATION_LABEL } from './sensoryConstants'

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE_W  = 210
const PAGE_H  = 297
const MX      = 18          // horizontal margin
const HEADER_H = 13         // page header bar height
const CONTENT_TOP = HEADER_H + 6  // first content y after header
const CONTENT_BOT = PAGE_H - 18   // last content y before footer
const CW      = PAGE_W - MX * 2   // content width

// ─── Color palettes ───────────────────────────────────────────────────────────

const C = {
  brand:   [37, 99, 235]  as [number,number,number],
  dark:    [15, 23, 42]   as [number,number,number],
  mid:     [71, 85, 105]  as [number,number,number],
  light:   [148,163,184]  as [number,number,number],
  amber:   [217,119,6]    as [number,number,number],
  indigo:  [79, 70, 229]  as [number,number,number],
  emerald: [5, 150, 105]  as [number,number,number],
  violet:  [124,58, 237]  as [number,number,number],
  teal:    [13, 148, 136] as [number,number,number],
  rose:    [225,29, 72]   as [number,number,number],
  warmBg:  [250,248,245]  as [number,number,number],
  border:  [226,220,213]  as [number,number,number],
  white:   [255,255,255]  as [number,number,number],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  try { return format(parseISO(d + 'T12:00:00'), 'MMM d, yyyy') } catch { return d }
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [hStr, m] = t.split(':')
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${ampm}`
}

function fmtMins(mins: number | null | undefined): string {
  if (!mins) return ''
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

// ─── PDF writer state ─────────────────────────────────────────────────────────

class PDFWriter {
  doc: jsPDF
  y = CONTENT_TOP
  pageNum = 1
  childName: string
  generatedDate: string

  constructor(childName: string, generatedDate: string) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' })
    this.childName = childName
    this.generatedDate = generatedDate
  }

  // ── Setters ──────────────────────────────────────────────────────────────────

  setColor(c: [number,number,number]) { this.doc.setTextColor(c[0], c[1], c[2]) }
  setFill(c: [number,number,number])  { this.doc.setFillColor(c[0], c[1], c[2]) }
  setDraw(c: [number,number,number])  { this.doc.setDrawColor(c[0], c[1], c[2]) }

  // ── Page management ───────────────────────────────────────────────────────────

  drawPageHeader() {
    this.setFill(C.brand)
    this.doc.rect(0, 0, PAGE_W, HEADER_H, 'F')
    this.setColor(C.white)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8)
    this.doc.text(this.childName, MX, 8.5)
    this.doc.text(`Page ${this.pageNum}`, PAGE_W - MX, 8.5, { align: 'right' })
    this.setColor(C.dark)
  }

  drawPageFooter() {
    this.setDraw(C.border)
    this.doc.setLineWidth(0.3)
    this.doc.line(MX, PAGE_H - 10, PAGE_W - MX, PAGE_H - 10)
    this.setColor(C.light)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7)
    this.doc.text(`Generated ${this.generatedDate}  |  Confidential - Care & Progress Report`, MX, PAGE_H - 6)
  }

  newPage() {
    this.drawPageFooter()
    this.doc.addPage()
    this.pageNum++
    this.y = CONTENT_TOP
    this.drawPageHeader()
  }

  check(needed: number) {
    if (this.y + needed > CONTENT_BOT) this.newPage()
  }

  // ── Text primitives ───────────────────────────────────────────────────────────

  /** Write a single line of text. Returns line height used. */
  line(text: string, opts?: { size?: number; bold?: boolean; color?: [number,number,number]; indent?: number; align?: 'left'|'right'|'center' }) {
    const { size = 10, bold = false, color = C.dark, indent = 0, align = 'left' } = opts ?? {}
    this.doc.setFontSize(size)
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.setColor(color)
    const x = align === 'right' ? PAGE_W - MX : MX + indent
    this.doc.text(text, x, this.y, { align })
    const h = size * 0.35 + 2
    this.y += h
    return h
  }

  /** Write wrapped text. Returns total height used. */
  wrapped(text: string, opts?: { size?: number; bold?: boolean; color?: [number,number,number]; indent?: number; lineGap?: number }) {
    const { size = 9.5, bold = false, color = C.mid, indent = 0, lineGap = 1.2 } = opts ?? {}
    this.doc.setFontSize(size)
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.setColor(color)
    const lines = this.doc.splitTextToSize(text, CW - indent) as string[]
    const lineH = size * 0.35 + lineGap
    const totalH = lines.length * lineH
    this.check(totalH)
    this.doc.text(lines, MX + indent, this.y)
    this.y += totalH
    return totalH
  }

  gap(mm = 3) { this.y += mm }

  /** Horizontal rule */
  rule(color = C.border, weight = 0.3) {
    this.setDraw(color)
    this.doc.setLineWidth(weight)
    this.doc.line(MX, this.y, PAGE_W - MX, this.y)
    this.y += 3
  }

  /** Filled section header bar */
  sectionHeader(label: string, color: [number,number,number]) {
    this.check(14)
    this.setFill(color)
    // subtle tint bar
    const bg: [number,number,number] = [color[0], color[1], color[2]]
    this.doc.setFillColor(bg[0] + Math.round((255-bg[0])*0.88), bg[1] + Math.round((255-bg[1])*0.88), bg[2] + Math.round((255-bg[2])*0.88))
    this.doc.rect(MX, this.y - 1, CW, 8, 'F')
    this.setColor(color)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(11)
    this.doc.text(label, MX + 2, this.y + 5)
    this.y += 10
  }

  /** Entry date/time label */
  entryHeader(dateStr: string, sub?: string) {
    this.check(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(10)
    this.setColor(C.dark)
    const label = sub ? `${dateStr}  |  ${sub}` : dateStr
    this.doc.text(label, MX, this.y)
    this.y += 5
  }

  /** Bullet detail line */
  detail(text: string, indent = 3) {
    if (!text) return
    this.check(6)
    this.wrapped(text, { size: 9, color: C.mid, indent })
    this.gap(0.5)
  }

  get blob(): Blob {
    return this.doc.output('blob')
  }
}

// ─── Summary computation ──────────────────────────────────────────────────────

function buildSummary(params: PDFExportParams) {
  const behaviorCount = params.behavior.length
  const avgSeverity = behaviorCount > 0
    ? params.behavior.reduce((s, b) => s + b.severity, 0) / behaviorCount
    : null

  const antFreq: Record<string,number> = {}
  for (const b of params.behavior) {
    if (b.antecedent && b.antecedent !== 'other') antFreq[b.antecedent] = (antFreq[b.antecedent]??0)+1
  }
  const topAnt = Object.entries(antFreq).sort(([,a],[,b])=>b-a).slice(0,2).map(([a])=>a)

  const completeSleep = params.sleep.filter(s => s.total_sleep_minutes != null)
  const avgSleepMins = completeSleep.length
    ? completeSleep.reduce((s,l)=>s+(l.total_sleep_minutes!),0)/completeSleep.length
    : null
  const avgQuality = completeSleep.length
    ? completeSleep.reduce((s,l)=>s+(l.sleep_quality??0),0)/completeSleep.length
    : null

  const meals = params.diet.filter(d=>d.log_type==='meal').length
  const smoothies = params.diet.filter(d=>d.log_type==='smoothie').length
  const activeGoals = params.goals.filter(g=>g.status==='active').length

  return { behaviorCount, avgSeverity, topAnt, avgSleepMins, avgQuality, meals, smoothies, activeGoals }
}

// ─── Module renderers ─────────────────────────────────────────────────────────

function renderDiary(w: PDFWriter, entries: DiaryEntry[]) {
  if (!entries.length) return
  w.sectionHeader('DIARY ENTRIES', C.brand)
  for (const e of entries.sort((a,b)=>a.entry_date.localeCompare(b.entry_date))) {
    w.check(20)
    w.entryHeader(fmtDate(e.entry_date))
    w.wrapped(e.note, { size: 9.5, color: C.mid })
    if (e.tags?.length) w.detail(`Tags: ${e.tags.join(', ')}`)
    w.gap(4)
  }
}

function renderBehavior(w: PDFWriter, logs: BehaviorLog[]) {
  if (!logs.length) return
  w.sectionHeader('BEHAVIOR LOGS', C.amber)
  for (const l of logs.sort((a,b)=>a.entry_date.localeCompare(b.entry_date)||a.time_of_day.localeCompare(b.time_of_day))) {
    w.check(28)
    const severityLabel = SEVERITY_LABELS[l.severity]?.label ?? `${l.severity}/5`
    const durationPart = l.duration_mins ? `, ${l.duration_mins} min` : ''
    w.entryHeader(fmtDate(l.entry_date), fmtTime(l.time_of_day))
    w.detail(`${capitalize(l.behavior)}  |  Severity: ${severityLabel} (${l.severity}/5)${durationPart}  |  Location: ${capitalize(l.location)}`)
    const ant = l.antecedent_note ? `${capitalize(l.antecedent)} - ${l.antecedent_note}` : capitalize(l.antecedent)
    w.detail(`Triggered by: ${ant}`)
    w.detail(`Response: ${l.consequence} - ${capitalize(l.helped)}`)
    w.gap(4)
  }
}

function renderSensory(w: PDFWriter, logs: SensoryLog[]) {
  if (!logs.length) return
  w.sectionHeader('SENSORY & REGULATION', C.violet)
  for (const l of logs.sort((a,b)=>a.entry_date.localeCompare(b.entry_date)||a.time_of_day.localeCompare(b.time_of_day))) {
    w.check(24)
    w.entryHeader(fmtDate(l.entry_date), fmtTime(l.time_of_day))
    const zone = REGULATION_LABEL[l.regulation_level] ?? capitalize(l.regulation_level)
    const dur = l.duration_mins ? `  |  ${l.duration_mins} min` : ''
    w.detail(`Zone: ${zone}${dur}  |  Location: ${capitalize(l.location)}`)
    if (l.sensory_triggers?.length) w.detail(`Triggers: ${l.sensory_triggers.join(', ')}`)
    if (l.calming_strategies?.length) w.detail(`Strategies: ${l.calming_strategies.join(', ')} - ${capitalize(l.helped)}`)
    if (l.notes) w.detail(`Notes: ${l.notes}`)
    w.gap(4)
  }
}

function renderDiet(w: PDFWriter, logs: DietLog[]) {
  if (!logs.length) return
  w.sectionHeader('DIET & NUTRITION', C.emerald)
  for (const l of logs.sort((a,b)=>a.entry_date.localeCompare(b.entry_date)||a.time_of_day.localeCompare(b.time_of_day))) {
    w.check(22)
    let header = ''
    if (l.log_type === 'meal') header = `${capitalize(l.meal_type ?? 'Meal')}`
    else if (l.log_type === 'smoothie') header = `Smoothie${l.smoothie_type ? `: ${l.smoothie_type}` : ''}`
    else if (l.log_type === 'supplements') header = 'Supplements'
    else header = 'Medications'
    w.entryHeader(fmtDate(l.entry_date), `${fmtTime(l.time_of_day)}  |  ${header}`)
    if (l.log_type === 'meal' && l.foods_eaten?.length)
      w.detail(`Foods: ${l.foods_eaten.join(', ')}`)
    if (l.new_food_introduced && l.new_food_name)
      w.detail(`New food trial: ${l.new_food_name} (${capitalize(l.new_food_acceptance ?? 'unknown')})`)
    if (l.log_type === 'smoothie') {
      if (l.ingredients_omitted?.length) w.detail(`Omitted: ${l.ingredients_omitted.join(', ')}`)
      if (l.hydration) w.detail(`Hydration: ${capitalize(l.hydration)}`)
    }
    if (l.log_type === 'supplements' && l.supplements_checked?.length)
      w.detail(`Supplements: ${l.supplements_checked.join(', ')}`)
    if (l.log_type === 'medications' && l.medications_checked?.length)
      w.detail(`Medications: ${l.medications_checked.join(', ')}`)
    if (l.substitution_notes) w.detail(`Notes: ${l.substitution_notes}`)
    if (l.notes && l.notes !== l.substitution_notes) w.detail(`Notes: ${l.notes}`)
    w.gap(4)
  }
}

function renderSleep(w: PDFWriter, logs: SleepLog[]) {
  if (!logs.length) return
  w.sectionHeader('SLEEP', C.indigo)
  for (const l of logs.sort((a,b)=>a.log_date.localeCompare(b.log_date))) {
    w.check(22)
    const isDraft = !l.wake_time
    w.entryHeader(fmtDate(l.log_date), isDraft ? '(draft)' : undefined)
    const parts: string[] = []
    if (l.bedtime) parts.push(`Bedtime: ${fmtTime(l.bedtime)}`)
    if (l.wake_time) parts.push(`Wake: ${fmtTime(l.wake_time)}`)
    if (l.total_sleep_minutes) parts.push(`Total: ${fmtMins(l.total_sleep_minutes)}`)
    if (l.sleep_quality) parts.push(`Quality: ${qualityLabel(l.sleep_quality)}`)
    if (parts.length) w.detail(parts.join('  |  '))
    if (l.night_wakings_count > 0) {
      const wakingDetails = l.night_wakings_detail?.length
        ? l.night_wakings_detail.map(w => `${w.cause}${w.duration_minutes ? ` (${w.duration_minutes} min)` : ''}`).join(', ')
        : ''
      w.detail(`Night wakings: ${l.night_wakings_count}${wakingDetails ? `  |  ${wakingDetails}` : ''}`)
    }
    if (l.nap_enabled && l.naps?.length) {
      w.detail(`Naps: ${l.naps.length} nap(s)`)
    }
    if (l.notes) w.detail(`Notes: ${l.notes}`)
    w.gap(4)
  }
}

function renderGoals(w: PDFWriter, goals: Goal[], progressNotes: ProgressNote[]) {
  if (!goals.length) return
  w.sectionHeader('GOALS & PROGRESS', C.teal)
  const notesByGoal = new Map<string, ProgressNote[]>()
  for (const n of progressNotes) {
    const arr = notesByGoal.get(n.goal_id) ?? []
    arr.push(n)
    notesByGoal.set(n.goal_id, arr)
  }

  for (const g of goals.sort((a,b)=>a.status.localeCompare(b.status)||a.title.localeCompare(b.title))) {
    w.check(24)
    w.entryHeader(g.title)
    const sm = statusMeta(g.status)
    const dateParts = [`Start: ${fmtDate(g.start_date)}`]
    if (g.target_date) dateParts.push(`Target: ${fmtDate(g.target_date)}`)
    w.detail(`Source: ${g.source}  |  Status: ${sm.label}  |  ${dateParts.join('  |  ')}`)
    if (g.description) w.wrapped(g.description, { size: 9, color: C.mid, indent: 3 })

    const notes = (notesByGoal.get(g.id) ?? []).sort((a,b)=>a.note_date.localeCompare(b.note_date))
    if (notes.length) {
      w.gap(2)
      w.detail(`Progress notes (${notes.length} in range):`)
      for (const n of notes) {
        const rm = ratingMeta(n.rating)
        const noteText = n.notes ? ` - ${n.notes}` : ''
        w.detail(`- ${fmtDate(n.note_date)}: ${rm.label}${noteText}`, 6)
      }
    }
    w.gap(5)
    w.rule()
  }
}

function renderAppointments(w: PDFWriter, appts: Appointment[], providers: Provider[]) {
  if (!appts.length) return
  const provMap = new Map(providers.map(p=>[p.id,p]))
  w.sectionHeader('APPOINTMENTS', C.rose)
  for (const a of appts.sort((x,y)=>x.appt_date.localeCompare(y.appt_date))) {
    w.check(22)
    const prov = a.provider_id ? provMap.get(a.provider_id) : null
    const provStr = prov ? `${prov.name} (${prov.role})` : 'No provider'
    w.entryHeader(fmtDate(a.appt_date), fmtTime(a.appt_time ?? undefined))
    w.detail(`${a.type}  |  ${provStr}  |  Status: ${capitalize(a.status)}`)
    if (a.notes) w.detail(`Notes: ${a.notes}`)
    if (a.followup_needed) {
      const fuDate = a.followup_date ? `  (by ${fmtDate(a.followup_date)})` : ''
      w.detail(`Follow-up needed${fuDate}: ${a.followup_text ?? ''}`)
    }
    w.gap(4)
  }
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function renderCover(w: PDFWriter, params: PDFExportParams) {
  // Accent bar on left edge
  w.setFill(C.brand)
  w.doc.rect(0, 0, 6, PAGE_H, 'F')

  // Title block
  w.y = 50
  w.doc.setFont('helvetica', 'bold')
  w.doc.setFontSize(22)
  w.setColor(C.brand)
  w.doc.text('Care & Progress Report', MX + 6, w.y)
  w.y += 12

  w.doc.setFontSize(28)
  w.setColor(C.dark)
  w.doc.text(params.childName, MX + 6, w.y)
  w.y += 14

  w.setColor(C.mid)
  w.doc.setFont('helvetica', 'normal')
  w.doc.setFontSize(12)
  w.doc.text(`${fmtDate(params.startDate)} to ${fmtDate(params.endDate)}`, MX + 6, w.y)
  w.y += 8

  w.setColor(C.light)
  w.doc.setFontSize(9)
  w.doc.text(`Generated on ${params.generatedDate}`, MX + 6, w.y)
  w.y += 16

  // Rule
  w.setFill(C.border)
  w.doc.rect(MX + 6, w.y, CW - 6, 0.4, 'F')
  w.y += 8

  // Included modules list
  w.doc.setFont('helvetica', 'bold')
  w.doc.setFontSize(9)
  w.setColor(C.mid)
  w.doc.text('SECTIONS INCLUDED', MX + 6, w.y)
  w.y += 6
  w.doc.setFont('helvetica', 'normal')
  w.doc.setFontSize(10)
  w.setColor(C.dark)
  for (const m of params.modules) {
    const labels: Record<string,string> = {
      diary:        'Diary Entries',
      behavior:     'Behavior Logs',
      sensory:      'Sensory & Regulation',
      diet:         'Diet & Nutrition',
      sleep:        'Sleep',
      goals:        'Goals & Progress',
      appointments: 'Appointments',
    }
    w.doc.text(`- ${labels[m] ?? m}`, MX + 10, w.y)
    w.y += 6
  }

  // Summary stats
  w.y += 10
  w.doc.setFont('helvetica', 'bold')
  w.doc.setFontSize(9)
  w.setColor(C.mid)
  w.doc.text('SUMMARY', MX + 6, w.y)
  w.y += 6

  const s = buildSummary(params)
  const statLines: string[] = []
  if (params.modules.includes('behavior'))
    statLines.push(`Behavior incidents: ${s.behaviorCount}${s.avgSeverity ? `  |  Avg severity: ${s.avgSeverity.toFixed(1)}/5` : ''}${s.topAnt.length ? `  |  Top trigger${s.topAnt.length>1?'s':''}: ${s.topAnt.join(', ')}` : ''}`)
  if (params.modules.includes('sleep') && s.avgSleepMins)
    statLines.push(`Avg sleep: ${fmtMins(s.avgSleepMins)}${s.avgQuality ? `  |  Avg quality: ${qualityLabel(Math.round(s.avgQuality))}` : ''}`)
  if (params.modules.includes('diet'))
    statLines.push(`Diet: ${s.meals} meal${s.meals!==1?'s':''}  |  ${s.smoothies} smoothie${s.smoothies!==1?'s':''}`)
  if (params.modules.includes('goals'))
    statLines.push(`Goals: ${s.activeGoals} active  |  ${params.progressNotes.length} progress note${params.progressNotes.length!==1?'s':''} in range`)

  w.doc.setFont('helvetica', 'normal')
  w.doc.setFontSize(10)
  w.setColor(C.dark)
  for (const sl of statLines) {
    const lines = w.doc.splitTextToSize(sl, CW - 10) as string[]
    w.doc.text(lines, MX + 6, w.y)
    w.y += lines.length * 5.5
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface PDFExportParams {
  childName: string
  startDate: string
  endDate: string
  generatedDate: string
  modules: string[]
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

export async function generatePDF(params: PDFExportParams): Promise<Blob> {
  // Defer to allow the UI loading state to paint first
  await new Promise(r => setTimeout(r, 50))

  const w = new PDFWriter(params.childName, params.generatedDate)

  // ── Cover page ──────────────────────────────────────────────────────────────
  renderCover(w, params)

  // ── Content pages ───────────────────────────────────────────────────────────
  const MODULE_ORDER = ['diary', 'behavior', 'sensory', 'diet', 'sleep', 'goals', 'appointments']
  for (const mod of MODULE_ORDER) {
    if (!params.modules.includes(mod)) continue
    w.newPage()
    if (mod === 'diary')        renderDiary(w, params.diary)
    if (mod === 'behavior')     renderBehavior(w, params.behavior)
    if (mod === 'sensory')      renderSensory(w, params.sensory)
    if (mod === 'diet')         renderDiet(w, params.diet)
    if (mod === 'sleep')        renderSleep(w, params.sleep)
    if (mod === 'goals')        renderGoals(w, params.goals, params.progressNotes)
    if (mod === 'appointments') renderAppointments(w, params.appointments, params.providers)
  }

  w.drawPageFooter()
  return w.blob
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function downloadPDF(params: PDFExportParams): Promise<void> {
  const blob = await generatePDF(params)
  const filename = `${slug(params.childName)}-report-${params.startDate}-${params.endDate}.pdf`
  triggerDownload(blob, filename)
}
