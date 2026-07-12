import type { MealType, HydrationLevel, FoodAcceptance } from '../types'

export const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch',     label: 'Lunch',     emoji: '☀️'  },
  { value: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { value: 'snack',     label: 'Snack',     emoji: '🍎' },
]

export const HYDRATION_OPTIONS: { value: HydrationLevel; label: string; emoji: string }[] = [
  { value: 'none',           label: 'None',           emoji: '💧' },
  { value: 'some',           label: 'Some sips',      emoji: '🥤' },
  { value: 'full_cup',       label: 'Full cup',        emoji: '🥛' },
  { value: 'more',           label: 'More than usual', emoji: '✅' },
]

export const ACCEPTANCE_OPTIONS: { value: FoodAcceptance; label: string; color: string }[] = [
  { value: 'accepted',           label: 'Accepted',           color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'partially_accepted', label: 'Partially accepted', color: 'bg-yellow-50  border-yellow-300  text-yellow-700'  },
  { value: 'refused',            label: 'Refused',            color: 'bg-red-50     border-red-300     text-red-700'     },
]

export const ACCEPTANCE_LABEL: Record<FoodAcceptance, string> = {
  accepted:           'Accepted',
  partially_accepted: 'Partial',
  refused:            'Refused',
}

export const ACCEPTANCE_COLOR: Record<FoodAcceptance, string> = {
  accepted:           'bg-emerald-50 border-emerald-200 text-emerald-700',
  partially_accepted: 'bg-yellow-50  border-yellow-200  text-yellow-700',
  refused:            'bg-red-50     border-red-200     text-red-700',
}
