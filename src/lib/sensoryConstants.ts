import type { RegulationLevel } from '../types'

/** 5-step regulation gradient hex values. Use ONLY for zone indicators. */
export const REGULATION_HEX: Record<RegulationLevel, string> = {
  calm:         '#8FB89C',
  alert:        '#A9C08A',
  anxious:      '#E8C77E',
  dysregulated: '#D99A6C',
  shutdown:     '#C77B6A',
}

export const REGULATION_TEXT_HEX: Record<RegulationLevel, string> = {
  calm:         '#2d4a35',
  alert:        '#3a4a20',
  anxious:      '#5a4010',
  dysregulated: '#5a2e10',
  shutdown:     '#4a1f18',
}

export const REGULATION_ZONES: {
  value: RegulationLevel
  label: string
  emoji: string
  hex: string
  textHex: string
  color: string
  bg: string
  border: string
  selectedBg: string
}[] = [
  {
    value: 'calm',
    label: 'Calm',
    emoji: '🟢',
    hex: '#8FB89C',
    textHex: '#2d4a35',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    selectedBg: 'bg-emerald-500',
  },
  {
    value: 'alert',
    label: 'Alert',
    emoji: '🟡',
    hex: '#A9C08A',
    textHex: '#3a4a20',
    color: 'text-lime-800',
    bg: 'bg-lime-50',
    border: 'border-lime-200',
    selectedBg: 'bg-lime-500',
  },
  {
    value: 'anxious',
    label: 'Anxious',
    emoji: '🟠',
    hex: '#E8C77E',
    textHex: '#5a4010',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    selectedBg: 'bg-amber-400',
  },
  {
    value: 'dysregulated',
    label: 'Dysreg.',
    emoji: '🔴',
    hex: '#D99A6C',
    textHex: '#5a2e10',
    color: 'text-orange-800',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    selectedBg: 'bg-orange-500',
  },
  {
    value: 'shutdown',
    label: 'Shutdown',
    emoji: '🟣',
    hex: '#C77B6A',
    textHex: '#4a1f18',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    selectedBg: 'bg-rose-600',
  },
]

export const SENSORY_TRIGGERS = [
  'Noise',
  'Texture',
  'Light',
  'Crowd',
  'Smell',
  'Touch',
  'Transition',
  'Other',
] as const

export const CALMING_STRATEGIES = [
  'Deep pressure',
  'Quiet space',
  'Weighted blanket',
  'Headphones',
  'Movement/rocking',
  'Preferred item',
  'Other',
] as const

export const HELPED_OPTIONS = [
  { value: 'yes',      label: 'Yes',      color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'somewhat', label: 'Somewhat', color: 'bg-yellow-50  border-yellow-300  text-yellow-700'  },
  { value: 'no',       label: 'No',       color: 'bg-red-50     border-red-300     text-red-700'     },
] as const

/** Full label for regulation level (no abbreviation) */
export const REGULATION_LABEL: Record<RegulationLevel, string> = {
  calm:         'Calm',
  alert:        'Alert',
  anxious:      'Anxious',
  dysregulated: 'Dysregulated',
  shutdown:     'Shutdown',
}
