import { useCallback, useEffect, useState } from 'react'
import type { DiaryEntry } from '../types'
import { supabase } from '../lib/supabase'

export function useDiaryEntries(profileId: string | null) {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('profile_id', profileId)
      .order('entry_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEntries((data ?? []) as DiaryEntry[])
    }
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { entries, loading, error, refetch: fetch }
}

export function useDiaryEntry(profileId: string | null, date: string) {
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!profileId || !date) return
    setLoading(true)
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('profile_id', profileId)
      .eq('entry_date', date)
      .order('created_at', { ascending: false })
      .limit(1)

    const rows = (data ?? []) as DiaryEntry[]
    setEntry(rows[0] ?? null)
    setLoading(false)
  }, [profileId, date])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { entry, loading, refetch: fetch }
}
