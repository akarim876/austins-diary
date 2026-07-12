import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import type { BehaviorChartPoint } from '../../hooks/useDashboard'

interface Props {
  data: BehaviorChartPoint[]
}

const BAR_COLOR = '#f59e0b'  // amber-400

export function BehaviorFrequencyChart({ data }: Props) {
  const max = Math.max(...data.map(d => d.count), 1)

  // Show only every 5th label to avoid crowding on 30-day view
  const tickFormatter = (val: string, idx: number) => idx % 5 === 0 ? val : ''

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barSize={5} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="#f0ede8" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          domain={[0, max + 1]}
          width={32}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          cursor={{ fill: '#fef3c7', radius: 4 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((v: number) => [v, 'incidents']) as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={((l: string) => `${l}`) as any}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count > 0 ? BAR_COLOR : '#f3f4f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
