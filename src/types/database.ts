export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      child_profiles: {
        Row: {
          id: string
          name: string
          birth_date: string | null
          avatar_url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          birth_date?: string | null
          avatar_url?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          birth_date?: string | null
          avatar_url?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          username: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          username: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          username?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_access: {
        Row: {
          id: string
          profile_id: string
          user_id: string
          role: 'owner' | 'viewer' | 'editor'
          email: string | null
          invited_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          user_id: string
          role: 'owner' | 'viewer' | 'editor'
          email?: string | null
          invited_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          user_id?: string
          role?: 'owner' | 'viewer' | 'editor'
          email?: string | null
          invited_at?: string
        }
        Relationships: []
      }
      profile_invites: {
        Row: {
          id: string
          profile_id: string
          invited_by: string
          email: string
          role: 'editor' | 'viewer'
          invited_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          invited_by: string
          email: string
          role: 'editor' | 'viewer'
          invited_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          invited_by?: string
          email?: string
          role?: 'editor' | 'viewer'
          invited_at?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
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
        Insert: {
          id?: string
          profile_id: string
          author_id: string
          entry_date: string
          note: string
          photo_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          author_id?: string
          entry_date?: string
          note?: string
          photo_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      behavior_logs: {
        Row: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          author_id: string
          entry_date: string
          time_of_day: string
          location?: string
          antecedent: string
          antecedent_note?: string
          behavior: string
          severity: number
          duration_mins?: number | null
          consequence?: string
          helped: 'yes' | 'somewhat' | 'no'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          author_id?: string
          entry_date?: string
          time_of_day?: string
          location?: string
          antecedent?: string
          antecedent_note?: string
          behavior?: string
          severity?: number
          duration_mins?: number | null
          consequence?: string
          helped?: 'yes' | 'somewhat' | 'no'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      diet_settings: {
        Row: {
          id: string
          profile_id: string
          accepted_foods: string[]
          morning_ingredients: string[]
          evening_ingredients: string[]
          smoothies: Record<string, string[]>
          supplements: string[]
          medications: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          accepted_foods?: string[]
          morning_ingredients?: string[]
          evening_ingredients?: string[]
          smoothies?: Record<string, string[]>
          supplements?: string[]
          medications?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          accepted_foods?: string[]
          morning_ingredients?: string[]
          evening_ingredients?: string[]
          smoothies?: Record<string, string[]>
          supplements?: string[]
          medications?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      diet_logs: {
        Row: {
          id: string
          profile_id: string
          author_id: string
          entry_date: string
          time_of_day: string
          log_type: 'meal' | 'smoothie' | 'supplements' | 'medications'
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          foods_eaten: string[]
          new_food_introduced: boolean
          new_food_name: string
          new_food_acceptance: 'accepted' | 'partially_accepted' | 'refused' | null
          new_food_notes: string
          smoothie_type: string | null
          ingredients_checked: string[]
          ingredients_omitted: string[]
          supplements_checked: string[]
          supplements_omitted: string[]
          medications_checked: string[]
          medications_omitted: string[]
          hydration: 'none' | 'some' | 'full_cup' | 'more' | null
          substitution_notes: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          author_id: string
          entry_date: string
          time_of_day: string
          log_type: 'meal' | 'smoothie' | 'supplements' | 'medications'
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          foods_eaten?: string[]
          new_food_introduced?: boolean
          new_food_name?: string
          new_food_acceptance?: 'accepted' | 'partially_accepted' | 'refused' | null
          new_food_notes?: string
          smoothie_type?: string | null
          ingredients_checked?: string[]
          ingredients_omitted?: string[]
          supplements_checked?: string[]
          supplements_omitted?: string[]
          medications_checked?: string[]
          medications_omitted?: string[]
          hydration?: 'none' | 'some' | 'full_cup' | 'more' | null
          substitution_notes?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          author_id?: string
          entry_date?: string
          time_of_day?: string
          log_type?: 'meal' | 'smoothie' | 'supplements' | 'medications'
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          foods_eaten?: string[]
          new_food_introduced?: boolean
          new_food_name?: string
          new_food_acceptance?: 'accepted' | 'partially_accepted' | 'refused' | null
          new_food_notes?: string
          smoothie_type?: string | null
          ingredients_checked?: string[]
          ingredients_omitted?: string[]
          supplements_checked?: string[]
          supplements_omitted?: string[]
          medications_checked?: string[]
          medications_omitted?: string[]
          hydration?: 'none' | 'some' | 'full_cup' | 'more' | null
          substitution_notes?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensory_logs: {
        Row: {
          id: string
          profile_id: string
          author_id: string
          entry_date: string
          time_of_day: string
          location: string
          regulation_level: 'calm' | 'alert' | 'anxious' | 'dysregulated' | 'shutdown'
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
        Insert: {
          id?: string
          profile_id: string
          author_id: string
          entry_date: string
          time_of_day: string
          location?: string
          regulation_level: 'calm' | 'alert' | 'anxious' | 'dysregulated' | 'shutdown'
          sensory_triggers?: string[]
          sensory_triggers_other?: string
          calming_strategies?: string[]
          calming_strategies_other?: string
          helped?: 'yes' | 'somewhat' | 'no'
          duration_mins?: number | null
          notes?: string
          behavior_log_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          author_id?: string
          entry_date?: string
          time_of_day?: string
          location?: string
          regulation_level?: 'calm' | 'alert' | 'anxious' | 'dysregulated' | 'shutdown'
          sensory_triggers?: string[]
          sensory_triggers_other?: string
          calming_strategies?: string[]
          calming_strategies_other?: string
          helped?: 'yes' | 'somewhat' | 'no'
          duration_mins?: number | null
          notes?: string
          behavior_log_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          id: string
          profile_id: string
          author_id: string
          log_date: string
          bedtime: string | null
          wake_time: string | null
          total_sleep_minutes: number | null
          night_wakings_count: number
          night_wakings_detail: Json
          sleep_quality: number | null
          nap_enabled: boolean
          naps: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          author_id: string
          log_date: string
          bedtime?: string | null
          wake_time?: string | null
          total_sleep_minutes?: number | null
          night_wakings_count?: number
          night_wakings_detail?: Json
          sleep_quality?: number | null
          nap_enabled?: boolean
          naps?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          author_id?: string
          log_date?: string
          bedtime?: string | null
          wake_time?: string | null
          total_sleep_minutes?: number | null
          night_wakings_count?: number
          night_wakings_detail?: Json
          sleep_quality?: number | null
          nap_enabled?: boolean
          naps?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          profile_id: string
          author_id: string
          title: string
          source: string
          description: string
          status: string
          start_date: string
          target_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          author_id: string
          title: string
          source: string
          description?: string
          status?: string
          start_date?: string
          target_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          author_id?: string
          title?: string
          source?: string
          description?: string
          status?: string
          start_date?: string
          target_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_notes: {
        Row: {
          id: string
          profile_id: string
          goal_id: string
          author_id: string
          note_date: string
          rating: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          goal_id: string
          author_id: string
          note_date?: string
          rating: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          goal_id?: string
          author_id?: string
          note_date?: string
          rating?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          id: string; profile_id: string; author_id: string
          name: string; role: string; role_other: string | null
          organization: string | null; phone: string | null
          email: string | null; address: string | null; notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; profile_id: string; author_id: string
          name: string; role: string; role_other?: string | null
          organization?: string | null; phone?: string | null
          email?: string | null; address?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; profile_id?: string; author_id?: string
          name?: string; role?: string; role_other?: string | null
          organization?: string | null; phone?: string | null
          email?: string | null; address?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string; profile_id: string; provider_id: string | null
          author_id: string; appt_date: string; appt_time: string | null
          type: string; status: string; notes: string | null
          followup_needed: boolean; followup_text: string | null
          followup_date: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; profile_id: string; provider_id?: string | null
          author_id: string; appt_date: string; appt_time?: string | null
          type: string; status?: string; notes?: string | null
          followup_needed?: boolean; followup_text?: string | null
          followup_date?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; profile_id?: string; provider_id?: string | null
          author_id?: string; appt_date?: string; appt_time?: string | null
          type?: string; status?: string; notes?: string | null
          followup_needed?: boolean; followup_text?: string | null
          followup_date?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
