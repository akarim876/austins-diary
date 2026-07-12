export const ANTECEDENTS = [
  'transition',
  'loud noise',
  'denied request',
  'hunger',
  'unfamiliar person',
  'schedule change',
  'sensory overload',
  'other',
] as const

export const BEHAVIORS = [
  'meltdown',
  'elopement',
  'self-injury',
  'aggression',
  'shutdown',
  'stimming spike',
  'property destruction',
  'other',
] as const

export const LOCATIONS = [
  'home',
  'school',
  'therapy',
  'park',
  'store',
  'car',
  'restaurant',
  'other',
] as const

export const SEVERITY_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Mild',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
  2: { label: 'Low',      color: 'text-lime-700',    bg: 'bg-lime-100'    },
  3: { label: 'Moderate', color: 'text-yellow-700',  bg: 'bg-yellow-100'  },
  4: { label: 'High',     color: 'text-orange-700',  bg: 'bg-orange-100'  },
  5: { label: 'Severe',   color: 'text-red-700',     bg: 'bg-red-100'     },
}

export const HELPED_OPTIONS = [
  { value: 'yes',      label: 'Yes',       color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'somewhat', label: 'Somewhat',  color: 'bg-yellow-50  border-yellow-300  text-yellow-700'  },
  { value: 'no',       label: 'No',        color: 'bg-red-50     border-red-300     text-red-700'     },
] as const
