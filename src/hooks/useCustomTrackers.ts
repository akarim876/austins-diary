import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CustomTracker } from '../types'

/** Fetch all non-archived custom trackers for a child profile. */
export function useCustomTrackers(profileId: string | null) {
  const [trackers, setTrackers] = useState<CustomTracker[]>([])
  const [loading,  setLoading]  = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) { setTrackers([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('custom_trackers')
      .select('*')
      .eq('profile_id', profileId)
      .eq('archived', false)
      .order('sort_order')
      .order('created_at')
    setTrackers((data ?? []) as CustomTracker[])
    setLoading(false)
  }, [profileId])

  useEffect(() => { refetch() }, [refetch])

  return { trackers, loading, refetch }
}

/** Fetch all custom trackers including archived ones (for settings management). */
export function useAllCustomTrackers(profileId: string | null) {
  const [trackers, setTrackers] = useState<CustomTracker[]>([])
  const [loading,  setLoading]  = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) { setTrackers([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('custom_trackers')
      .select('*')
      .eq('profile_id', profileId)
      .order('archived')
      .order('sort_order')
      .order('created_at')
    setTrackers((data ?? []) as CustomTracker[])
    setLoading(false)
  }, [profileId])

  useEffect(() => { refetch() }, [refetch])

  return { trackers, loading, refetch }
}
