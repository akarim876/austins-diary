import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SleepLog } from '../types'

function cast(row: unknown): SleepLog {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any
  return {
    ...r,
    night_wakings_detail: Array.isArray(r.night_wakings_detail)
      ? r.night_wakings_detail
      : [],
    naps: Array.isArray(r.naps) ? r.naps : [],
  } as SleepLog
}

/** All sleep logs for a profile (for calendar). */
export function useSleepLogs(profileId: string | null) {
  const [logs, setLogs]       = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('log_date', { ascending: false })
    setLogs((data ?? []).map(cast))
    setLoading(false)
  }, [profileId])

  useEffect(() => { refetch() }, [refetch])
  return { logs, loading, refetch }
}

/** Sleep log for a specific date. */
export function useSleepLogForDate(profileId: string | null, logDate: string) {
  const [log, setLog]         = useState<SleepLog | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId || !logDate) return
    setLoading(true)
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('log_date', logDate)
      .maybeSingle()
    setLog(data ? cast(data) : null)
    setLoading(false)
  }, [profileId, logDate])

  useEffect(() => { refetch() }, [refetch])
  return { log, loading, refetch }
}
