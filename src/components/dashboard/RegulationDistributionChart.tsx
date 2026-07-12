import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts'
import type { RegulationPoint } from '../../hooks/useDashboard'

interface Props {
  data: RegulationPoint[]
}

export function RegulationDistributionChart({ data }: Props) {
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
        margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
        barSize={14}
      >
        <CartesianGrid horizontal={false} stroke="#f0ede8" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 'dataMax + 1']}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={62}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          cursor={{ fill: '#f3f4f6' }}
          formatter={((v: number) => [v, 'entries']) as any}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count > 0 ? d.color : '#e5e7eb'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
