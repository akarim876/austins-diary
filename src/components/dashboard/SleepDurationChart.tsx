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

export function SleepDurationChart({ data, reference = 9 }: Props) {
  const tickFormatter = (val: string, idx: number) => idx % 5 === 0 ? val : ''

  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke="#f0ede8" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 13]}
          width={32}
          tickFormatter={v => `${v}h`}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          cursor={{ stroke: '#c7d2fe', strokeWidth: 1 }}
          formatter={((v: number | null) => [v != null ? `${v.toFixed(1)}h` : '—', 'sleep']) as any}
          labelFormatter={((l: string) => `${l}`) as any}
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
          dot={{ r: 2, fill: '#6366f1', strokeWidth: 0 }}
          activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
