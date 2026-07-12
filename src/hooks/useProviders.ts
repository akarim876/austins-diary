import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Provider } from '../types'

function cast(row: unknown): Provider { return row as Provider }

export function useProviders(profileId: string | null) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading]     = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { data } = await supabase
      .from('providers')
      .select('*')
      .eq('profile_id', profileId)
      .order('name', { ascending: true })
    setProviders((data ?? []).map(cast))
    setLoading(false)
  }, [profileId])

  useEffect(() => { refetch() }, [refetch])
  return { providers, loading, refetch }
}

export function useProvider(providerId: string | null) {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading]   = useState(false)

  const refetch = useCallback(async () => {
    if (!providerId) return
    setLoading(true)
    const { data } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .maybeSingle()
    setProvider(data ? cast(data) : null)
    setLoading(false)
  }, [providerId])

  useEffect(() => { refetch() }, [refetch])
  return { provider, loading, refetch }
}
