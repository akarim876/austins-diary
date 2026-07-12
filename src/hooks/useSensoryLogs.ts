import { useCallback, useEffect, useState } from 'react'
import type { SensoryLog } from '../types'
import { supabase } from '../lib/supabase'

export function useSensoryLogs(profileId: string | null) {
  const [logs, setLogs] = useState<SensoryLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('sensory_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('entry_date', { ascending: false })
      .order('time_of_day', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setLogs((data ?? []) as SensoryLog[])
    }
    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  return { logs, loading, error, refetch: fetch }
}

export function useSensoryLogsForDate(profileId: string | null, date: string) {
  const [logs, setLogs] = useState<SensoryLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!profileId || !date) return
    setLoading(true)
    const { data } = await supabase
      .from('sensory_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('entry_date', date)
      .order('time_of_day', { ascending: true })

    setLogs((data ?? []) as SensoryLog[])
    setLoading(false)
  }, [profileId, date])

  useEffect(() => { fetch() }, [fetch])

  return { logs, loading, refetch: fetch }
}
