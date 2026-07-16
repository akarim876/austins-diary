/**
 * PDF export — complete design-system overhaul.
 *
 * Fonts (jsPDF built-in families, best available without bundling TTFs):
 *   times      → display / headings  (approximates Fraunces serif)
 *   helvetica  → body copy           (approximates Inter sans-serif)
 *   courier    → numeric stat values (approximates JetBrains Mono)
 *
 * Colors: exact app design-token palette.
 * Layout: cover (p.1) → Period at a Glance (p.2) → module sections.
 */
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

// ─── Types ────────────────────────────────────────────────────────────────────

type RGB = [number, number, number]

// ─── Layout ───────────────────────────────────────────────────────────────────

const PAGE_W      = 210
const PAGE_H      = 297
const MX          = 18          // horizontal margin
const HEADER_H    = 13
const CONTENT_TOP = HEADER_H + 6
const CONTENT_BOT = PAGE_H - 18
const CW          = PAGE_W - MX * 2   // 174 mm

// ─── App design tokens ────────────────────────────────────────────────────────

const T = {
  // Core palette (sage default — matches what's in CSS)
  background:  [247, 245, 241] as RGB,   // #F7F5F1
  surface:     [255, 255, 255] as RGB,   // #FFFFFF
  text:        [51,  50,  46 ] as RGB,   // #33322E
  muted:       [122, 121, 114] as RGB,   // #7A7972
  accent:      [91,  123, 122] as RGB,   // #5B7B7A
  border:      [220, 215, 208] as RGB,   // warm-200 approx
  white:       [255, 255, 255] as RGB,

  // Module accent colors (darkened for print contrast)
  amber:       [146, 64,  14 ] as RGB,   // amber-800  – Behavior
  violet:      [91,  33,  182] as RGB,   // violet-800 – Sensory
  emerald:     [6,   95,  70 ] as RGB,   // emerald-800 – Diet
  indigo:      [55,  48,  163] as RGB,   // indigo-800  – Sleep
  teal:        [19,  78,  74 ] as RGB,   // teal-900    – Goals
  rose:        [159, 18,  57 ] as RGB,   // rose-800    – Appointments
  brand:       [30,  64,  175] as RGB,   // blue-800    – Diary

  // Regulation gradient — fixed, never changes with theme
  reg: {
    calm:         [143, 184, 156] as RGB,
    alert:        [169, 192, 138] as RGB,
    anxious:      [232, 199, 126] as RGB,
    dysregulated: [217, 154, 108] as RGB,
    shutdown:     [199, 123, 106] as RGB,
  },

  // Severity colors (1 Mild → 5 Severe)
  sev: [
    [0,   0,   0  ] as RGB,   // 0 – unused placeholder
    [5,   150, 105] as RGB,   // 1 Mild
    [101, 163, 13 ] as RGB,   // 2 Low
    [217, 119, 6  ] as RGB,   // 3 Moderate
    [234, 88,  12 ] as RGB,   // 4 High
    [220, 38,  38 ] as RGB,   // 5 Severe
  ] as RGB[],
}

// Per-module metadata
const MODULE_META: Record<string, { color: RGB; label: string }> = {
  diary:        { color: T.brand,   label: 'DIARY ENTRIES'       },
  behavior:     { color: T.amber,   label: 'BEHAVIOR LOGS'       },
  sensory:      { color: T.violet,  label: 'SENSORY & REGULATION'},
  diet:         { color: T.emerald, label: 'DIET & NUTRITION'    },
  sleep:        { color: T.indigo,  label: 'SLEEP'               },
  goals:        { color: T.teal,    label: 'GOALS & PROGRESS'    },
  appointments: { color: T.rose,    label: 'APPOINTMENTS'        },
}

// ─── Font aliases ─────────────────────────────────────────────────────────────

// Using jsPDF's 3 built-in standard families:
//   "times"     → closest to Fraunces (serif, display)
//   "helvetica" → closest to Inter    (sans, body)
//   "courier"   → closest to JetBrains Mono (monospace, numeric)
const F = {
  display: 'times'     as const,
  body:    'helvetica' as const,
  mono:    'courier'   as const,
}

// ─── Color helpers ────────────────────────────────────────────────────────────

/** Mix a color with white at the given ratio (0=color, 1=white). */
function lighten(c: RGB, ratio: number): RGB {
  return c.map(v => Math.round(v + (255 - v) * ratio)) as RGB
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtDate(d: string) {
  try { return format(parseISO(d + 'T12:00:00'), 'MMM d, yyyy') } catch { return d }
}

function fmtDateShort(d: string) {
  try { return format(parseISO(d + 'T12:00:00'), 'M/d') } catch { return d }
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  const h    = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${ampm}`
}

/** Format minutes → "Xh Ym". Rounds to the nearest whole minute first. */
function fmtMins(mins: number | null | undefined): string {
  if (mins == null || mins <= 0) return ''
  const rounded = Math.round(mins)          // ← prevents "46.875m" display
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

function capitalize(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

// ─── Module icon drawing ──────────────────────────────────────────────────────

/**
 * Draw a 5×5 mm icon for a given module using jsPDF drawing primitives.
 * (x, y) is the top-left corner of the icon bounding box.
 */
function drawModuleIcon(doc: jsPDF, module: string, x: number, y: number, sz: number, color: RGB) {
  const [r, g, b] = color
  doc.setDrawColor(r, g, b)
  doc.setFillColor(r, g, b)
  doc.setLineWidth(0.55)

  const cx = x + sz / 2
  const cy = y + sz / 2
  const hs = sz / 2   // half-size

  switch (module) {
    case 'diary': {
      // Notebook: rounded rect + ruled lines
      doc.rect(x + 0.3, y + 0.3, sz - 0.6, sz - 0.6, 'S')
      doc.line(x + 1,       y + sz * 0.38, x + sz - 1,       y + sz * 0.38)
      doc.line(x + 1,       y + sz * 0.56, x + sz - 1,       y + sz * 0.56)
      doc.line(x + 1,       y + sz * 0.74, x + sz - 1.5,     y + sz * 0.74)
      break
    }
    case 'behavior': {
      // Starburst: center dot + 8 radiating lines
      doc.ellipse(cx, cy, 0.65, 0.65, 'F')
      const inner = 1.0, outer = hs - 0.3
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4
        doc.line(
          cx + inner * Math.cos(a), cy + inner * Math.sin(a),
          cx + outer * Math.cos(a), cy + outer * Math.sin(a),
        )
      }
      break
    }
    case 'sensory': {
      // Sine-wave approximation
      const steps = 16
      const amp   = hs * 0.55
      for (let i = 0; i < steps; i++) {
        const t1 = i / steps, t2 = (i + 1) / steps
        doc.line(
          x + t1 * sz, cy + amp * Math.sin(t1 * 2 * Math.PI),
          x + t2 * sz, cy + amp * Math.sin(t2 * 2 * Math.PI),
        )
      }
      break
    }
    case 'diet':
    case 'meal': {
      // Fork + knife silhouette
      doc.line(x + 1.2, y + 0.5, x + 1.2, y + sz - 0.5)   // fork handle
      doc.line(x + 0.6, y + 0.5, x + 0.6, y + sz * 0.42)   // left tine
      doc.line(x + 1.8, y + 0.5, x + 1.8, y + sz * 0.42)   // right tine
      doc.line(x + 0.6, y + sz * 0.42, x + 1.8, y + sz * 0.42)  // arch
      doc.line(x + 3.3, y + 0.5, x + 3.3, y + sz - 0.5)    // knife blade
      doc.line(x + 3.3, y + 0.5, x + sz - 0.5, y + 1.8)    // knife edge
      break
    }
    case 'sleep': {
      // Crescent: filled outer circle, white-filled inner offset circle
      doc.ellipse(cx - hs * 0.1, cy, hs - 0.25, hs - 0.25, 'F')
      const [wr, wg, wb] = T.white
      doc.setFillColor(wr, wg, wb)
      doc.setDrawColor(wr, wg, wb)
      doc.ellipse(cx + hs * 0.38, cy - hs * 0.22, hs - 0.45, hs - 0.45, 'F')
      doc.setFillColor(r, g, b)
      doc.setDrawColor(r, g, b)
      break
    }
    case 'goals': {
      // Bullseye: 3 concentric circles
      doc.ellipse(cx, cy, hs - 0.15, hs - 0.15, 'S')
      doc.ellipse(cx, cy, hs * 0.56, hs * 0.56, 'S')
      doc.ellipse(cx, cy, 0.55, 0.55, 'F')
      break
    }
    case 'appointments': {
      // Calendar: rounded rect + header line + ring tabs + day dots
      doc.rect(x + 0.3, y + 0.9, sz - 0.6, sz - 1.2, 'S')
      doc.line(x + 0.3, y + 2.4, x + sz - 0.3, y + 2.4)   // header separator
      doc.line(x + 1.4, y + 0.9, x + 1.4, y + 0.2)         // left ring
      doc.line(x + sz - 1.4, y + 0.9, x + sz - 1.4, y + 0.2)  // right ring
      for (const [dx, dy] of [[1.2,3.5],[2.5,3.5],[3.8,3.5],[1.2,4.5],[2.5,4.5]]) {
        doc.ellipse(x + dx, y + dy, 0.28, 0.28, 'F')
      }
      break
    }
    default: {
      // Generic: solid circle
      doc.ellipse(cx, cy, hs - 0.3, hs - 0.3, 'F')
    }
  }
}

// ─── PDF writer ───────────────────────────────────────────────────────────────

class PDFWriter {
  doc: jsPDF
  y          = CONTENT_TOP
  pageNum    = 1
  childName: string
  generatedDate: string

  constructor(childName: string, generatedDate: string) {
    this.doc          = new jsPDF({ unit: 'mm', format: 'a4' })
    this.childName    = childName
    this.generatedDate = generatedDate
  }

  // Setters
  setColor(c: RGB) { this.doc.setTextColor(c[0], c[1], c[2]) }
  setFill(c: RGB)  { this.doc.setFillColor(c[0], c[1], c[2]) }
  setDraw(c: RGB)  { this.doc.setDrawColor(c[0], c[1], c[2]) }

  // ── Page chrome ─────────────────────────────────────────────────────────────

  drawPageHeader() {
    this.setFill(T.accent)
    this.doc.rect(0, 0, PAGE_W, HEADER_H, 'F')
    this.setColor(T.white)
    this.doc.setFont(F.body, 'bold')
    this.doc.setFontSize(8)
    this.doc.text(this.childName, MX, 8.5)
    this.doc.text(`Page ${this.pageNum}`, PAGE_W - MX, 8.5, { align: 'right' })
    this.setColor(T.text)
  }

  drawPageFooter() {
    this.setDraw(T.border)
    this.doc.setLineWidth(0.25)
    this.doc.line(MX, PAGE_H - 10, PAGE_W - MX, PAGE_H - 10)
    this.setColor(T.muted)
    this.doc.setFont(F.body, 'normal')
    this.doc.setFontSize(7)
    this.doc.text(
      `Generated ${this.generatedDate}  ·  Confidential — Care & Progress Report`,
      MX, PAGE_H - 6,
    )
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

  // ── Typography ──────────────────────────────────────────────────────────────

  /** Large serif display heading */
  displayH(text: string, size = 20, color = T.text) {
    this.doc.setFont(F.display, 'bold')
    this.doc.setFontSize(size)
    this.setColor(color)
    this.doc.text(text, MX, this.y)
    this.y += size * 0.38 + 2
  }

  /** Wrapped body text. Returns height used. */
  body(text: string, opts?: { size?: number; color?: RGB; indent?: number; bold?: boolean }) {
    const { size = 9, color = T.muted, indent = 0, bold = false } = opts ?? {}
    this.doc.setFont(F.body, bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    this.setColor(color)
    const lines  = this.doc.splitTextToSize(text, CW - indent) as string[]
    const lineH  = size * 0.35 + 1.3
    const totalH = lines.length * lineH
    this.check(totalH)
    this.doc.text(lines, MX + indent, this.y)
    this.y += totalH
    return totalH
  }

  gap(mm = 3) { this.y += mm }

  rule() {
    this.setDraw(T.border)
    this.doc.setLineWidth(0.25)
    this.doc.line(MX, this.y, PAGE_W - MX, this.y)
    this.y += 3
  }

  // ── Section header (module-specific) ────────────────────────────────────────

  sectionHeader(module: string, overrideLabel?: string) {
    const meta  = MODULE_META[module] ?? { color: T.accent, label: module.toUpperCase() }
    const color = meta.color
    const label = overrideLabel ?? meta.label
    this.check(14)

    // Tinted background bar
    this.setFill(lighten(color, 0.88))
    this.doc.rect(MX, this.y - 1.5, CW, 10, 'F')

    // Left colored accent stripe
    this.setFill(color)
    this.doc.rect(MX, this.y - 1.5, 3.5, 10, 'F')

    // Module icon
    drawModuleIcon(this.doc, module, MX + 5, this.y + 0.3, 5.5, color)

    // Section title
    this.doc.setFont(F.body, 'bold')
    this.doc.setFontSize(9.5)
    this.setColor(color)
    this.doc.text(label, MX + 13, this.y + 5.8)
    this.y += 12
  }

  // ── Entry primitives ────────────────────────────────────────────────────────

  entryHeader(dateStr: string, sub?: string) {
    this.check(12)
    this.doc.setFont(F.display, 'bold')
    this.doc.setFontSize(9.5)
    this.setColor(T.text)
    const label = sub ? `${dateStr}  ·  ${sub}` : dateStr
    this.doc.text(label, MX, this.y)
    this.y += 5.5
  }

  detail(text: string, indent = 3) {
    if (!text) return
    this.check(6)
    this.body(text, { size: 8.5, indent })
    this.gap(0.5)
  }

  get blob(): Blob {
    return this.doc.output('blob')
  }
}

// ─── Summary computation ──────────────────────────────────────────────────────

function buildSummary(params: PDFExportParams) {
  // ── Behavior ──────────────────────────────────────────────────────────────
  const behaviorCount = params.behavior.length
  const avgSeverity   = behaviorCount > 0
    ? params.behavior.reduce((s, b) => s + b.severity, 0) / behaviorCount
    : null

  // Per-severity counts — all 5 levels initialised to prevent missing entries
  const bySeverity: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const b of params.behavior) {
    const sev = b.severity
    if (sev >= 1 && sev <= 5) bySeverity[sev]++
  }

  const antFreq: Record<string, number> = {}
  for (const b of params.behavior) {
    if (b.antecedent && b.antecedent !== 'other')
      antFreq[b.antecedent] = (antFreq[b.antecedent] ?? 0) + 1
  }
  const topAnt = Object.entries(antFreq).sort(([,a],[,b])=>b-a).slice(0,2).map(([a])=>a)

  // ── Sensory / Regulation ──────────────────────────────────────────────────
  // Pre-initialise ALL zones so every zone with ≥ 1 entry is guaranteed visible
  const byZone: Record<string, number> = {
    calm: 0, alert: 0, anxious: 0, dysregulated: 0, shutdown: 0,
  }
  for (const s of params.sensory) {
    const z = s.regulation_level
    if (z in byZone) byZone[z]++
    // Defensive: handle any unexpected zone value
    else byZone[z] = (byZone[z] ?? 0) + 1
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const completeSleep = params.sleep.filter(s => s.total_sleep_minutes != null)
  const sleepMins     = completeSleep.map(s => s.total_sleep_minutes!)
  // Round the average immediately — prevents "7h 46.875m" display
  const avgSleepMins  = sleepMins.length
    ? Math.round(sleepMins.reduce((a, b) => a + b, 0) / sleepMins.length)
    : null
  const minSleepMins  = sleepMins.length ? Math.min(...sleepMins) : null
  const maxSleepMins  = sleepMins.length ? Math.max(...sleepMins) : null
  const avgQuality    = completeSleep.length
    ? completeSleep.reduce((s, l) => s + (l.sleep_quality ?? 0), 0) / completeSleep.length
    : null

  // ── Diet — each log_type counted independently ────────────────────────────
  // This exposes any overcounting so families can cross-check the numbers
  const meals       = params.diet.filter(d => d.log_type === 'meal').length
  const smoothies   = params.diet.filter(d => d.log_type === 'smoothie').length
  const supplements = params.diet.filter(d => d.log_type === 'supplements').length
  const medications = params.diet.filter(d => d.log_type === 'medications').length

  // ── Goals ────────────────────────────────────────────────────────────────
  const activeGoals = params.goals.filter(g => g.status === 'active').length

  return {
    behaviorCount, avgSeverity, bySeverity, topAnt,
    byZone,
    avgSleepMins, minSleepMins, maxSleepMins, avgQuality,
    sleepNights: completeSleep.length,
    meals, smoothies, supplements, medications,
    activeGoals,
  }
}

// ─── Cover page (page 1) ─────────────────────────────────────────────────────

function renderCover(w: PDFWriter, params: PDFExportParams) {
  // Left accent bar
  w.setFill(T.accent)
  w.doc.rect(0, 0, 6, PAGE_H, 'F')

  // Warm off-white background for the whole cover
  w.setFill(T.background)
  w.doc.rect(6, 0, PAGE_W - 6, PAGE_H, 'F')

  // ── Title block ──────────────────────────────────────────────────────────
  w.y = 50
  w.doc.setFont(F.body, 'bold')
  w.doc.setFontSize(10)
  w.setColor(T.muted)
  w.doc.text('CARE & PROGRESS REPORT', MX + 6, w.y)
  w.y += 9

  w.doc.setFont(F.display, 'bold')
  w.doc.setFontSize(30)
  w.setColor(T.text)
  w.doc.text(params.childName, MX + 6, w.y)
  w.y += 14

  w.doc.setFont(F.body, 'normal')
  w.doc.setFontSize(11)
  w.setColor(T.muted)
  w.doc.text(
    `${fmtDate(params.startDate)}  –  ${fmtDate(params.endDate)}`,
    MX + 6, w.y,
  )
  w.y += 7

  w.doc.setFontSize(8)
  w.setColor(T.muted)
  w.doc.text(`Generated on ${params.generatedDate}`, MX + 6, w.y)
  w.y += 14

  // Divider
  w.setFill(T.accent)
  w.doc.rect(MX + 6, w.y, CW - 6, 0.5, 'F')
  w.y += 10

  // ── Sections included ────────────────────────────────────────────────────
  w.doc.setFont(F.body, 'bold')
  w.doc.setFontSize(8)
  w.setColor(T.muted)
  w.doc.text('SECTIONS INCLUDED', MX + 6, w.y)
  w.y += 7

  const standardLabels: Record<string, string> = {
    diary: 'Diary Entries', behavior: 'Behavior Logs',
    sensory: 'Sensory & Regulation', diet: 'Diet & Nutrition',
    sleep: 'Sleep', goals: 'Goals & Progress', appointments: 'Appointments',
  }

  for (const m of params.modules) {
    const meta  = MODULE_META[m]
    const label = standardLabels[m] ?? m
    const color = meta?.color ?? T.accent

    // Colored dot
    w.setFill(color)
    w.doc.ellipse(MX + 9, w.y - 1.5, 1.5, 1.5, 'F')

    w.doc.setFont(F.body, 'normal')
    w.doc.setFontSize(10)
    w.setColor(T.text)
    w.doc.text(label, MX + 13, w.y)
    w.y += 7
  }

  // Footnote
  w.y = PAGE_H - 25
  w.setFill(T.border)
  w.doc.rect(MX + 6, w.y, CW - 6, 0.3, 'F')
  w.y += 6
  w.doc.setFont(F.body, 'normal')
  w.doc.setFontSize(8)
  w.setColor(T.muted)
  w.doc.text('See page 2 for summary statistics.', MX + 6, w.y)
}

// ─── Period at a Glance (page 2) ─────────────────────────────────────────────

function renderSummaryPage(w: PDFWriter, params: PDFExportParams, s: ReturnType<typeof buildSummary>) {
  const inc = (m: string) => params.modules.includes(m)

  // ── Page heading ─────────────────────────────────────────────────────────
  w.displayH('Period at a Glance', 20, T.text)
  w.doc.setFont(F.body, 'normal')
  w.doc.setFontSize(8.5)
  w.setColor(T.muted)
  w.doc.text(
    `${fmtDate(params.startDate)} — ${fmtDate(params.endDate)}`,
    MX, w.y,
  )
  w.y += 8
  w.rule()

  // ── Metric cards (2-column grid) ─────────────────────────────────────────
  type Card = { label: string; value: string; sub?: string; color: RGB }
  const cards: Card[] = []

  if (inc('behavior'))
    cards.push({
      label: 'Behavior Incidents',
      value: String(s.behaviorCount),
      sub:   s.avgSeverity ? `avg severity ${s.avgSeverity.toFixed(1)} / 5` : undefined,
      color: T.amber,
    })

  if (inc('sensory'))
    cards.push({
      label: 'Sensory Entries',
      value: String(params.sensory.length),
      sub:   params.sensory.length > 0
        ? `${Object.values(s.byZone).filter(v => v > 0).length} regulation zone(s)`
        : undefined,
      color: T.violet,
    })

  if (inc('sleep'))
    cards.push({
      label: 'Sleep Nights Logged',
      value: String(s.sleepNights),
      sub:   s.avgSleepMins ? `avg ${fmtMins(s.avgSleepMins)} / night` : undefined,
      color: T.indigo,
    })

  if (inc('diet')) {
    const dietParts: string[] = []
    if (s.meals)       dietParts.push(`${s.meals} meal${s.meals !== 1 ? 's' : ''}`)
    if (s.smoothies)   dietParts.push(`${s.smoothies} smoothie${s.smoothies !== 1 ? 's' : ''}`)
    if (s.supplements) dietParts.push(`${s.supplements} supplement log${s.supplements !== 1 ? 's' : ''}`)
    if (s.medications) dietParts.push(`${s.medications} med log${s.medications !== 1 ? 's' : ''}`)
    cards.push({
      label: 'Diet Entries Total',
      value: String(s.meals + s.smoothies + s.supplements + s.medications),
      sub:   dietParts.join('  ·  ') || undefined,
      color: T.emerald,
    })
  }

  if (inc('goals'))
    cards.push({
      label: 'Active Goals',
      value: String(s.activeGoals),
      sub:   `${params.progressNotes.length} progress note${params.progressNotes.length !== 1 ? 's' : ''}`,
      color: T.teal,
    })

  if (inc('diary'))
    cards.push({
      label: 'Diary Entries',
      value: String(params.diary.length),
      color: T.brand,
    })

  if (inc('appointments'))
    cards.push({
      label: 'Appointments',
      value: String(params.appointments.length),
      color: T.rose,
    })

  // Draw 2-column card grid
  const COLS   = 2
  const GAP    = 3
  const CARD_W = (CW - GAP) / COLS
  const CARD_H = 24

  let col       = 0
  let rowStartY = w.y

  for (let ci = 0; ci < cards.length; ci++) {
    if (col === 0) { w.check(CARD_H + GAP); rowStartY = w.y }
    const card = cards[ci]
    const cx   = MX + col * (CARD_W + GAP)

    // Card background (warm off-white)
    w.setFill(T.background)
    w.doc.rect(cx, rowStartY, CARD_W, CARD_H, 'F')

    // Colored top strip
    w.setFill(card.color)
    w.doc.rect(cx, rowStartY, CARD_W, 2.8, 'F')

    // Uppercase muted label
    w.doc.setFont(F.body, 'bold')
    w.doc.setFontSize(6.5)
    w.setColor(T.muted)
    w.doc.text(card.label.toUpperCase(), cx + 3, rowStartY + 8.5)

    // Large monospace value
    w.doc.setFont(F.mono, 'bold')
    w.doc.setFontSize(18)
    w.setColor(card.color)
    w.doc.text(card.value, cx + 3, rowStartY + 17.5)

    // Sub-text (small, below number)
    if (card.sub) {
      w.doc.setFont(F.body, 'normal')
      w.doc.setFontSize(6)
      w.setColor(T.muted)
      const subLines = w.doc.splitTextToSize(card.sub, CARD_W - 6) as string[]
      w.doc.text(subLines, cx + 3, rowStartY + 21.5)
    }

    col++
    if (col >= COLS) {
      col = 0
      w.y = rowStartY + CARD_H + GAP
    }
  }
  if (col !== 0) w.y = rowStartY + CARD_H + GAP
  w.gap(4)

  // ── Horizontal regulation zone bar ────────────────────────────────────────
  if (inc('sensory') && params.sensory.length > 0) {
    const total       = params.sensory.length
    const ZONE_META: { key: string; label: string; color: RGB }[] = [
      { key: 'calm',         label: 'Calm',         color: T.reg.calm         },
      { key: 'alert',        label: 'Alert',        color: T.reg.alert        },
      { key: 'anxious',      label: 'Anxious',      color: T.reg.anxious      },
      { key: 'dysregulated', label: 'Dysregulated', color: T.reg.dysregulated },
      { key: 'shutdown',     label: 'Shutdown',     color: T.reg.shutdown     },
    ]
    const active = ZONE_META.filter(z => (s.byZone[z.key] ?? 0) > 0)

    if (active.length > 0) {
      w.check(32)
      w.doc.setFont(F.body, 'bold')
      w.doc.setFontSize(8)
      w.setColor(T.muted)
      w.doc.text('REGULATION ZONES', MX, w.y)
      w.y += 5.5

      const BAR_H  = 10
      const barTopY = w.y
      let segX = MX

      // Draw segments
      for (const z of active) {
        const count = s.byZone[z.key] ?? 0
        const segW  = (count / total) * CW
        w.setFill(z.color)
        w.doc.rect(segX, barTopY, segW, BAR_H, 'F')
        segX += segW
      }

      // Labels below bar
      w.y += BAR_H + 2
      segX = MX
      for (const z of active) {
        const count  = s.byZone[z.key] ?? 0
        const segW   = (count / total) * CW
        const labelX = segX + segW / 2

        // Only show label text if segment is wide enough
        if (segW >= 10) {
          w.doc.setFont(F.body, 'normal')
          w.doc.setFontSize(segW >= 20 ? 6.5 : 5.5)
          w.setColor(T.muted)
          w.doc.text(segW >= 25 ? z.label : z.label.slice(0, 4) + '.', labelX, w.y + 2.5, { align: 'center' })
        }

        w.doc.setFont(F.mono, 'bold')
        w.doc.setFontSize(8)
        w.setColor(z.color)
        w.doc.text(String(count), labelX, w.y + 7.5, { align: 'center' })

        segX += segW
      }
      w.y += 12
      w.gap(3)
    }
  }

  // ── Behavior severity bar chart ───────────────────────────────────────────
  if (inc('behavior') && s.behaviorCount > 0) {
    const hasSev = Object.values(s.bySeverity).some(v => v > 0)
    if (hasSev) {
      w.check(36)
      w.doc.setFont(F.body, 'bold')
      w.doc.setFontSize(8)
      w.setColor(T.muted)
      w.doc.text('BEHAVIOR SEVERITY BREAKDOWN', MX, w.y)
      w.y += 5.5

      const BAR_AREA_W = CW - 28  // reserve 28mm for label + count
      const BAR_H      = 4.5
      const ROW_GAP    = 7
      const SEV_LABELS = ['', 'Mild', 'Low', 'Moderate', 'High', 'Severe']

      for (let sev = 1; sev <= 5; sev++) {
        const count = s.bySeverity[sev] ?? 0
        if (count === 0) continue

        const barColor = T.sev[sev]
        const fillW    = (count / s.behaviorCount) * BAR_AREA_W

        // Severity label
        w.doc.setFont(F.body, 'normal')
        w.doc.setFontSize(7.5)
        w.setColor(T.text)
        w.doc.text(SEV_LABELS[sev], MX, w.y + BAR_H)

        // Track (background)
        w.setFill(lighten(barColor, 0.82))
        w.doc.rect(MX + 22, w.y, BAR_AREA_W, BAR_H, 'F')

        // Fill
        w.setFill(barColor)
        w.doc.rect(MX + 22, w.y, fillW, BAR_H, 'F')

        // Count
        w.doc.setFont(F.mono, 'bold')
        w.doc.setFontSize(7.5)
        w.setColor(barColor)
        w.doc.text(String(count), MX + 22 + BAR_AREA_W + 3, w.y + BAR_H)

        w.y += ROW_GAP
      }
      w.gap(4)
    }
  }

  // ── Sleep summary ─────────────────────────────────────────────────────────
  if (inc('sleep') && s.sleepNights > 0 && s.avgSleepMins) {
    w.check(18)
    w.doc.setFont(F.body, 'bold')
    w.doc.setFontSize(8)
    w.setColor(T.muted)
    w.doc.text('SLEEP SUMMARY', MX, w.y)
    w.y += 5.5

    const parts = [`Avg: ${fmtMins(s.avgSleepMins)}`]
    if (s.minSleepMins && s.maxSleepMins)
      parts.push(`Range: ${fmtMins(s.minSleepMins)} – ${fmtMins(s.maxSleepMins)}`)
    if (s.avgQuality)
      parts.push(`Avg quality: ${qualityLabel(Math.round(s.avgQuality))}`)

    w.doc.setFont(F.body, 'normal')
    w.doc.setFontSize(9.5)
    w.setColor(T.text)
    w.doc.text(parts.join('   ·   '), MX, w.y)
    w.y += 8
  }
}

// ─── Behavior frequency chart ─────────────────────────────────────────────────

function renderBehaviorChart(w: PDFWriter, logs: BehaviorLog[], startDate: string, endDate: string) {
  if (logs.length === 0) return

  // Group by date
  let allDates: string[]
  try {
    allDates = eachDayOfInterval({
      start: parseISO(startDate + 'T12:00:00'),
      end:   parseISO(endDate   + 'T12:00:00'),
    }).map(d => format(d, 'yyyy-MM-dd'))
  } catch {
    allDates = [...new Set(logs.map(l => l.entry_date))].sort()
  }

  const byDate: Record<string, { count: number; maxSev: number }> = {}
  for (const l of logs) {
    if (!byDate[l.entry_date]) byDate[l.entry_date] = { count: 0, maxSev: 0 }
    byDate[l.entry_date].count++
    byDate[l.entry_date].maxSev = Math.max(byDate[l.entry_date].maxSev, l.severity)
  }

  const shouldGroup = allDates.length > 31

  type Bar = { label: string; count: number; maxSev: number }
  let bars: Bar[]

  if (shouldGroup) {
    const weeks: Record<string, Bar> = {}
    for (const date of allDates) {
      const d    = parseISO(date + 'T12:00:00')
      const wkey = format(d, 'yyyy-ww')
      if (!weeks[wkey]) weeks[wkey] = { label: `Wk ${format(d, 'M/d')}`, count: 0, maxSev: 0 }
      const dd = byDate[date]
      if (dd) { weeks[wkey].count += dd.count; weeks[wkey].maxSev = Math.max(weeks[wkey].maxSev, dd.maxSev) }
    }
    bars = Object.entries(weeks).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v)
  } else {
    bars = allDates
      .filter(d => byDate[d])
      .map(d => ({ label: fmtDateShort(d), count: byDate[d].count, maxSev: byDate[d].maxSev }))
  }

  if (bars.length === 0) return

  const maxCount = Math.max(...bars.map(b => b.count))
  if (maxCount === 0) return

  const CHART_H   = 36
  const LABEL_H   = 7
  const TOTAL_H   = CHART_H + LABEL_H + 12

  w.check(TOTAL_H)

  // Chart title
  w.doc.setFont(F.body, 'bold')
  w.doc.setFontSize(8)
  w.setColor(T.muted)
  w.doc.text(shouldGroup ? 'INCIDENTS BY WEEK' : 'INCIDENTS BY DAY', MX, w.y)
  w.y += 5

  const chartX      = MX + 8
  const chartW      = CW - 10
  const chartTopY   = w.y
  const chartBotY   = chartTopY + CHART_H

  // Y-axis gridlines + labels
  const maxTick  = Math.ceil(maxCount)
  const tickStep = maxTick <= 5 ? 1 : maxTick <= 10 ? 2 : 5
  w.doc.setFont(F.body, 'normal')
  w.doc.setFontSize(5.5)
  w.setDraw(T.border)
  w.doc.setLineWidth(0.15)

  for (let tick = 0; tick <= maxTick; tick += tickStep) {
    const gy = chartBotY - (tick / maxTick) * CHART_H
    w.doc.line(chartX, gy, chartX + chartW, gy)
    w.setColor(T.muted)
    w.doc.text(String(tick), chartX - 2, gy + 1, { align: 'right' })
  }

  // Bars
  const barSpacing = 1
  const barW = Math.max(2, (chartW - barSpacing * (bars.length + 1)) / bars.length)
  const totalBarW  = barW * bars.length + barSpacing * (bars.length + 1)
  const startX     = chartX + (chartW - totalBarW) / 2

  for (let i = 0; i < bars.length; i++) {
    const bar  = bars[i]
    const barH = (bar.count / maxCount) * CHART_H
    const bx   = startX + barSpacing + i * (barW + barSpacing)
    const by   = chartBotY - barH
    const bc   = T.sev[bar.maxSev] ?? T.accent

    w.setFill(bc)
    w.doc.rect(bx, by, barW, barH, 'F')

    if (bar.count > 0 && barH > 4) {
      w.doc.setFont(F.mono, 'bold')
      w.doc.setFontSize(5.5)
      w.setColor(T.text)
      w.doc.text(String(bar.count), bx + barW / 2, by - 1, { align: 'center' })
    }

    if (bars.length <= 20 || i % 2 === 0) {
      w.doc.setFont(F.body, 'normal')
      w.doc.setFontSize(bars.length > 20 ? 5 : 6)
      w.setColor(T.muted)
      w.doc.text(bar.label, bx + barW / 2, chartBotY + 5, {
        align: 'center',
        angle: bars.length > 14 ? 35 : 0,
      })
    }
  }

  // Chart border (axes)
  w.setDraw(T.muted)
  w.doc.setLineWidth(0.3)
  w.doc.line(chartX, chartTopY, chartX, chartBotY)
  w.doc.line(chartX, chartBotY, chartX + chartW, chartBotY)

  // Severity legend
  const usedSevs = [...new Set(bars.map(b => b.maxSev))].filter(s => s > 0).sort()
  const sevLabels: Record<number,string> = {1:'Mild',2:'Low',3:'Moderate',4:'High',5:'Severe'}
  let lx = chartX
  const ly = chartBotY + LABEL_H + 1
  w.doc.setFontSize(6)

  for (const sev of usedSevs) {
    const sc = T.sev[sev]
    if (!sc) continue
    w.setFill(sc)
    w.doc.rect(lx, ly - 2.5, 3, 3, 'F')
    w.doc.setFont(F.body, 'normal')
    w.setColor(T.muted)
    w.doc.text(sevLabels[sev] ?? String(sev), lx + 4, ly)
    lx += w.doc.getTextWidth(sevLabels[sev] ?? '') + 9
  }

  w.y = ly + 5
  w.gap(2)
}

// ─── Module detail renderers ──────────────────────────────────────────────────

function renderDiary(w: PDFWriter, entries: DiaryEntry[]) {
  if (!entries.length) return
  w.sectionHeader('diary')
  for (const e of entries.sort((a,b)=>a.entry_date.localeCompare(b.entry_date))) {
    w.check(22)
    w.entryHeader(fmtDate(e.entry_date))
    w.body(e.note, { size: 9, color: T.muted })
    if (e.tags?.length) w.detail(`Tags: ${e.tags.join(', ')}`)
    w.gap(5)
    w.rule()
  }
}

function renderBehavior(w: PDFWriter, logs: BehaviorLog[], startDate: string, endDate: string) {
  if (!logs.length) return
  w.sectionHeader('behavior')

  renderBehaviorChart(w, logs, startDate, endDate)
  w.rule()
  w.gap(2)

  for (const l of logs.sort((a,b)=>a.entry_date.localeCompare(b.entry_date)||a.time_of_day.localeCompare(b.time_of_day))) {
    w.check(30)
    const sevLabel    = SEVERITY_LABELS[l.severity]?.label ?? `${l.severity}/5`
    const durPart     = l.duration_mins ? `, ${l.duration_mins} min` : ''
    w.entryHeader(fmtDate(l.entry_date), fmtTime(l.time_of_day))
    w.detail(`${capitalize(l.behavior)}  ·  Severity: ${sevLabel} (${l.severity}/5)${durPart}  ·  Location: ${capitalize(l.location)}`)
    const ant = l.antecedent_note
      ? `${capitalize(l.antecedent)} — ${l.antecedent_note}`
      : capitalize(l.antecedent)
    w.detail(`Triggered by: ${ant}`)
    w.detail(`Response: ${l.consequence}  ·  Helped: ${capitalize(l.helped)}`)
    w.gap(4)
    w.rule()
  }
}

function renderSensory(w: PDFWriter, logs: SensoryLog[]) {
  if (!logs.length) return
  w.sectionHeader('sensory')
  for (const l of logs.sort((a,b)=>a.entry_date.localeCompare(b.entry_date)||a.time_of_day.localeCompare(b.time_of_day))) {
    w.check(26)
    w.entryHeader(fmtDate(l.entry_date), fmtTime(l.time_of_day))
    const zone = REGULATION_LABEL[l.regulation_level] ?? capitalize(l.regulation_level)
    const dur  = l.duration_mins ? `  ·  ${l.duration_mins} min` : ''
    w.detail(`Zone: ${zone}${dur}  ·  Location: ${capitalize(l.location)}`)
    if (l.sensory_triggers?.length)   w.detail(`Triggers: ${l.sensory_triggers.join(', ')}`)
    if (l.calming_strategies?.length) w.detail(`Strategies: ${l.calming_strategies.join(', ')}  ·  Helped: ${capitalize(l.helped)}`)
    if (l.notes) w.detail(`Notes: ${l.notes}`)
    w.gap(4)
    w.rule()
  }
}

function renderDiet(w: PDFWriter, logs: DietLog[]) {
  if (!logs.length) return
  w.sectionHeader('diet')
  for (const l of logs.sort((a,b)=>a.entry_date.localeCompare(b.entry_date)||a.time_of_day.localeCompare(b.time_of_day))) {
    w.check(24)
    let header = ''
    if      (l.log_type === 'meal')        header = capitalize(l.meal_type ?? 'Meal')
    else if (l.log_type === 'smoothie')    header = `Smoothie${l.smoothie_type ? `: ${l.smoothie_type}` : ''}`
    else if (l.log_type === 'supplements') header = 'Supplements'
    else                                   header = 'Medications'
    w.entryHeader(fmtDate(l.entry_date), `${fmtTime(l.time_of_day)}  ·  ${header}`)
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
    w.rule()
  }
}

function renderSleep(w: PDFWriter, logs: SleepLog[]) {
  if (!logs.length) return
  w.sectionHeader('sleep')
  for (const l of logs.sort((a,b)=>a.log_date.localeCompare(b.log_date))) {
    w.check(24)
    const isDraft = !l.wake_time
    w.entryHeader(fmtDate(l.log_date), isDraft ? '(draft)' : undefined)
    const parts: string[] = []
    if (l.bedtime)             parts.push(`Bedtime: ${fmtTime(l.bedtime)}`)
    if (l.wake_time)           parts.push(`Wake: ${fmtTime(l.wake_time)}`)
    if (l.total_sleep_minutes) parts.push(`Total: ${fmtMins(l.total_sleep_minutes)}`)
    if (l.sleep_quality)       parts.push(`Quality: ${qualityLabel(l.sleep_quality)}`)
    if (parts.length) w.detail(parts.join('  ·  '))
    if (l.night_wakings_count > 0) {
      const wakingDetail = l.night_wakings_detail?.length
        ? l.night_wakings_detail.map(wk => `${wk.cause}${wk.duration_minutes ? ` (${wk.duration_minutes} min)` : ''}`).join(', ')
        : ''
      w.detail(`Night wakings: ${l.night_wakings_count}${wakingDetail ? `  ·  ${wakingDetail}` : ''}`)
    }
    if (l.nap_enabled && l.naps?.length) w.detail(`Naps: ${l.naps.length} nap(s)`)
    if (l.notes) w.detail(`Notes: ${l.notes}`)
    w.gap(4)
    w.rule()
  }
}

function renderGoals(w: PDFWriter, goals: Goal[], progressNotes: ProgressNote[]) {
  if (!goals.length) return
  w.sectionHeader('goals')
  const notesByGoal = new Map<string, ProgressNote[]>()
  for (const n of progressNotes) {
    const arr = notesByGoal.get(n.goal_id) ?? []
    arr.push(n)
    notesByGoal.set(n.goal_id, arr)
  }
  for (const g of goals.sort((a,b)=>a.status.localeCompare(b.status)||a.title.localeCompare(b.title))) {
    w.check(26)
    w.entryHeader(g.title)
    const sm        = statusMeta(g.status)
    const dateParts = [`Start: ${fmtDate(g.start_date)}`]
    if (g.target_date) dateParts.push(`Target: ${fmtDate(g.target_date)}`)
    w.detail(`Source: ${g.source}  ·  Status: ${sm.label}  ·  ${dateParts.join('  ·  ')}`)
    if (g.description) w.body(g.description, { size: 8.5, indent: 3 })
    const notes = (notesByGoal.get(g.id) ?? []).sort((a,b)=>a.note_date.localeCompare(b.note_date))
    if (notes.length) {
      w.gap(2)
      w.detail(`Progress notes (${notes.length} in range):`)
      for (const n of notes) {
        const rm       = ratingMeta(n.rating)
        const noteText = n.notes ? ` — ${n.notes}` : ''
        w.detail(`${fmtDate(n.note_date)}: ${rm.label}${noteText}`, 6)
      }
    }
    w.gap(5)
    w.rule()
  }
}

function renderAppointments(w: PDFWriter, appts: Appointment[], providers: Provider[]) {
  if (!appts.length) return
  const provMap = new Map(providers.map(p=>[p.id,p]))
  w.sectionHeader('appointments')
  for (const a of appts.sort((x,y)=>x.appt_date.localeCompare(y.appt_date))) {
    w.check(24)
    const prov    = a.provider_id ? provMap.get(a.provider_id) : null
    const provStr = prov ? `${prov.name} (${prov.role})` : 'No provider'
    w.entryHeader(fmtDate(a.appt_date), fmtTime(a.appt_time ?? undefined))
    w.detail(`${a.type}  ·  ${provStr}  ·  Status: ${capitalize(a.status)}`)
    if (a.notes) w.detail(`Notes: ${a.notes}`)
    if (a.followup_needed) {
      const fuDate = a.followup_date ? `  (by ${fmtDate(a.followup_date)})` : ''
      w.detail(`Follow-up needed${fuDate}: ${a.followup_text ?? ''}`)
    }
    w.gap(4)
    w.rule()
  }
}

// ─── Custom tracker renderer ──────────────────────────────────────────────────

function renderCustomTracker(w: PDFWriter, tracker: CustomTracker, logs: CustomTrackerLog[]) {
  const color = trackerColor(tracker)
  w.sectionHeader('custom', tracker.name.toUpperCase())
  w.gap(2)

  if (logs.length === 0) {
    w.body('No entries in this date range.', { size: 9, color: T.muted })
    w.gap(4)
    return
  }

  const typeLabel = tracker.tracker_type.replace('_', ' ')
  w.body(
    `Type: ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}  ·  ${logs.length} entries`,
    { size: 8.5, color },
  )
  w.gap(3)

  for (const log of logs) {
    w.check(14)
    const value   = formatTrackerValue(tracker.tracker_type, log)
    const dateStr = fmtDate(log.entry_date)
    w.entryHeader(dateStr, value)
    if (log.notes) w.body(log.notes, { size: 8.5, indent: 4 })
    w.gap(2)
    w.rule()
  }
}

/** Convert "#RRGGBB" → RGB triple. Used for custom tracker accent colors. */
function hexToRgb(hex: string): RGB {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function trackerColor(tracker: CustomTracker): RGB {
  return tracker.color?.startsWith('#') ? hexToRgb(tracker.color) : T.accent
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
  await new Promise(r => setTimeout(r, 50))   // let UI show loading state

  const w = new PDFWriter(params.childName, params.generatedDate)
  const s = buildSummary(params)

  // Page 1 — Cover
  renderCover(w, params)

  // Page 2 — Period at a Glance
  w.newPage()
  renderSummaryPage(w, params, s)

  // Pages 3+ — Module detail sections
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

  // Custom tracker pages
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
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function downloadPDF(params: PDFExportParams): Promise<void> {
  const blob     = await generatePDF(params)
  const filename = `${slug(params.childName)}-report-${params.startDate}-${params.endDate}.pdf`
  triggerDownload(blob, filename)
}
