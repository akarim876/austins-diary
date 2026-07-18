/**
 * Packed-circle weekly summary visualization.
 * Circles are sized proportionally to entry count (sqrt-scaled for area).
 * Each module gets its fixed pastel color regardless of active theme.
 */
import { ModuleIcon } from '../ui/ModuleIcon'
import type { ModuleIconName } from '../ui/ModuleIcon'

export interface BubbleData {
  id: string
  label: string
  value: number
  bgColor: string
  iconColor: string
  icon: ModuleIconName
}

interface Props {
  bubbles: BubbleData[]
}

// Fixed layout: center positions as fractions of [0..1] within a 320×180 canvas
const POSITIONS: { cx: number; cy: number }[] = [
  { cx: 0.21, cy: 0.42 }, // slot 0 – left-center
  { cx: 0.42, cy: 0.25 }, // slot 1 – top-center-left
  { cx: 0.63, cy: 0.42 }, // slot 2 – center
  { cx: 0.84, cy: 0.25 }, // slot 3 – top-right
  { cx: 0.52, cy: 0.72 }, // slot 4 – bottom-center
  { cx: 0.84, cy: 0.72 }, // slot 5 – bottom-right
]

const W = 320
const H = 180
const MIN_R = 20
const MAX_R = 52

function getRadius(value: number, maxVal: number): number {
  if (maxVal === 0) return MIN_R
  return MIN_R + (MAX_R - MIN_R) * Math.sqrt(value / maxVal)
}

export function WeeklyBubbleChart({ bubbles }: Props) {
  if (bubbles.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        No entries this week
      </div>
    )
  }

  const maxVal = Math.max(...bubbles.map(b => b.value), 1)
  const hasAnyData = bubbles.some(b => b.value > 0)

  if (!hasAnyData) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Nothing logged this week yet
      </div>
    )
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={{ overflow: 'visible', maxHeight: 200 }}
        aria-hidden="true"
      >
        {bubbles.map((b, i) => {
          const pos = POSITIONS[i % POSITIONS.length]
          const cx = pos.cx * W
          const cy = pos.cy * H
          const r = getRadius(b.value, maxVal)

          return (
            <g key={b.id} style={{ opacity: b.value === 0 ? 0.35 : 1, transition: 'opacity 300ms' }}>
              {/* Circle fill */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={b.bgColor}
                stroke={b.iconColor}
                strokeWidth={1.5}
                strokeOpacity={0.25}
              />

              {/* Module icon — centered via foreignObject so we can use the React component */}
              <foreignObject
                x={cx - 10}
                y={cy - r * 0.35}
                width={20}
                height={20}
              >
                <ModuleIcon
                  name={b.icon}
                  style={{ width: 20, height: 20, color: b.iconColor, display: 'block' }}
                />
              </foreignObject>

              {/* Count label */}
              <text
                x={cx}
                y={cy + r * 0.45}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize={11}
                fontWeight={700}
                fontFamily="Inter, system-ui, sans-serif"
                fill={b.iconColor}
              >
                {b.value}
              </text>

              {/* Module label below the circle */}
              <text
                x={cx}
                y={cy + r + 10}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize={9}
                fontFamily="Inter, system-ui, sans-serif"
                fill="var(--color-text-muted)"
              >
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
