import type { ModuleIconName } from '../components/ui/ModuleIcon'

export type TileId =
  | 'smoothie'
  | 'meal'
  | 'behavior'
  | 'sensory'
  | 'sleep'
  | 'progress'
  | 'appointment'

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
    accent: '#5B7B7A',
    iconBg: 'rgba(91,123,122,0.12)',
  },
  {
    id: 'meal',
    label: 'Meal / Snack',
    description: 'Log a meal or snack',
    icon: 'meal',
    accent: '#5B7B7A',
    iconBg: 'rgba(91,123,122,0.10)',
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
    accent: '#5B7B7A',
    iconBg: 'rgba(91,123,122,0.10)',
  },
  {
    id: 'progress',
    label: 'Goal Progress',
    description: 'Update a goal',
    icon: 'goals',
    accent: '#5B7B7A',
    iconBg: 'rgba(91,123,122,0.12)',
  },
  {
    id: 'appointment',
    label: 'Appointment',
    description: 'Log a visit',
    icon: 'appointments',
    accent: '#C77B6A',
    iconBg: 'rgba(199,123,106,0.12)',
  },
]

export const DEFAULT_TILES: TileId[] = ['smoothie', 'behavior', 'sensory']

export function getTileDef(id: TileId): TileDef {
  return TILE_DEFS.find(t => t.id === id)!
}
