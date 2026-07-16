import jsPDF from 'jspdf'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import type {
  CustomTracker, CustomTrackerLog,
  DiaryEntry, BehaviorLog, SensoryLog, DietLog, SleepLog,
  Goal, ProgressNote, Appointment, Provider,
} from '../types'
import { qualityLabel } from './sleepConstants'
import { ratingMeta, statusMeta } from './goalConstants'
import { SEVERITY_LABELS } from './behaviorConstants'
import { REGULATION_LABEL } from './sensoryConstants'
import { formatTrackerValue } from './trackerIcons'

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

// Severity-level colors (1=Mild … 5=Severe)
const SEV_COLORS: [number,number,number][] = [
  [0,0,0],           // 0 unused
  [5,   150, 105],   // 1 Mild     – emerald
  [101, 163, 13],    // 2 Low      – lime
  [217, 119, 6],     // 3 Moderate – amber
  [234, 88,  12],    // 4 High     – orange
  [220, 38,  38],    // 5 Severe   – red
]

// Regulation-zone colors (matching app's fixed gradient palette)
const ZONE_COLORS: Record<string,[number,number,number]> = {
  calm:         [143, 184, 156],
  alert:        [169, 192, 138],
  anxious:      [232, 199, 126],
  dysregulated: [217, 154, 108],
  shutdown:     [199, 123, 106],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  try { return format(parseISO(d + 'T12:00:00'), 'MMM d, yyyy') } catch { return d }
}

function fmtDateShort(d: string) {
  try { return format(parseISO(d + 'T12:00:00'), 'M/d') } catch { return d }
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

  // Per-severity counts
  const bySeverity: Record<number, number> = {1:0, 2:0, 3:0, 4:0, 5:0}
  for (const b of params.behavior) {
    bySeverity[b.severity] = (bySeverity[b.severity] ?? 0) + 1
  }

  const antFreq: Record<string,number> = {}
  for (const b of params.behavior) {
    if (b.antecedent && b.antecedent !== 'other') antFreq[b.antecedent] = (antFreq[b.antecedent]??0)+1
  }
  const topAnt = Object.entries(antFreq).sort(([,a],[,b])=>b-a).slice(0,2).map(([a])=>a)

  // Per-zone counts for sensory
  const byZone: Record<string, number> = {}
  for (const s of params.sensory) {
    byZone[s.regulation_level] = (byZone[s.regulation_level] ?? 0) + 1
  }

  const completeSleep = params.sleep.filter(s => s.total_sleep_minutes != null)
  const sleepMins     = completeSleep.map(s => s.total_sleep_minutes!)
  const avgSleepMins  = sleepMins.length ? sleepMins.reduce((a, b) => a + b, 0) / sleepMins.length : null
  const minSleepMins  = sleepMins.length ? Math.min(...sleepMins) : null
  const maxSleepMins  = sleepMins.length ? Math.max(...sleepMins) : null
  const avgQuality    = completeSleep.length
    ? completeSleep.reduce((s,l)=>s+(l.sleep_quality??0),0)/completeSleep.length
    : null

  const meals        = params.diet.filter(d=>d.log_type==='meal').length
  const smoothies    = params.diet.filter(d=>d.log_type==='smoothie').length
  const supplements  = params.diet.filter(d=>d.log_type==='supplements').length
  const medications  = params.diet.filter(d=>d.log_type==='medications').length
  const activeGoals  = params.goals.filter(g=>g.status==='active').length

  return {
    behaviorCount, avgSeverity, bySeverity, topAnt,
    byZone,
    avgSleepMins, minSleepMins, maxSleepMins, avgQuality,
    sleepNights: completeSleep.length,
    meals, smoothies, supplements, medications, activeGoals,
  }
}

// ─── Enhanced summary panel ───────────────────────────────────────────────────

/** Draw a mini horizontal proportion bar */
function miniBar(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  filled: number, total: number,
  color: [number,number,number],
) {
  // Background track
  doc.setFillColor(230, 228, 224)
  doc.rect(x, y, w, h, 'F')
  // Filled portion
  if (total > 0) {
    const fw = (filled / total) * w
    doc.setFillColor(color[0], color[1], color[2])
    doc.rect(x, y, fw, h, 'F')
  }
}

function renderEnhancedSummary(w: PDFWriter, params: PDFExportParams, s: ReturnType<typeof buildSummary>) {
  const inc = (m: string) => params.modules.includes(m)

  // ── Section title ─────────────────────────────────────────────────────────
  w.doc.setFont('helvetica', 'bold')
  w.doc.setFontSize(8)
  w.setColor(C.mid)
  w.doc.text('PERIOD AT A GLANCE', MX + 6, w.y)
  w.y += 6

  // ── Module count tiles (2-column grid) ────────────────────────────────────
  const tileW  = (CW - 6) / 2 - 2
  const tileH  = 16
  const tileGap = 2

  type StatTile = { label: string; value: string; sub?: string; color: [number,number,number] }
  const tiles: StatTile[] = []

  if (inc('behavior'))
    tiles.push({ label: 'Behavior', value: String(s.behaviorCount), sub: s.behaviorCount === 1 ? 'incident' : 'incidents', color: C.amber })
  if (inc('sensory'))
    tiles.push({ label: 'Sensory / Regulation', value: String(params.sensory.length), sub: params.sensory.length === 1 ? 'entry' : 'entries', color: C.violet })
  if (inc('sleep'))
    tiles.push({ label: 'Sleep', value: String(s.sleepNights), sub: s.avgSleepMins ? `avg ${fmtMins(s.avgSleepMins)}` : `night${s.sleepNights !== 1 ? 's' : ''}`, color: C.indigo })
  if (inc('diet'))
    tiles.push({ label: 'Diet', value: String(s.meals + s.smoothies), sub: `${s.meals} meal${s.meals!==1?'s':''}, ${s.smoothies} smoothie${s.smoothies!==1?'s':''}`, color: C.emerald })
  if (inc('goals'))
    tiles.push({ label: 'Goals', value: String(s.activeGoals), sub: `active · ${params.progressNotes.length} note${params.progressNotes.length!==1?'s':''}`, color: C.teal })
  if (inc('diary'))
    tiles.push({ label: 'Diary', value: String(params.diary.length), sub: params.diary.length === 1 ? 'entry' : 'entries', color: C.brand })
  if (inc('appointments'))
    tiles.push({ label: 'Appointments', value: String(params.appointments.length), sub: params.appointments.length === 1 ? 'visit' : 'visits', color: C.rose })

  let col = 0
  const tileBaseX = MX + 6
  for (const tile of tiles) {
    const tx = col === 0 ? tileBaseX : tileBaseX + tileW + tileGap
    // Tile background
    const tileColor = tile.color
    const bg: [number,number,number] = [
      tileColor[0] + Math.round((255 - tileColor[0]) * 0.91),
      tileColor[1] + Math.round((255 - tileColor[1]) * 0.91),
      tileColor[2] + Math.round((255 - tileColor[2]) * 0.91),
    ]
    w.doc.setFillColor(bg[0], bg[1], bg[2])
    w.doc.rect(tx, w.y, tileW, tileH, 'F')

    // Accent left edge
    w.doc.setFillColor(tile.color[0], tile.color[1], tile.color[2])
    w.doc.rect(tx, w.y, 2.5, tileH, 'F')

    // Label
    w.doc.setFont('helvetica', 'normal')
    w.doc.setFontSize(7)
    w.setColor(C.mid)
    w.doc.text(tile.label, tx + 5, w.y + 4.5)

    // Value (large)
    w.doc.setFont('helvetica', 'bold')
    w.doc.setFontSize(14)
    w.setColor(tile.color)
    w.doc.text(tile.value, tx + 5, w.y + 11.5)

    // Sub label
    if (tile.sub) {
      w.doc.setFont('helvetica', 'normal')
      w.doc.setFontSize(6.5)
      w.setColor(C.mid)
      w.doc.text(tile.sub, tx + 5 + w.doc.getTextWidth(tile.value) + 1.5, w.y + 11.5)
    }

    col++
    if (col === 2) {
      col = 0
      w.y += tileH + tileGap
    }
  }
  if (col !== 0) w.y += tileH + tileGap
  w.y += 3

  // ── Behavior severity breakdown ───────────────────────────────────────────
  if (inc('behavior') && s.behaviorCount > 0) {
    w.doc.setFont('helvetica', 'bold')
    w.doc.setFontSize(7.5)
    w.setColor(C.mid)
    w.doc.text('Behavior Severity Breakdown', MX + 6, w.y)
    w.y += 5

    const barTotalW = CW - 30
    const barH      = 3.5
    const rowGap    = 5.5
    const labels: [number, string][] = [[1,'Mild'],[2,'Low'],[3,'Moderate'],[4,'High'],[5,'Severe']]

    for (const [sev, label] of labels) {
      const count = s.bySeverity[sev] ?? 0
      if (count === 0) continue
      w.doc.setFont('helvetica', 'normal')
      w.doc.setFontSize(7)
      w.setColor(C.dark)
      w.doc.text(label, MX + 6, w.y + barH)
      miniBar(w.doc, MX + 24, w.y, barTotalW, barH, count, s.behaviorCount, SEV_COLORS[sev])
      w.doc.setFont('helvetica', 'bold')
      w.doc.setFontSize(7)
      w.setColor(C.dark)
      w.doc.text(String(count), MX + 24 + barTotalW + 2, w.y + barH)
      w.y += rowGap
    }
    w.y += 2
  }

  // ── Sensory zone breakdown ────────────────────────────────────────────────
  if (inc('sensory') && params.sensory.length > 0) {
    w.doc.setFont('helvetica', 'bold')
    w.doc.setFontSize(7.5)
    w.setColor(C.mid)
    w.doc.text('Regulation Zone Breakdown', MX + 6, w.y)
    w.y += 5

    const barTotalW = CW - 30
    const barH      = 3.5
    const rowGap    = 5.5
    const zoneOrder: [string, string][] = [
      ['calm','Calm'], ['alert','Alert'], ['anxious','Anxious'],
      ['dysregulated','Dysreg.'], ['shutdown','Shutdown'],
    ]

    for (const [zone, label] of zoneOrder) {
      const count = s.byZone[zone] ?? 0
      if (count === 0) continue
      w.doc.setFont('helvetica', 'normal')
      w.doc.setFontSize(7)
      w.setColor(C.dark)
      w.doc.text(label, MX + 6, w.y + barH)
      const zc = ZONE_COLORS[zone] ?? C.mid
      miniBar(w.doc, MX + 24, w.y, barTotalW, barH, count, params.sensory.length, zc)
      w.doc.setFont('helvetica', 'bold')
      w.doc.setFontSize(7)
      w.setColor(C.dark)
      w.doc.text(String(count), MX + 24 + barTotalW + 2, w.y + barH)
      w.y += rowGap
    }
    w.y += 2
  }

  // ── Sleep range summary ───────────────────────────────────────────────────
  if (inc('sleep') && s.sleepNights > 0 && s.avgSleepMins) {
    w.doc.setFont('helvetica', 'bold')
    w.doc.setFontSize(7.5)
    w.setColor(C.mid)
    w.doc.text('Sleep Summary', MX + 6, w.y)
    w.y += 5

    const parts: string[] = [
      `Avg: ${fmtMins(s.avgSleepMins)}`,
    ]
    if (s.minSleepMins && s.maxSleepMins)
      parts.push(`Range: ${fmtMins(s.minSleepMins)} – ${fmtMins(s.maxSleepMins)}`)
    if (s.avgQuality)
      parts.push(`Avg quality: ${qualityLabel(Math.round(s.avgQuality))}`)

    w.doc.setFont('helvetica', 'normal')
    w.doc.setFontSize(8)
    w.setColor(C.dark)
    w.doc.text(parts.join('   |   '), MX + 6, w.y)
    w.y += 7
  }
}

// ─── Behavior frequency chart ─────────────────────────────────────────────────

function renderBehaviorChart(w: PDFWriter, logs: BehaviorLog[], startDate: string, endDate: string) {
  if (logs.length === 0) return

  // Build per-date counts using the full date range (0 = no incident)
  let allDates: string[]
  try {
    allDates = eachDayOfInterval({
      start: parseISO(startDate + 'T12:00:00'),
      end:   parseISO(endDate   + 'T12:00:00'),
    }).map(d => format(d, 'yyyy-MM-dd'))
  } catch {
    allDates = [...new Set(logs.map(l => l.entry_date))].sort()
  }

  // Group by date — only dates that have incidents
  const byDate: Record<string,{ count: number; maxSev: number }> = {}
  for (const l of logs) {
    if (!byDate[l.entry_date]) byDate[l.entry_date] = { count: 0, maxSev: 0 }
    byDate[l.entry_date].count++
    byDate[l.entry_date].maxSev = Math.max(byDate[l.entry_date].maxSev, l.severity)
  }

  // For long ranges, group by week
  const shouldGroup = allDates.length > 31

  type BarData = { label: string; count: number; maxSev: number }
  let bars: BarData[]

  if (shouldGroup) {
    // Group into ISO-week buckets
    const weeks: Record<string, { count: number; maxSev: number; label: string }> = {}
    for (const date of allDates) {
      const d    = parseISO(date + 'T12:00:00')
      const wkey = format(d, 'yyyy-ww')
      const wlbl = `Wk ${format(d, 'M/d')}`
      if (!weeks[wkey]) weeks[wkey] = { count: 0, maxSev: 0, label: wlbl }
      const dayData = byDate[date]
      if (dayData) {
        weeks[wkey].count  += dayData.count
        weeks[wkey].maxSev  = Math.max(weeks[wkey].maxSev, dayData.maxSev)
      }
    }
    bars = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  } else {
    // Per-day bars (only include days with incidents to keep chart tight)
    const incidentDates = allDates.filter(d => byDate[d])
    bars = incidentDates.map(d => ({
      label:  fmtDateShort(d),
      count:  byDate[d].count,
      maxSev: byDate[d].maxSev,
    }))
  }

  if (bars.length === 0) return

  const maxCount = Math.max(...bars.map(b => b.count))
  if (maxCount === 0) return

  const CHART_H    = 38       // mm — height of bar area
  const LABEL_H    = 7        // mm — space for x-axis labels
  const TOTAL_H    = CHART_H + LABEL_H + 14  // header + chart + labels

  w.check(TOTAL_H)

  // Sub-title
  w.doc.setFont('helvetica', 'bold')
  w.doc.setFontSize(8)
  w.setColor(C.mid)
  const chartTitle = shouldGroup ? 'INCIDENTS BY WEEK' : 'INCIDENTS BY DAY'
  w.doc.text(chartTitle, MX, w.y)
  w.y += 5

  const chartX      = MX + 8     // leave 8mm for y-axis labels
  const chartW      = CW - 10
  const chartTop    = w.y
  const chartBottom = chartTop + CHART_H

  // Y-axis gridlines + labels
  const maxTick = Math.ceil(maxCount)
  const tickStep = maxTick <= 5 ? 1 : maxTick <= 10 ? 2 : 5
  w.doc.setFont('helvetica', 'normal')
  w.doc.setFontSize(6)
  w.setColor(C.light)
  w.setDraw(C.border)
  w.doc.setLineWidth(0.15)

  for (let tick = 0; tick <= maxTick; tick += tickStep) {
    const gy = chartBottom - (tick / maxTick) * CHART_H
    w.doc.line(chartX, gy, chartX + chartW, gy)
    w.doc.text(String(tick), chartX - 2, gy + 1, { align: 'right' })
  }

  // Bars
  const barSpacing = 1
  const barW = Math.max(2, (chartW - barSpacing * (bars.length + 1)) / bars.length)
  const totalBarW = barW * bars.length + barSpacing * (bars.length + 1)
  const startX = chartX + (chartW - totalBarW) / 2

  for (let i = 0; i < bars.length; i++) {
    const bar  = bars[i]
    const barH = (bar.count / maxCount) * CHART_H
    const bx   = startX + barSpacing + i * (barW + barSpacing)
    const by   = chartBottom - barH

    // Bar fill — color by max severity
    const bc = SEV_COLORS[bar.maxSev] ?? C.brand
    w.doc.setFillColor(bc[0], bc[1], bc[2])
    w.doc.rect(bx, by, barW, barH, 'F')

    // Count label on top of bar
    if (bar.count > 0) {
      w.doc.setFont('helvetica', 'bold')
      w.doc.setFontSize(6)
      w.setColor(C.dark)
      w.doc.text(String(bar.count), bx + barW / 2, by - 1, { align: 'center' })
    }

    // Date label below chart
    w.doc.setFont('helvetica', 'normal')
    w.doc.setFontSize(bars.length > 20 ? 5 : 6)
    w.setColor(C.mid)
    if (bars.length <= 20 || i % 2 === 0) {
      w.doc.text(bar.label, bx + barW / 2, chartBottom + 5, { align: 'center', angle: bars.length > 14 ? 35 : 0 })
    }
  }

  // Chart border
  w.setDraw(C.border)
  w.doc.setLineWidth(0.25)
  w.doc.line(chartX, chartTop,    chartX,         chartBottom)  // left axis
  w.doc.line(chartX, chartBottom, chartX + chartW, chartBottom) // bottom axis

  // Severity legend (only include levels that appear)
  const usedSevs = [...new Set(bars.map(b => b.maxSev))].sort()
  const legendLabels: Record<number, string> = {1:'Mild',2:'Low',3:'Moderate',4:'High',5:'Severe'}
  let lx = chartX
  const ly = chartBottom + LABEL_H + 1
  w.doc.setFontSize(6.5)
  for (const sev of usedSevs) {
    const sc = SEV_COLORS[sev]
    if (!sc) continue
    w.doc.setFillColor(sc[0], sc[1], sc[2])
    w.doc.rect(lx, ly - 2.5, 3, 3, 'F')
    w.doc.setFont('helvetica', 'normal')
    w.setColor(C.mid)
    w.doc.text(legendLabels[sev] ?? String(sev), lx + 4, ly)
    lx += w.doc.getTextWidth(legendLabels[sev] ?? '') + 8
  }

  w.y = ly + 6
  w.gap(2)
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

function renderBehavior(w: PDFWriter, logs: BehaviorLog[], startDate: string, endDate: string) {
  if (!logs.length) return
  w.sectionHeader('BEHAVIOR LOGS', C.amber)

  // Frequency chart before detail entries
  renderBehaviorChart(w, logs, startDate, endDate)

  w.rule()
  w.gap(2)

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

  // Enhanced summary panel
  w.y += 8
  const s = buildSummary(params)
  renderEnhancedSummary(w, params, s)
}

// ─── Custom tracker renderer ──────────────────────────────────────────────────

function renderCustomTracker(w: PDFWriter, tracker: CustomTracker, logs: CustomTrackerLog[]) {
  w.sectionHeader(tracker.name.toUpperCase(), C.teal)
  w.gap(4)

  if (logs.length === 0) {
    w.line('No entries in this date range.', { size: 10, color: C.light })
    w.gap(4)
    return
  }

  const typeLabel = tracker.tracker_type.replace('_', ' ')
  w.line(`Type: ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}  |  ${logs.length} entries`, { size: 9, color: C.mid })
  w.gap(3)

  for (const log of logs) {
    w.check(12)
    const value   = formatTrackerValue(tracker.tracker_type, log)
    const dateStr = fmtDate(log.entry_date)
    w.line(`${dateStr}: ${value}`, { size: 10, color: C.dark })
    if (log.notes) {
      w.wrapped(log.notes, { size: 9, color: C.mid, indent: 4 })
    }
    w.gap(2)
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
  customTrackers?: CustomTracker[]
  customTrackerLogs?: CustomTrackerLog[]
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
    if (mod === 'behavior')     renderBehavior(w, params.behavior, params.startDate, params.endDate)
    if (mod === 'sensory')      renderSensory(w, params.sensory)
    if (mod === 'diet')         renderDiet(w, params.diet)
    if (mod === 'sleep')        renderSleep(w, params.sleep)
    if (mod === 'goals')        renderGoals(w, params.goals, params.progressNotes)
    if (mod === 'appointments') renderAppointments(w, params.appointments, params.providers)
  }

  // ── Custom tracker pages ─────────────────────────────────────────────────────
  for (const tracker of (params.customTrackers ?? [])) {
    if (!params.modules.includes(`tracker:${tracker.id}`)) continue
    const logs = (params.customTrackerLogs ?? []).filter(l => l.tracker_id === tracker.id)
    w.newPage()
    renderCustomTracker(w, tracker, logs)
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
