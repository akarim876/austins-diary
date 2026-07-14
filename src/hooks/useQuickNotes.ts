import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { QuickNote } from '../types'

export function useQuickNotes(profileId: string | null) {
  const [notes, setNotes]     = useState<QuickNote[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!profileId) { setLoading(false); return }
    setLoading(true)

    const { data } = await supabase
      .from('quick_notes')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    setNotes((data ?? []) as QuickNote[])
    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  async function add(content: string, authorId: string): Promise<QuickNote | null> {
    if (!profileId) return null

    const { data, error } = await supabase
      .from('quick_notes')
      .insert({ profile_id: profileId, author_id: authorId, content })
      .select()
      .single()

    if (error || !data) return null

    const note = data as QuickNote
    setNotes(prev => [note, ...prev])
    return note
  }

  async function remove(id: string): Promise<void> {
    await supabase.from('quick_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return { notes, loading, add, remove, refetch: fetch }
}
