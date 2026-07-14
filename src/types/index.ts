export type { Database } from './database'

export type ProviderRole =
  | 'Pediatrician' | 'Psychiatrist' | 'ABA Therapist' | 'OT'
  | 'Speech Therapist' | 'Neurologist' | 'School/IEP Contact' | 'Other'

export type AppointmentType = 'Regular session' | 'Evaluation' | 'School meeting' | 'Follow-up' | 'Other'
export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'no_show'

export interface Provider {
  id: string
  profile_id: string
  author_id: string
  name: string
  role: ProviderRole
  role_other: string | null
  organization: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  profile_id: string
  provider_id: string | null
  author_id: string
  appt_date: string
  appt_time: string | null
  type: AppointmentType
  status: AppointmentStatus
  notes: string | null
  followup_needed: boolean
  followup_text: string | null
  followup_date: string | null
  created_at: string
  updated_at: string
}

export type GoalSource = 'IEP' | 'ABA' | 'OT' | 'Speech' | 'Behavior Plan' | 'Other'
export type GoalStatus = 'active' | 'on_hold' | 'achieved' | 'discontinued'
export type ProgressRating = 'regression' | 'no_change' | 'slight_progress' | 'good_progress' | 'goal_met'

export interface Goal {
  id: string
  profile_id: string
  author_id: string
  title: string
  source: GoalSource
  description: string
  status: GoalStatus
  start_date: string
  target_date: string | null
  created_at: string
  updated_at: string
}

export interface ProgressNote {
  id: string
  profile_id: string
  goal_id: string
  author_id: string
  note_date: string
  rating: ProgressRating
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NightWaking {
  duration_minutes: number | null
  cause: string
  cause_other?: string
}

export interface Nap {
  start_time: string | null
  end_time: string | null
}

export interface SleepLog {
  id: string
  profile_id: string
  author_id: string
  log_date: string
  bedtime: string | null
  wake_time: string | null
  total_sleep_minutes: number | null
  night_wakings_count: number
  night_wakings_detail: NightWaking[]
  sleep_quality: number | null
  nap_enabled: boolean
  naps: Nap[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  username: string
  created_at: string
  updated_at: string
}

export interface ChildProfile {
  id: string
  name: string
  birth_date: string | null
  avatar_url: string | null
  created_by: string
  created_at: string
}

export interface DiaryEntry {
  id: string
  profile_id: string
  author_id: string
  entry_date: string
  note: string
  photo_url: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ProfileAccess {
  id: string
  profile_id: string
  user_id: string
  role: 'owner' | 'viewer' | 'editor'
  email: string | null
  invited_at: string
}

export interface ProfileInvite {
  id: string
  profile_id: string
  invited_by: string
  email: string
  role: 'editor' | 'viewer'
  invited_at: string
}

export type DiaryEntryFormValues = {
  entry_date: string
  note: string
  tags: string[]
  photo?: File | null
}

export interface BehaviorLog {
  id: string
  profile_id: string
  author_id: string
  entry_date: string
  time_of_day: string
  location: string
  antecedent: string
  antecedent_note: string
  behavior: string
  severity: number
  duration_mins: number | null
  consequence: string
  helped: 'yes' | 'somewhat' | 'no'
  schedule_item_id: string | null
  created_at: string
  updated_at: string
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export interface ScheduleTemplateItem {
  id: string
  profile_id: string
  label: string
  time_of_day: string | null
  sort_order: number
  created_at: string
}

export type ScheduleItemStatus = 'not_yet' | 'done' | 'skipped' | 'changed'
export type DeviationReason = 'ran_late' | 'skipped' | 'changed_activity' | 'other'

export interface DailyScheduleEntry {
  id: string
  profile_id: string
  schedule_date: string
  template_item_id: string | null
  label: string
  time_of_day: string | null
  sort_order: number
  status: ScheduleItemStatus
  deviation_reason: DeviationReason | null
  deviation_note: string | null
  author_id: string | null
  updated_at: string
}

/** Merged view of a template item + its daily entry (if any). */
export interface ScheduleDisplayItem {
  entryId: string | null          // daily_schedule_entries.id, null = not yet saved
  templateItemId: string
  label: string
  time_of_day: string | null
  sort_order: number
  status: ScheduleItemStatus
  deviation_reason: DeviationReason | null
  deviation_note: string | null
}

export type BehaviorLogFormValues = {
  entry_date: string
  time_of_day: string
  location: string
  antecedent: string
  antecedent_note: string
  behavior: string
  severity: number
  duration_mins: number | null
  consequence: string
  helped: 'yes' | 'somewhat' | 'no'
}

export interface DietSettings {
  id: string
  profile_id: string
  accepted_foods: string[]
  morning_ingredients: string[]
  evening_ingredients: string[]
  /** Named smoothie recipes: { "Morning Green": ["Spinach", ...], ... } */
  smoothies: Record<string, string[]>
  supplements: string[]
  medications: string[]
  created_at: string
  updated_at: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type HydrationLevel = 'none' | 'some' | 'full_cup' | 'more'
export type FoodAcceptance = 'accepted' | 'partially_accepted' | 'refused'

export interface DietLog {
  id: string
  profile_id: string
  author_id: string
  entry_date: string
  time_of_day: string
  log_type: 'meal' | 'smoothie' | 'supplements' | 'medications'
  // meal fields
  meal_type: MealType | null
  foods_eaten: string[]
  new_food_introduced: boolean
  new_food_name: string
  new_food_acceptance: FoodAcceptance | null
  new_food_notes: string
  // smoothie fields — smoothie_type is the recipe name (any string)
  smoothie_type: string | null
  ingredients_checked: string[]
  ingredients_omitted: string[]
  // supplements entry
  supplements_checked: string[]
  supplements_omitted: string[]
  // medications entry
  medications_checked: string[]
  medications_omitted: string[]
  hydration: HydrationLevel | null
  substitution_notes: string
  // shared
  notes: string
  created_at: string
  updated_at: string
}

// ─── Custom Trackers ──────────────────────────────────────────────────────────

export type TrackerType = 'duration' | 'counter' | 'yes_no' | 'rating'

export interface CustomTracker {
  id: string
  profile_id: string
  name: string
  icon_name: string
  color: string
  tracker_type: TrackerType
  archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CustomTrackerLog {
  id: string
  tracker_id: string
  profile_id: string
  author_id: string
  entry_date: string
  duration_minutes: number | null
  started_at: string | null
  ended_at: string | null
  counter_value: number | null
  yes_no_value: boolean | null
  rating_value: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface QuickNote {
  id: string
  profile_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export type RegulationLevel = 'calm' | 'alert' | 'anxious' | 'dysregulated' | 'shutdown'

export interface SensoryLog {
  id: string
  profile_id: string
  author_id: string
  entry_date: string
  time_of_day: string
  location: string
  regulation_level: RegulationLevel
  sensory_triggers: string[]
  sensory_triggers_other: string
  calming_strategies: string[]
  calming_strategies_other: string
  helped: 'yes' | 'somewhat' | 'no'
  duration_mins: number | null
  notes: string
  behavior_log_id: string | null
  created_at: string
  updated_at: string
}
