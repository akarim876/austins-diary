import { useCallback, useEffect, useState } from 'react'
import type { DietLog } from '../types'
import { supabase } from '../lib/supabase'

export function useDietLogs(profileId: string | null) {
  const [logs, setLogs] = useState<DietLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { data } = await supabase
      .from('diet_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('entry_date', { ascending: false })
      .order('time_of_day', { ascending: false })
    setLogs((data ?? []) as DietLog[])
    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  return { logs, loading, refetch: fetch }
}

export function useDietLogsForDate(profileId: string | null, date: string) {
  const [logs, setLogs] = useState<DietLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!profileId || !date) return
    setLoading(true)
    const { data } = await supabase
      .from('diet_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('entry_date', date)
      .order('time_of_day', { ascending: true })
    setLogs((data ?? []) as DietLog[])
    setLoading(false)
  }, [profileId, date])

  useEffect(() => { fetch() }, [fetch])

  return { logs, loading, refetch: fetch }
}
