import type { ModuleIconName } from '../components/ui/ModuleIcon'

export type TileId =
  | 'smoothie'
  | 'meal'
  | 'behavior'
  | 'sensory'
  | 'sleep'
  | 'progress'
  | 'appointment'
  | 'quick_mood'

export interface TileDef {
  id: TileId
  label: string
  description: string
  /** Module icon name — render via <ModuleIcon name={def.icon} /> */
  icon: ModuleIconName
  /** Icon colour from the design system */
  accent: string
  /** Icon container background colour */
  iconBg: string
}

export const TILE_DEFS: TileDef[] = [
  {
    id: 'smoothie',
    label: 'Smoothie',
    description: 'Log a smoothie',
    icon: 'smoothie',
    accent: 'var(--color-accent)',
    iconBg: 'var(--color-accent-subtle)',
  },
  {
    id: 'meal',
    label: 'Meal / Snack',
    description: 'Log a meal or snack',
    icon: 'meal',
    accent: 'var(--color-accent)',
    iconBg: 'var(--color-accent-subtle)',
  },
  {
    id: 'behavior',
    label: 'Behavior',
    description: 'Log an incident',
    icon: 'behavior',
    accent: '#D99A6C',
    iconBg: 'rgba(217,154,108,0.12)',
  },
  {
    id: 'sensory',
    label: 'Sensory',
    description: 'Log regulation zone',
    icon: 'sensory',
    accent: '#8FB89C',
    iconBg: 'rgba(143,184,156,0.15)',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Log bedtime & wake',
    icon: 'sleep',
    accent: 'var(--color-accent)',
    iconBg: 'var(--color-accent-subtle)',
  },
  {
    id: 'progress',
    label: 'Goal Progress',
    description: 'Update a goal',
    icon: 'goals',
    accent: 'var(--color-accent)',
    iconBg: 'var(--color-accent-subtle)',
  },
  {
    id: 'appointment',
    label: 'Appointment',
    description: 'Log a visit',
    icon: 'appointments',
    accent: '#C77B6A',
    iconBg: 'rgba(199,123,106,0.12)',
  },
  {
    id: 'quick_mood',
    label: 'Quick Mood',
    description: 'One-tap zone check',
    icon: 'quick_mood',
    accent: '#8FB89C',
    iconBg: 'rgba(143,184,156,0.15)',
  },
]

export const DEFAULT_TILES: TileId[] = ['smoothie', 'behavior', 'sensory']

export function getTileDef(id: TileId): TileDef {
  return TILE_DEFS.find(t => t.id === id)!
}
