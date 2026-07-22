import { memo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import type { SleepChartPoint } from '../../hooks/useDashboard'

interface Props {
  data: SleepChartPoint[]
  /** Highlight a reference line at the recommended 9h for children */
  reference?: number
}

// Stable module-level references — see BehaviorSleepCorrelationChart for why
// (recharts#7563: unstable props + animation drive an update-depth loop).
const CHART_MARGIN  = { top: 4, right: 4, bottom: 0, left: -24 }
const AXIS_TICK     = { fontSize: 10, fill: '#9ca3af' }
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
const TOOLTIP_CURSOR = { stroke: '#c7d2fe', strokeWidth: 1 }
const LINE_DOT        = { r: 2, fill: '#6366f1', strokeWidth: 0 }
const LINE_ACTIVE_DOT = { r: 4, fill: '#6366f1', strokeWidth: 0 }

const labelTickFormatter = (val: string, idx: number) => (idx % 5 === 0 ? val : '')
const hoursTickFormatter = (v: number) => `${v}h`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = ((v: number | null) => [v != null ? `${v.toFixed(1)}h` : '—', 'sleep']) as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipLabelFormatter = ((l: string) => `${l}`) as any

export const SleepDurationChart = memo(function SleepDurationChart({ data, reference = 9 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke="#f0ede8" />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={labelTickFormatter}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          domain={[0, 13]}
          width={32}
          tickFormatter={hoursTickFormatter}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={TOOLTIP_CURSOR}
          formatter={tooltipFormatter}
          labelFormatter={tooltipLabelFormatter}
        />
        <ReferenceLine
          y={reference}
          stroke="#c7d2fe"
          strokeDasharray="4 2"
          label={{ value: `${reference}h`, position: 'insideTopRight', fontSize: 9, fill: '#818cf8' }}
        />
        <Line
          type="monotone"
          dataKey="hours"
          stroke="#6366f1"
          strokeWidth={2}
          dot={LINE_DOT}
          activeDot={LINE_ACTIVE_DOT}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})
