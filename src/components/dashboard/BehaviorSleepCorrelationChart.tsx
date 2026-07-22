import { memo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'

/** One day of the combined 30-day view: behavior incident count + that night's sleep hours. */
export interface CorrelationPoint {
  date: string
  label: string
  count: number
  hours: number | null
}

interface Props {
  data: CorrelationPoint[]
}

const BAR_COLOR  = '#f59e0b'  // amber — matches BehaviorFrequencyChart
const LINE_COLOR = '#6366f1'  // indigo — matches SleepDurationChart

// ── Module-level constants ───────────────────────────────────────────────────
// All of these were previously inline object/function literals, which created a
// brand-new reference on every render. recharts 3 keeps axis/series props in an
// internal Redux store and re-syncs on each render; unstable prop identities keep
// re-triggering that sync (RenderedTicksReporter), which — combined with chart
// animations — can spin into a "Maximum update depth exceeded" loop (recharts#7563).
// Hoisting them to stable module constants (and disabling animation below) breaks
// that feedback loop.
const CHART_MARGIN = { top: 4, right: 4, bottom: 0, left: -16 }
const AXIS_TICK    = { fontSize: 10, fill: '#9ca3af' }
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
const LINE_DOT        = { r: 2, fill: LINE_COLOR, strokeWidth: 0 }
const LINE_ACTIVE_DOT = { r: 4, fill: LINE_COLOR, strokeWidth: 0 }

const labelTickFormatter = (val: string, idx: number) => (idx % 5 === 0 ? val : '')
const hoursTickFormatter = (v: number) => `${v}h`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = ((v: number | null, name: string) =>
  name === 'Sleep' ? [v != null ? `${v.toFixed(1)}h` : '—', name] : [v, name]) as any

/**
 * Overlays daily behavior-incident counts (bars, left axis) with same-night
 * sleep duration (line, right axis) on one 30-day timeline, so a caregiver
 * can visually spot whether rough nights tend to line up with rougher days.
 */
export const BehaviorSleepCorrelationChart = memo(function BehaviorSleepCorrelationChart({ data }: Props) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <ResponsiveContainer width="100%" height={190}>
      <ComposedChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke="#f0ede8" />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={labelTickFormatter}
        />
        <YAxis
          yAxisId="count"
          allowDecimals={false}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          domain={[0, maxCount + 1]}
          width={24}
        />
        <YAxis
          yAxisId="hours"
          orientation="right"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          domain={[0, 13]}
          width={28}
          tickFormatter={hoursTickFormatter}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tooltipFormatter} />
        <Legend verticalAlign="top" height={22} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar
          yAxisId="count"
          dataKey="count"
          name="Behavior"
          fill={BAR_COLOR}
          radius={[3, 3, 0, 0]}
          barSize={5}
          isAnimationActive={false}
        />
        <Line
          yAxisId="hours"
          type="monotone"
          dataKey="hours"
          name="Sleep"
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={LINE_DOT}
          activeDot={LINE_ACTIVE_DOT}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
})
