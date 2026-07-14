import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CustomTrackerLog } from '../types'

/** Logs for a specific date — used by calendar day panel and dashboard. */
export function useCustomTrackerLogsForDate(
  profileId: string | null,
  date: string,
) {
  const [logs,    setLogs]    = useState<CustomTrackerLog[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) { setLogs([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('custom_tracker_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('entry_date', date)
      .order('created_at', { ascending: false })
    setLogs((data ?? []) as CustomTrackerLog[])
    setLoading(false)
  }, [profileId, date])

  useEffect(() => { refetch() }, [refetch])

  return { logs, loading, refetch }
}

/** Logs over a date range — used by export. */
export function useCustomTrackerLogsRange(
  profileId: string | null,
  start: string,
  end: string,
) {
  const [logs,    setLogs]    = useState<CustomTrackerLog[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) { setLogs([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('custom_tracker_logs')
      .select('*')
      .eq('profile_id', profileId)
      .gte('entry_date', start)
      .lte('entry_date', end)
      .order('entry_date')
      .order('created_at')
    setLogs((data ?? []) as CustomTrackerLog[])
    setLoading(false)
  }, [profileId, start, end])

  useEffect(() => { refetch() }, [refetch])

  return { logs, loading, refetch }
}
