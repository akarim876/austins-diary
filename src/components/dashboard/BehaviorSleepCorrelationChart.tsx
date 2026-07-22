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

/**
 * Overlays daily behavior-incident counts (bars, left axis) with same-night
 * sleep duration (line, right axis) on one 30-day timeline, so a caregiver
 * can visually spot whether rough nights tend to line up with rougher days.
 */
export function BehaviorSleepCorrelationChart({ data }: Props) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const tickFormatter = (val: string, idx: number) => idx % 5 === 0 ? val : ''

  return (
    <ResponsiveContainer width="100%" height={190}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="#f0ede8" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis
          yAxisId="count"
          allowDecimals={false}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          domain={[0, maxCount + 1]}
          width={24}
        />
        <YAxis
          yAxisId="hours"
          orientation="right"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 13]}
          width={28}
          tickFormatter={v => `${v}h`}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0ede8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          formatter={((v: number | null, name: string) =>
            name === 'Sleep' ? [v != null ? `${v.toFixed(1)}h` : '—', name] : [v, name]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any}
        />
        <Legend verticalAlign="top" height={22} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="count" dataKey="count" name="Behavior" fill={BAR_COLOR} radius={[3, 3, 0, 0]} barSize={5} />
        <Line
          yAxisId="hours"
          type="monotone"
          dataKey="hours"
          name="Sleep"
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={{ r: 2, fill: LINE_COLOR, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
