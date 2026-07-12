import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ScheduleTemplateItem } from '../types'

export function useScheduleTemplate(profileId: string | null) {
  const [items, setItems]   = useState<ScheduleTemplateItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!profileId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('schedule_template_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true })
    setItems((data ?? []) as ScheduleTemplateItem[])
    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  async function addItem(label: string, time_of_day: string | null) {
    if (!profileId) return
    const maxOrder = items.length > 0
      ? Math.max(...items.map(i => i.sort_order))
      : -1
    await supabase.from('schedule_template_items').insert({
      profile_id: profileId,
      label,
      time_of_day: time_of_day || null,
      sort_order: maxOrder + 1,
    })
    await fetch()
  }

  async function updateItem(id: string, patch: { label?: string; time_of_day?: string | null }) {
    await supabase
      .from('schedule_template_items')
      .update(patch)
      .eq('id', id)
    await fetch()
  }

  async function deleteItem(id: string) {
    await supabase.from('schedule_template_items').delete().eq('id', id)
    // Re-pack sort_order after deletion
    await fetch()
  }

  /**
   * Accepts the new desired order as an array of IDs, applies it optimistically,
   * then persists each item's sort_order to the database in one batch.
   */
  async function reorderItems(orderedIds: string[]) {
    // Optimistic update — reorder local state immediately so the UI feels instant
    const byId = Object.fromEntries(items.map(i => [i.id, i]))
    const reordered = orderedIds.map(id => byId[id]).filter(Boolean) as ScheduleTemplateItem[]
    setItems(reordered)

    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('schedule_template_items').update({ sort_order: idx }).eq('id', id)
      )
    )
  }

  return { items, loading, refetch: fetch, addItem, updateItem, deleteItem, reorderItems }
}
