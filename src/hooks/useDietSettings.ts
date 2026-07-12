import { useCallback, useEffect, useState } from 'react'
import type { DietSettings } from '../types'
import { supabase } from '../lib/supabase'

const EMPTY_SETTINGS: Omit<DietSettings, 'id' | 'created_at' | 'updated_at'> = {
  profile_id: '',
  accepted_foods: [],
  morning_ingredients: [],
  evening_ingredients: [],
  smoothies: {},
  supplements: [],
  medications: [],
}

export function useDietSettings(profileId: string | null) {
  const [settings, setSettings] = useState<DietSettings | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { data } = await supabase
      .from('diet_settings')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()
    setSettings(data as DietSettings | null)
    setLoading(false)
  }, [profileId])

  useEffect(() => { load() }, [load])

  /** Save (upsert) the settings. Returns the saved settings or null on error. */
  async function save(patch: Partial<Omit<DietSettings, 'id' | 'profile_id' | 'created_at' | 'updated_at'>>) {
    if (!profileId) return null
    const current = settings ?? { ...EMPTY_SETTINGS, profile_id: profileId }
    const next: DietSettings = { ...current, ...patch } as DietSettings

    const { data, error } = await supabase
      .from('diet_settings')
      .upsert({ ...next, profile_id: profileId }, { onConflict: 'profile_id' })
      .select()
      .single()

    if (!error && data) {
      setSettings(data as DietSettings)
      return data as DietSettings
    }
    return null
  }

  const effectiveSettings = settings ?? ({ ...EMPTY_SETTINGS, profile_id: profileId ?? '' } as DietSettings)

  return { settings: effectiveSettings, loading, refetch: load, save }
}
