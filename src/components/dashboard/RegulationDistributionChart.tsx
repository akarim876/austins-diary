import { memo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts'
import type { RegulationPoint } from '../../hooks/useDashboard'

interface Props {
  data: RegulationPoint[]
}

// Stable module-level references — see BehaviorSleepCorrelationChart for why
// (recharts#7563: unstable props + animation drive an update-depth loop).
const CHART_MARGIN  = { top: 0, right: 24, bottom: 0, left: 0 }
const X_AXIS_TICK   = { fontSize: 10, fill: '#9ca3af' }
const Y_AXIS_TICK   = { fontSize: 11, fill: '#6b7280' }
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
const TOOLTIP_CURSOR = { fill: '#f3f4f6' }
const X_DOMAIN: [number, string] = [0, 'dataMax + 1']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = ((v: number) => [v, 'entries']) as any

export const RegulationDistributionChart = memo(function RegulationDistributionChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No regulation data logged this week
      </p>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart
        data={data}
        layout="vertical"
        margin={CHART_MARGIN}
        barSize={14}
      >
        <CartesianGrid horizontal={false} stroke="#f0ede8" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={X_AXIS_TICK}
          tickLine={false}
          axisLine={false}
          domain={X_DOMAIN}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={Y_AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={62}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={TOOLTIP_CURSOR}
          formatter={tooltipFormatter}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count > 0 ? d.color : '#e5e7eb'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})
