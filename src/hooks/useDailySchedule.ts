import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  DailyScheduleEntry, DeviationReason, ScheduleDisplayItem,
  ScheduleItemStatus, ScheduleTemplateItem,
} from '../types'

export function useDailySchedule(profileId: string | null, date: string) {
  const [items, setItems]   = useState<ScheduleDisplayItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!profileId) { setLoading(false); return }
    setLoading(true)

    // Fetch template + today's entries in parallel
    const [templateRes, entriesRes] = await Promise.all([
      supabase
        .from('schedule_template_items')
        .select('*')
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('daily_schedule_entries')
        .select('*')
        .eq('profile_id', profileId)
        .eq('schedule_date', date),
    ])

    const templateItems = (templateRes.data ?? []) as ScheduleTemplateItem[]
    const entries       = (entriesRes.data  ?? []) as DailyScheduleEntry[]

    // Index saved entries by template_item_id for fast lookup
    const byTemplate = new Map<string, DailyScheduleEntry>()
    for (const e of entries) {
      if (e.template_item_id) byTemplate.set(e.template_item_id, e)
    }

    // Merge: one display item per template item
    const merged: ScheduleDisplayItem[] = templateItems.map(t => {
      const saved = byTemplate.get(t.id)
      return {
        entryId:          saved?.id ?? null,
        templateItemId:   t.id,
        label:            t.label,
        time_of_day:      t.time_of_day,
        sort_order:       t.sort_order,
        status:           (saved?.status ?? 'not_yet') as ScheduleItemStatus,
        deviation_reason: (saved?.deviation_reason ?? null) as DeviationReason | null,
        deviation_note:   saved?.deviation_note ?? null,
      }
    })

    setItems(merged)
    setLoading(false)
  }, [profileId, date])

  useEffect(() => { fetch() }, [fetch])

  async function updateItem(
    templateItemId: string,
    status: ScheduleItemStatus,
    deviation_reason: DeviationReason | null,
    deviation_note: string | null,
  ) {
    if (!profileId) return
    const { data: { user } } = await supabase.auth.getUser()

    // Find original template item for label/time (already in state)
    const existing = items.find(i => i.templateItemId === templateItemId)
    if (!existing) return

    await supabase.from('daily_schedule_entries').upsert(
      {
        profile_id:       profileId,
        schedule_date:    date,
        template_item_id: templateItemId,
        label:            existing.label,
        time_of_day:      existing.time_of_day,
        sort_order:       existing.sort_order,
        status,
        deviation_reason: deviation_reason ?? null,
        deviation_note:   deviation_note ?? null,
        author_id:        user?.id ?? null,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'profile_id,schedule_date,template_item_id' }
    )

    // Optimistic update
    setItems(prev => prev.map(i =>
      i.templateItemId === templateItemId
        ? { ...i, status, deviation_reason, deviation_note }
        : i
    ))
  }

  return { items, loading, refetch: fetch, updateItem }
}
