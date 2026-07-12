import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface HandoffNoteData {
  note: string
  updated_by: string | null
  updated_at: string
}

export function useHandoffNote(profileId: string | null) {
  const [data, setData]           = useState<HandoffNoteData | null>(null)
  const [updaterName, setUpdaterName] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  const fetch = useCallback(async () => {
    if (!profileId) { setLoading(false); return }
    setLoading(true)

    const { data: row } = await supabase
      .from('handoff_notes')
      .select('note, updated_by, updated_at')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (row) {
      setData(row as HandoffNoteData)
      // Look up the updater's display name from user_profiles
      if (row.updated_by) {
        const { data: up } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', row.updated_by)
          .maybeSingle()
        if (up) {
          setUpdaterName(`${up.first_name} ${up.last_name}`)
        } else {
          setUpdaterName(null)
        }
      } else {
        setUpdaterName(null)
      }
    } else {
      setData(null)
      setUpdaterName(null)
    }

    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  async function save(text: string): Promise<void> {
    if (!profileId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('handoff_notes')
      .upsert(
        {
          profile_id: profileId,
          note:       text,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )

    await fetch()
  }

  return { data, updaterName, loading, refetch: fetch, save }
}
