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

  async function moveItem(id: string, direction: 'up' | 'down') {
    const idx = items.findIndex(i => i.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return

    const a = items[idx]
    const b = items[swapIdx]

    await Promise.all([
      supabase.from('schedule_template_items').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('schedule_template_items').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetch()
  }

  return { items, loading, refetch: fetch, addItem, updateItem, deleteItem, moveItem }
}
