import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types'

function cast(row: unknown): Goal {
  return row as Goal
}

/** All goals for a profile (for the Goals list page). */
export function useGoals(profileId: string | null) {
  const [goals, setGoals]     = useState<Goal[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
    setGoals((data ?? []).map(cast))
    setLoading(false)
  }, [profileId])

  useEffect(() => { refetch() }, [refetch])
  return { goals, loading, refetch }
}

/** Single goal by ID. */
export function useGoal(goalId: string | null) {
  const [goal, setGoal]       = useState<Goal | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!goalId) return
    setLoading(true)
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .maybeSingle()
    setGoal(data ? cast(data) : null)
    setLoading(false)
  }, [goalId])

  useEffect(() => { refetch() }, [refetch])
  return { goal, loading, refetch }
}
