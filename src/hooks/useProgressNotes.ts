import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ProgressNote } from '../types'

function cast(row: unknown): ProgressNote {
  return row as ProgressNote
}

/** All progress notes for a profile (for calendar dots). */
export function useProgressNotes(profileId: string | null) {
  const [notes, setNotes]     = useState<ProgressNote[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { data } = await supabase
      .from('progress_notes')
      .select('*')
      .eq('profile_id', profileId)
      .order('note_date', { ascending: false })
    setNotes((data ?? []).map(cast))
    setLoading(false)
  }, [profileId])

  useEffect(() => { refetch() }, [refetch])
  return { notes, loading, refetch }
}

/** Progress notes for a specific calendar date. */
export function useProgressNotesForDate(profileId: string | null, date: string) {
  const [notes, setNotes]     = useState<ProgressNote[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId || !date) return
    setLoading(true)
    const { data } = await supabase
      .from('progress_notes')
      .select('*')
      .eq('profile_id', profileId)
      .eq('note_date', date)
      .order('created_at', { ascending: false })
    setNotes((data ?? []).map(cast))
    setLoading(false)
  }, [profileId, date])

  useEffect(() => { refetch() }, [refetch])
  return { notes, loading, refetch }
}

/** Progress notes for a specific goal (for goal detail timeline). */
export function useProgressNotesForGoal(goalId: string | null) {
  const [notes, setNotes]     = useState<ProgressNote[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!goalId) return
    setLoading(true)
    const { data } = await supabase
      .from('progress_notes')
      .select('*')
      .eq('goal_id', goalId)
      .order('note_date', { ascending: true })  // oldest first for timeline
    setNotes((data ?? []).map(cast))
    setLoading(false)
  }, [goalId])

  useEffect(() => { refetch() }, [refetch])
  return { notes, loading, refetch }
}
