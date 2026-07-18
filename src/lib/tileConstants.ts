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
  /** Icon colour — darker shade of the module's hue family */
  accent: string
  /** Icon container background — the module's pastel card colour */
  iconBg: string
}

export const TILE_DEFS: TileDef[] = [
  {
    id: 'smoothie',
    label: 'Smoothie',
    description: 'Log a smoothie',
    icon: 'smoothie',
    accent: '#3A6348',
    iconBg: '#D9E4DC',
  },
  {
    id: 'meal',
    label: 'Meal / Snack',
    description: 'Log a meal or snack',
    icon: 'meal',
    accent: '#3A6348',
    iconBg: '#D9E4DC',
  },
  {
    id: 'behavior',
    label: 'Behavior',
    description: 'Log an incident',
    icon: 'behavior',
    accent: '#7A5008',
    iconBg: '#F3E1B8',
  },
  {
    id: 'sensory',
    label: 'Sensory',
    description: 'Log regulation zone',
    icon: 'sensory',
    accent: '#6B3568',
    iconBg: '#E3CFE0',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Log bedtime & wake',
    icon: 'sleep',
    accent: '#2D5578',
    iconBg: '#D6E2ED',
  },
  {
    id: 'progress',
    label: 'Goal Progress',
    description: 'Update a goal',
    icon: 'goals',
    accent: '#5E4D2A',
    iconBg: '#F1EDE3',
  },
  {
    id: 'appointment',
    label: 'Appointment',
    description: 'Log a visit',
    icon: 'appointments',
    accent: '#7A2822',
    iconBg: '#E3B3AC',
  },
  {
    id: 'quick_mood',
    label: 'Quick Mood',
    description: 'One-tap zone check',
    icon: 'quick_mood',
    accent: '#6B3568',
    iconBg: '#E3CFE0',
  },
]

export const DEFAULT_TILES: TileId[] = ['smoothie', 'behavior', 'sensory']

export function getTileDef(id: TileId): TileDef {
  return TILE_DEFS.find(t => t.id === id)!
}
