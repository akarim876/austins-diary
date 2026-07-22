import { memo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import type { BehaviorChartPoint } from '../../hooks/useDashboard'

interface Props {
  data: BehaviorChartPoint[]
}

const BAR_COLOR = '#f59e0b'  // amber-400

// Stable module-level references — see BehaviorSleepCorrelationChart for why
// (recharts#7563: unstable props + animation drive an update-depth loop).
const CHART_MARGIN  = { top: 4, right: 4, bottom: 0, left: -24 }
const AXIS_TICK     = { fontSize: 10, fill: '#9ca3af' }
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
const TOOLTIP_CURSOR = { fill: '#fef3c7', radius: 4 }

// Show only every 5th label to avoid crowding on 30-day view
const labelTickFormatter = (val: string, idx: number) => (idx % 5 === 0 ? val : '')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = ((v: number) => [v, 'incidents']) as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipLabelFormatter = ((l: string) => `${l}`) as any

export const BehaviorFrequencyChart = memo(function BehaviorFrequencyChart({ data }: Props) {
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={CHART_MARGIN} barSize={5} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="#f0ede8" />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={labelTickFormatter}
        />
        <YAxis
          allowDecimals={false}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          domain={[0, max + 1]}
          width={32}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={TOOLTIP_CURSOR}
          formatter={tooltipFormatter}
          labelFormatter={tooltipLabelFormatter}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count > 0 ? BAR_COLOR : '#f3f4f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})
