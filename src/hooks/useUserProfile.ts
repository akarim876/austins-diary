import { useCallback, useEffect, useState } from 'react'
import type { UserProfile } from '../types'
import { supabase } from '../lib/supabase'

export function useUserProfile(userId: string | null) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setUserProfile(data as UserProfile | null)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  async function save(values: { first_name: string; last_name: string; username: string }) {
    if (!userId) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...values }, { onConflict: 'user_id' })
      .select()
      .single()
    if (!error && data) {
      setUserProfile(data as UserProfile)
    }
    return { error: error?.message ?? null }
  }

  const displayName = userProfile
    ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
    : null

  return { userProfile, loading, hasProfile: !!userProfile, displayName, save, refetch: load }
}
